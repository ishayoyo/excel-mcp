/**
 * Smart Indexer - Creates fast lookup indexes for validation
 */

import { ValidationContext, DataIndexes, ColumnStats } from '../core/validation-result';
import { ValidationContextBuilder } from '../core/validation-context';

export class SmartIndexer {
  private contextBuilder = new ValidationContextBuilder();

  async buildIndexes(context: ValidationContext): Promise<DataIndexes> {
    const startTime = Date.now();

    const columnMaps = this.createColumnMaps(context);
    const keyIndexes = this.createKeyIndexes(context);
    const rangeStats = this.calculateRangeStats(context);
    const duplicateHashes = this.createDuplicateHashes(context);

    const indexes: DataIndexes = {
      columnMaps,
      keyIndexes,
      rangeStats,
      duplicateHashes
    };

    // console.log(`📊 Indexes built in ${Date.now() - startTime}ms`);

    return indexes;
  }

  private createColumnMaps(context: ValidationContext): Map<string, Map<string, any[]>> {
    const columnMaps = new Map<string, Map<string, any[]>>();

    // Index primary file columns
    for (let colIdx = 0; colIdx < context.primaryFile.headers.length; colIdx++) {
      const columnName = context.primaryFile.headers[colIdx];
      const columnData = context.primaryFile.data.slice(1).map(row => row[colIdx]);

      const valueMap = new Map<string, any[]>();
      columnData.forEach((value, rowIdx) => {
        const key = String(value || '').toLowerCase().trim();
        if (!valueMap.has(key)) {
          valueMap.set(key, []);
        }
        valueMap.get(key)!.push(rowIdx + 1); // +1 because we exclude header
      });

      columnMaps.set(`${context.primaryFile.filePath}:${columnName}`, valueMap);
    }

    // Index reference file columns
    for (const [refPath, refFile] of context.referenceFiles) {
      for (let colIdx = 0; colIdx < refFile.headers.length; colIdx++) {
        const columnName = refFile.headers[colIdx];
        const columnData = refFile.data.slice(1).map(row => row[colIdx]);

        const valueMap = new Map<string, any[]>();
        columnData.forEach((value, rowIdx) => {
          const key = String(value || '').toLowerCase().trim();
          if (!valueMap.has(key)) {
            valueMap.set(key, []);
          }
          valueMap.get(key)!.push(rowIdx + 1);
        });

        columnMaps.set(`${refPath}:${columnName}`, valueMap);
      }
    }

    return columnMaps;
  }

  private createKeyIndexes(context: ValidationContext): Map<string, Set<string>> {
    const keyIndexes = new Map<string, Set<string>>();

    // Create indexes for reference files (for foreign key validation)
    for (const [refPath, refFile] of context.referenceFiles) {
      for (let colIdx = 0; colIdx < refFile.headers.length; colIdx++) {
        const columnName = refFile.headers[colIdx];
        const columnData = refFile.data.slice(1).map(row => row[colIdx]);

        const keySet = new Set<string>();
        columnData.forEach(value => {
          if (value !== '' && value != null) {
            keySet.add(String(value).toLowerCase().trim());
          }
        });

        keyIndexes.set(`${refPath}:${columnName}`, keySet);
      }
    }

    return keyIndexes;
  }

  private calculateRangeStats(context: ValidationContext): Map<string, ColumnStats> {
    const rangeStats = new Map<string, ColumnStats>();

    // Calculate stats for primary file
    for (let colIdx = 0; colIdx < context.primaryFile.headers.length; colIdx++) {
      const columnName = context.primaryFile.headers[colIdx];
      const stats = this.contextBuilder.calculateColumnStats(context.primaryFile.data, colIdx);
      rangeStats.set(`${context.primaryFile.filePath}:${columnName}`, stats);
    }

    // Calculate stats for reference files
    for (const [refPath, refFile] of context.referenceFiles) {
      for (let colIdx = 0; colIdx < refFile.headers.length; colIdx++) {
        const columnName = refFile.headers[colIdx];
        const stats = this.contextBuilder.calculateColumnStats(refFile.data, colIdx);
        rangeStats.set(`${refPath}:${columnName}`, stats);
      }
    }

    return rangeStats;
  }

  private createDuplicateHashes(context: ValidationContext): Map<string, Set<string>> {
    const duplicateHashes = new Map<string, Set<string>>();

    // Create row hashes for duplicate detection
    const primaryHashes = new Set<string>();
    const duplicateRows = new Set<string>();

    for (let rowIdx = 1; rowIdx < context.primaryFile.data.length; rowIdx++) {
      const row = context.primaryFile.data[rowIdx];
      const rowHash = this.createRowHash(row);

      if (primaryHashes.has(rowHash)) {
        duplicateRows.add(rowHash);
      } else {
        primaryHashes.add(rowHash);
      }
    }

    duplicateHashes.set(context.primaryFile.filePath, duplicateRows);

    return duplicateHashes;
  }

  private createRowHash(row: any[]): string {
    // Create a hash from the row content (excluding empty cells)
    const content = row
      .filter(cell => cell !== '' && cell != null)
      .map(cell => String(cell).toLowerCase().trim())
      .join('|');

    return this.simpleHash(content);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  }
}