/**
 * Validation Context - Manages data and metadata for validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { FileValidationContext, ValidationContext, DetectedRelationship, ColumnStats } from './validation-result.js';

export class ValidationContextBuilder {

  async buildContext(
    primaryFilePath: string,
    referenceFilePaths: string[],
    sheet?: string
  ): Promise<ValidationContext> {

    // Load primary file
    const primaryFile = await this.loadFileContext(primaryFilePath, sheet);

    // Load reference files
    const referenceFiles = new Map<string, FileValidationContext>();
    for (const refPath of referenceFilePaths) {
      const refFile = await this.loadFileContext(refPath, sheet);
      referenceFiles.set(refPath, refFile);
    }

    // Auto-detect relationships
    const relationships = this.detectRelationships(primaryFile, referenceFiles);

    return {
      primaryFile,
      referenceFiles,
      relationships
    };
  }

  private async loadFileContext(filePath: string, sheet?: string): Promise<FileValidationContext> {
    const data = await this.readFileContent(filePath, sheet);

    if (data.length === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }

    const headers = data[0] || [];

    return {
      filePath,
      data,
      headers,
      rowCount: data.length - 1, // Exclude header
      columnCount: headers.length
    };
  }

  private async readFileContent(filePath: string, sheet?: string): Promise<any[][]> {
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

  private detectRelationships(
    primaryFile: FileValidationContext,
    referenceFiles: Map<string, FileValidationContext>
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    for (const [refPath, refFile] of referenceFiles) {
      const detectedRels = this.findColumnMatches(
        primaryFile.headers,
        refFile.headers,
        refPath
      );
      relationships.push(...detectedRels);
    }

    return relationships;
  }

  private findColumnMatches(
    primaryHeaders: string[],
    referenceHeaders: string[],
    referenceFile: string
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];

    for (const primaryCol of primaryHeaders) {
      for (const refCol of referenceHeaders) {
        const confidence = this.calculateColumnMatchConfidence(primaryCol, refCol);

        if (confidence > 0.7) { // High confidence threshold
          relationships.push({
            primaryColumn: primaryCol,
            referenceFile,
            referenceColumn: refCol,
            confidence,
            matchType: confidence > 0.95 ? 'exact' : 'fuzzy'
          });
        }
      }
    }

    return relationships;
  }

  private calculateColumnMatchConfidence(col1: string, col2: string): number {
    const c1 = col1.toLowerCase().trim();
    const c2 = col2.toLowerCase().trim();

    // Exact match
    if (c1 === c2) return 1.0;

    // Common patterns
    const patterns = [
      // ID patterns
      { pattern: /^(.+)_id$/, match: /^id$|^(.+)$/ },
      { pattern: /^id$/, match: /^(.+)_id$/ },

      // Code patterns
      { pattern: /^(.+)_code$/, match: /^code$|^(.+)$/ },
      { pattern: /^code$/, match: /^(.+)_code$/ },

      // Name patterns
      { pattern: /^(.+)_name$/, match: /^name$|^(.+)$/ },
      { pattern: /^name$/, match: /^(.+)_name$/ },
    ];

    for (const { pattern, match } of patterns) {
      const match1 = c1.match(pattern);
      const match2 = c2.match(match);

      if (match1 && match2) {
        // Check if the base parts match
        const base1 = match1[1] || match1[0];
        const base2 = match2[1] || match2[0];

        if (base1 === base2 || base1 === c2 || c1 === base2) {
          return 0.9;
        }
      }
    }

    // Fuzzy string matching
    const similarity = this.calculateStringSimilarity(c1, c2);
    return similarity > 0.8 ? similarity * 0.8 : 0; // Reduce confidence for fuzzy matches
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  calculateColumnStats(data: any[][], columnIndex: number): ColumnStats {
    const values = data.slice(1).map(row => row[columnIndex]).filter(val => val !== '' && val != null);

    if (values.length === 0) {
      return {
        min: 0, max: 0, mean: 0, median: 0, stdDev: 0,
        nullCount: data.length - 1,
        uniqueCount: 0,
        dataType: 'text'
      };
    }

    // Try to convert to numbers
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    const isNumeric = numericValues.length > values.length * 0.8;

    if (isNumeric && numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;

      return {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        mean: Math.round(mean * 100) / 100,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
        nullCount: data.length - 1 - values.length,
        uniqueCount: new Set(values).size,
        dataType: 'number'
      };
    }

    // Check for dates
    const dateValues = values.filter(v => !isNaN(Date.parse(v)));
    if (dateValues.length > values.length * 0.8) {
      return {
        min: 0, max: 0, mean: 0, median: 0, stdDev: 0,
        nullCount: data.length - 1 - values.length,
        uniqueCount: new Set(values).size,
        dataType: 'date'
      };
    }

    return {
      min: 0, max: 0, mean: 0, median: 0, stdDev: 0,
      nullCount: data.length - 1 - values.length,
      uniqueCount: new Set(values).size,
      dataType: 'text'
    };
  }
}