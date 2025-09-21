import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { CellAddress } from '../types/shared.js';

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

export async function readFileContent(filePath: string, sheet?: string): Promise<any[][]> {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  if (ext === '.csv') {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return csv.parse(content, {
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = sheet || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
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