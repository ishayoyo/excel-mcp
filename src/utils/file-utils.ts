import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { CellAddress, FileInfo } from '../types/shared';

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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);
    const sheetName = sheet || workbook.worksheets[0]?.name;
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }

    const data: any[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = [];
      row.eachCell((cell, colNumber) => {
        rowData[colNumber - 1] = cell.value || '';
      });
      data.push(rowData);
    });

    return { data, warnings: warnings.length > 0 ? warnings : undefined };
  } else {
    throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
  }
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);

    sheets = workbook.worksheets.map(ws => ws.name);
    const worksheet = workbook.getWorksheet(sheet || sheets[0]);

    if (worksheet) {
      totalRows = worksheet.rowCount;
      totalColumns = worksheet.columnCount;
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