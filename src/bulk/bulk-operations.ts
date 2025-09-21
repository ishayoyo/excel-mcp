/**
 * Bulk Operations Engine
 * High-performance parallel processing for multiple files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export interface BulkAggregateArgs {
  filePaths: string[];
  column: string;
  operation: 'sum' | 'average' | 'count' | 'min' | 'max';
  consolidate?: boolean;
  sheet?: string;
  filters?: BulkFilter[];
}

export interface BulkFilter {
  column: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
  value: string | number;
}

export interface BulkResult {
  operation: string;
  column: string;
  consolidatedResult?: number;
  fileResults?: Array<{
    filePath: string;
    result: number;
    rowsProcessed: number;
    error?: string;
  }>;
  totalFilesProcessed: number;
  totalRowsProcessed: number;
  processingTimeMs: number;
  errors: string[];
}

export interface BulkFilterArgs {
  filePaths: string[];
  filters: BulkFilter[];
  outputMode: 'count' | 'export' | 'summary';
  outputPath?: string;
  sheet?: string;
}

export class BulkOperations {
  private maxConcurrency = 10; // Limit concurrent file operations

  async aggregateMultiFiles(args: BulkAggregateArgs): Promise<BulkResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const fileResults: BulkResult['fileResults'] = [];

    // Process files in batches to avoid overwhelming the system
    const batches = this.createBatches(args.filePaths, this.maxConcurrency);

    for (const batch of batches) {
      const batchPromises = batch.map(async (filePath) => {
        try {
          const data = await this.readFileContent(filePath, args.sheet);

          if (data.length <= 1) {
            throw new Error('No data rows found');
          }

          // Apply filters if specified
          let filteredData = data;
          if (args.filters && args.filters.length > 0) {
            filteredData = this.applyFilters(data, args.filters);
          }

          const result = await this.performAggregation(filteredData, args.column, args.operation);

          return {
            filePath,
            result: result.value,
            rowsProcessed: result.rowsProcessed,
            error: undefined
          };
        } catch (error) {
          const errorMsg = `${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);

          return {
            filePath,
            result: 0,
            rowsProcessed: 0,
            error: errorMsg
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      fileResults.push(...batchResults);
    }

    // Calculate consolidated result if requested
    let consolidatedResult: number | undefined;
    const validResults = fileResults.filter(r => !r.error);

    if (args.consolidate && validResults.length > 0) {
      consolidatedResult = this.consolidateResults(validResults, args.operation);
    }

    const totalRowsProcessed = fileResults.reduce((sum, r) => sum + r.rowsProcessed, 0);
    const processingTimeMs = Date.now() - startTime;

    return {
      operation: args.operation,
      column: args.column,
      consolidatedResult,
      fileResults: args.consolidate ? undefined : fileResults,
      totalFilesProcessed: validResults.length,
      totalRowsProcessed,
      processingTimeMs,
      errors
    };
  }

  async filterMultiFiles(args: BulkFilterArgs): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    const results: any[] = [];

    const batches = this.createBatches(args.filePaths, this.maxConcurrency);

    for (const batch of batches) {
      const batchPromises = batch.map(async (filePath) => {
        try {
          const data = await this.readFileContent(filePath, args.sheet);

          if (data.length <= 1) {
            return { filePath, matchingRows: 0, error: 'No data rows found' };
          }

          const filteredData = this.applyFilters(data, args.filters);

          return {
            filePath,
            matchingRows: filteredData.length - 1, // Exclude header
            data: args.outputMode === 'export' ? filteredData : undefined
          };
        } catch (error) {
          const errorMsg = `${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);

          return {
            filePath,
            matchingRows: 0,
            error: errorMsg
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const processingTimeMs = Date.now() - startTime;
    const totalMatchingRows = results.reduce((sum, r) => sum + (r.matchingRows || 0), 0);

    // Handle export mode
    if (args.outputMode === 'export' && args.outputPath) {
      await this.exportFilteredResults(results, args.outputPath);
    }

    return {
      operation: 'bulk_filter',
      filters: args.filters,
      outputMode: args.outputMode,
      totalFilesProcessed: results.filter(r => !r.error).length,
      totalMatchingRows,
      processingTimeMs,
      results: args.outputMode === 'summary' ? results.map(r => ({
        filePath: r.filePath,
        matchingRows: r.matchingRows,
        error: r.error
      })) : results,
      errors
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

  private async performAggregation(
    data: any[][],
    column: string,
    operation: 'sum' | 'average' | 'count' | 'min' | 'max'
  ): Promise<{ value: number; rowsProcessed: number }> {
    if (data.length <= 1) {
      throw new Error('No data rows to process');
    }

    const colIndex = isNaN(Number(column))
      ? data[0].indexOf(column)
      : Number(column);

    if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
      throw new Error(`Column "${column}" not found`);
    }

    const values = [];
    for (let i = 1; i < data.length; i++) {
      const val = Number(data[i][colIndex]);
      if (!isNaN(val)) {
        values.push(val);
      }
    }

    if (values.length === 0) {
      throw new Error('No numeric values found in column');
    }

    let result: number;
    switch (operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'average':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'count':
        result = values.length;
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      value: Math.round(result * 10000) / 10000, // Round to 4 decimal places
      rowsProcessed: data.length - 1
    };
  }

  private applyFilters(data: any[][], filters: BulkFilter[]): any[][] {
    if (!filters || filters.length === 0) {
      return data;
    }

    const headers = data[0];
    const filteredRows = [headers];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let passesAllFilters = true;

      for (const filter of filters) {
        const colIndex = isNaN(Number(filter.column))
          ? headers.indexOf(filter.column)
          : Number(filter.column);

        if (colIndex === -1) {
          continue; // Skip invalid column
        }

        const cellValue = String(row[colIndex] || '');
        const filterValue = String(filter.value);

        let passes = false;
        switch (filter.condition) {
          case 'equals':
            passes = cellValue === filterValue;
            break;
          case 'not_equals':
            passes = cellValue !== filterValue;
            break;
          case 'contains':
            passes = cellValue.toLowerCase().includes(filterValue.toLowerCase());
            break;
          case 'greater_than':
            passes = Number(cellValue) > Number(filterValue);
            break;
          case 'less_than':
            passes = Number(cellValue) < Number(filterValue);
            break;
        }

        if (!passes) {
          passesAllFilters = false;
          break;
        }
      }

      if (passesAllFilters) {
        filteredRows.push(row);
      }
    }

    return filteredRows;
  }

  private consolidateResults(
    fileResults: Array<{ result: number; rowsProcessed: number }>,
    operation: 'sum' | 'average' | 'count' | 'min' | 'max'
  ): number {
    const values = fileResults.map(r => r.result);

    switch (operation) {
      case 'sum':
      case 'count':
        return values.reduce((a, b) => a + b, 0);
      case 'average':
        const totalRows = fileResults.reduce((sum, r) => sum + r.rowsProcessed, 0);
        const weightedSum = fileResults.reduce((sum, r) => sum + (r.result * r.rowsProcessed), 0);
        return totalRows > 0 ? weightedSum / totalRows : 0;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return 0;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async exportFilteredResults(results: any[], outputPath: string): Promise<void> {
    // Combine all filtered data
    const allData: any[][] = [];
    let headers: any[] = [];

    for (const result of results) {
      if (result.data && result.data.length > 0) {
        if (headers.length === 0) {
          headers = result.data[0];
          allData.push(headers);
        }

        // Add all data rows (skip header for subsequent files)
        allData.push(...result.data.slice(1));
      }
    }

    // Write consolidated results
    const ext = path.extname(outputPath).toLowerCase();

    if (ext === '.csv') {
      const csvStringify = await import('csv-stringify/sync');
      const csvContent = csvStringify.stringify(allData);
      await fs.writeFile(outputPath, csvContent, 'utf-8');
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(allData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered_Results');
      XLSX.writeFile(workbook, outputPath);
    } else {
      throw new Error('Unsupported output format. Use .csv, .xlsx, or .xls');
    }
  }
}