import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import * as csvStringify from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { CellAddress, FileInfo } from '../types/shared';

// File size threshold for streaming reads (200 KB)
const LARGE_FILE_THRESHOLD = 200 * 1024;

export function parseA1Notation(a1: string): CellAddress {
  const match = a1.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid A1 notation: ${a1}`);
  }

  const col = match[1].split('').reduce((acc, char) => {
    return acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
  }, 0) - 1;

  const row = parseInt(match[2]) - 1;

  return { row, col };
}

export interface FileReadResult {
  data: any[][];
  warnings?: string[];
}

export async function readFileContent(filePath: string, sheet?: string): Promise<any[][]> {
  const result = await readFileContentWithWarnings(filePath, sheet);
  return result.data;
}

export async function readFileContentWithWarnings(filePath: string, sheet?: string): Promise<FileReadResult> {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);
  const warnings: string[] = [];

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  if (ext === '.csv') {
    const content = await fs.readFile(absolutePath, 'utf-8');

    // Check for binary content that might cause issues
    if (content.includes('\u0000') || content.includes('\uFFFD')) {
      throw new Error('File appears to contain binary data and cannot be read as CSV');
    }

    try {
      const parsed = csv.parse(content, {
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      // Additional validation - ensure we have some valid data
      if (parsed.length === 0) {
        throw new Error('empty file: No valid CSV data found in file');
      }

      // Check for malformed CSV issues and add warnings
      if (parsed.length > 1) {
        const expectedColumns = parsed[0].length;
        let inconsistentRows = 0;

        for (let i = 1; i < parsed.length; i++) {
          if (parsed[i].length !== expectedColumns) {
            inconsistentRows++;
          }
        }

        if (inconsistentRows > 0) {
          warnings.push(`CSV file has ${inconsistentRows} rows with inconsistent column count`);
        }
      }

      // Check for potential data quality issues
      const emptyRows = parsed.filter((row: any[]) => row.every((cell: any) => cell === '')).length;
      if (emptyRows > 0) {
        warnings.push(`Found ${emptyRows} completely empty rows`);
      }

      return { data: parsed, warnings: warnings.length > 0 ? warnings : undefined };
    } catch (parseError) {
      throw new Error(`Failed to parse CSV file: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }
  } else if (ext === '.xlsx' || ext === '.xls') {
    const stats = await fs.stat(absolutePath);
    const isLargeFile = stats.size > LARGE_FILE_THRESHOLD;

    if (isLargeFile) {
      // Use streaming reader for large files to avoid memory issues
      return readExcelStreaming(absolutePath, sheet, warnings);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);
    const sheetName = sheet || workbook.worksheets[0]?.name;
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }

    const data: any[][] = [];
    const colCount = worksheet.columnCount;
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = new Array(colCount).fill('');
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        rowData[colNumber - 1] = cell.value || '';
      });
      data.push(rowData);
    });

    return { data, warnings: warnings.length > 0 ? warnings : undefined };
  } else {
    throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
  }
}

async function readExcelStreaming(absolutePath: string, sheet?: string, warnings: string[] = []): Promise<FileReadResult> {
  const data: any[][] = [];
  let targetSheet = sheet || null;
  let sheetFound = false;
  let maxCol = 0;

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(absolutePath, {
    entries: 'emit',
    sharedStrings: 'cache',
    worksheets: 'emit',
  });

  for await (const worksheetReader of workbookReader) {
    const sheetName = (worksheetReader as any).name;

    if (!targetSheet) {
      targetSheet = sheetName;
    }

    if (sheetName !== targetSheet) {
      continue;
    }

    sheetFound = true;

    for await (const row of worksheetReader) {
      const rowData: any[] = [];
      const values = row.values;

      if (Array.isArray(values)) {
        for (let i = 1; i < values.length; i++) {
          const val = values[i];
          rowData[i - 1] = val != null ? val : '';
        }
        if (values.length - 1 > maxCol) {
          maxCol = values.length - 1;
        }
      }

      data.push(rowData);
    }
  }

  if (!sheetFound) {
    throw new Error(`Sheet "${targetSheet}" not found in workbook`);
  }

  // Normalize row lengths so all rows have the same number of columns
  for (let i = 0; i < data.length; i++) {
    while (data[i].length < maxCol) {
      data[i].push('');
    }
  }

  warnings.push(`Large file read using streaming mode for stability`);
  return { data, warnings: warnings.length > 0 ? warnings : undefined };
}

async function getExcelInfoStreaming(absolutePath: string, sheet?: string): Promise<{ totalRows: number; totalColumns: number; sheets: string[] }> {
  const sheets: string[] = [];
  let targetSheet = sheet || null;
  let totalRows = 0;
  let totalColumns = 0;

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(absolutePath, {
    entries: 'emit',
    sharedStrings: 'cache',
    worksheets: 'emit',
  });

  for await (const worksheetReader of workbookReader) {
    const sheetName = (worksheetReader as any).name;
    sheets.push(sheetName);

    if (!targetSheet) {
      targetSheet = sheetName;
    }

    if (sheetName !== targetSheet) {
      // Still need to consume the iterator to move to next sheet
      for await (const _row of worksheetReader) { /* skip */ }
      continue;
    }

    for await (const row of worksheetReader) {
      totalRows++;
      const values = row.values;
      if (Array.isArray(values) && values.length - 1 > totalColumns) {
        totalColumns = values.length - 1;
      }
    }
  }

  return { totalRows, totalColumns, sheets };
}

export function detectDataTypes(data: any[][]): Record<string, 'number' | 'text' | 'date' | 'formula'> {
  if (data.length < 2) return {};

  const headers = data[0];
  const types: Record<string, 'number' | 'text' | 'date' | 'formula'> = {};

  for (let col = 0; col < headers.length; col++) {
    const columnData = data.slice(1).map(row => row[col]).filter(val => val != null && val !== '');

    if (columnData.length === 0) {
      types[headers[col]] = 'text';
      continue;
    }

    // Check if all values are numbers
    const numericCount = columnData.filter(val => !isNaN(Number(val))).length;
    const dateCount = columnData.filter(val => !isNaN(Date.parse(val))).length;

    if (numericCount === columnData.length) {
      types[headers[col]] = 'number';
    } else if (dateCount === columnData.length) {
      types[headers[col]] = 'date';
    } else {
      types[headers[col]] = 'text';
    }
  }

  return types;
}

// Chunked reading utilities
export async function getFileInfo(filePath: string, sheet?: string): Promise<FileInfo> {
  const absolutePath = path.resolve(filePath);
  const stats = await fs.stat(absolutePath);
  const ext = path.extname(filePath).toLowerCase();

  // Get basic file info
  let totalRows = 0;
  let totalColumns = 0;
  let sheets: string[] = [];

  if (ext === '.csv') {
    // For CSV, we need to read to count rows (but efficiently)
    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    totalRows = lines.length;

    // Estimate columns from first line
    if (lines.length > 0) {
      const firstLine = csv.parse(lines[0])[0];
      totalColumns = firstLine.length;
    }
  } else if (ext === '.xlsx' || ext === '.xls') {
    const isLargeFile = stats.size > LARGE_FILE_THRESHOLD;

    if (isLargeFile) {
      // Use streaming to get metadata without loading entire file into memory
      const info = await getExcelInfoStreaming(absolutePath, sheet);
      totalRows = info.totalRows;
      totalColumns = info.totalColumns;
      sheets = info.sheets;
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(absolutePath);

      sheets = workbook.worksheets.map(ws => ws.name);
      const worksheet = workbook.getWorksheet(sheet || sheets[0]);

      if (worksheet) {
        totalRows = worksheet.rowCount;
        totalColumns = worksheet.columnCount;
      }
    }
  }

  // Estimate token count (rough approximation)
  const avgCellLength = 10; // characters
  const estimatedTokens = Math.ceil((totalRows * totalColumns * avgCellLength) / 4); // ~4 chars per token

  // Calculate recommended chunk size (target ~8000 tokens per chunk)
  const targetTokens = 8000;
  const recommendedChunkSize = Math.max(100, Math.floor(targetTokens / (totalColumns * avgCellLength / 4)));

  return {
    filePath: absolutePath,
    fileSize: stats.size,
    totalRows,
    totalColumns,
    estimatedTokens,
    recommendedChunkSize: Math.min(recommendedChunkSize, 5000), // Cap at 5000 rows
    sheets: sheets.length > 0 ? sheets : undefined
  };
}

export function calculateOptimalChunkSize(totalRows: number, totalColumns: number, targetTokens: number = 8000): number {
  const avgCellLength = 10;
  const tokensPerRow = Math.ceil((totalColumns * avgCellLength) / 4);
  const optimalRows = Math.floor(targetTokens / tokensPerRow);

  return Math.max(100, Math.min(optimalRows, 5000)); // Between 100 and 5000 rows
}

export function validateChunkBoundaries(data: any[][], offset: number, limit: number): { validOffset: number; validLimit: number } {
  const totalRows = data.length;

  // Ensure offset is within bounds
  const validOffset = Math.max(0, Math.min(offset, totalRows - 1));

  // Ensure limit doesn't exceed remaining data
  const remainingRows = totalRows - validOffset;
  const validLimit = Math.min(limit, remainingRows);

  return { validOffset, validLimit };
}

/**
 * Convert a 0-based column index to an Excel-style column letter (A, B, ..., Z, AA, AB, ...).
 */
export function columnIndexToLetter(colIndex: number): string {
  let result = '';
  let index = colIndex;

  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }

  return result;
}

/**
 * Write data to a CSV or Excel file. Mirrors readFileContent.
 * @param filePath - Path to the output file (.csv, .xlsx, or .xls)
 * @param data - 2D array of data (including headers as the first row)
 * @param sheet - Sheet name for Excel files (defaults to "Sheet1")
 */
export async function writeFileContent(filePath: string, data: any[][], sheet?: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);

  if (ext === '.csv') {
    const csvContent = csvStringify.stringify(data);
    await fs.writeFile(absolutePath, csvContent, 'utf-8');
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheet || 'Sheet1');
    data.forEach((row: any[]) => {
      worksheet.addRow(row);
    });
    await workbook.xlsx.writeFile(absolutePath);
  } else {
    throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
  }
}