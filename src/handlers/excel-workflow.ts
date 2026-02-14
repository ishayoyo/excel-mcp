import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent, detectDataTypes, writeFileContent } from '../utils/file-utils';

export class ExcelWorkflowHandler {
  constructor() {
    // Initialize any needed dependencies
  }

  /**
   * Find and manage duplicate rows in Excel/CSV files
   */
  async findDuplicates(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, columns = [], action = 'report_only', keepFirst = true, sheet, outputPath } = args;

      if (!filePath) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Missing required parameter: filePath'
            }, null, 2)
          }]
        };
      }

      // Read the file
      const data = await readFileContent(filePath, sheet);

      if (data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'File is empty or could not be read'
            }, null, 2)
          }]
        };
      }

      const headers = data[0];
      const rows = data.slice(1);

      // Determine which columns to check for duplicates
      let checkColumns: number[] = [];
      if (columns.length === 0) {
        // Check all columns
        checkColumns = Array.from({length: headers.length}, (_, i) => i);
      } else {
        // Convert column names/indices to indices
        checkColumns = columns.map((col: any) => {
          if (typeof col === 'number') return col;
          const index = headers.indexOf(col);
          if (index === -1) throw new Error(`Column "${col}" not found`);
          return index;
        });
      }

      // Find duplicates
      const duplicateGroups = new Map<string, number[]>();
      const uniqueRows: any[][] = [];
      const duplicateIndices = new Set<number>();

      rows.forEach((row: any[], index: number) => {
        const key = checkColumns.map(colIndex => String(row[colIndex] || '')).join('|||');

        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key)!.push(index);
      });

      // Identify actual duplicates (groups with more than 1 row)
      const actualDuplicates = Array.from(duplicateGroups.entries())
        .filter(([_, indices]) => indices.length > 1);

      let resultData = data;
      let removedCount = 0;

      if (action === 'remove') {
        // Keep headers
        const cleanedData = [headers];

        for (const [_, indices] of duplicateGroups.entries()) {
          if (indices.length === 1) {
            // Not a duplicate, keep it
            cleanedData.push(rows[indices[0]]);
          } else {
            // Duplicate group - keep first or last based on keepFirst
            const keepIndex = keepFirst ? indices[0] : indices[indices.length - 1];
            cleanedData.push(rows[keepIndex]);
            removedCount += indices.length - 1;
          }
        }

        resultData = cleanedData;

        // Save the cleaned file back
        await writeFileContent(outputPath || filePath, resultData, sheet);
      }

      const result = {
        success: true,
        operation: 'find_duplicates',
        summary: {
          totalRows: rows.length,
          duplicateGroups: actualDuplicates.length,
          totalDuplicates: actualDuplicates.reduce((sum, [_, indices]) => sum + indices.length - 1, 0),
          removedRows: removedCount,
          resultRows: resultData.length - 1 // excluding header
        },
        duplicates: action === 'report_only' ? actualDuplicates.map(([key, indices]) => ({
          key: key.split('|||'),
          rowIndices: indices.map(i => i + 2), // +2 for header and 1-based indexing
          count: indices.length
        })) : undefined,
        action,
        keepFirst
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'find_duplicates'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Clean data with batch operations
   */
  async cleanData(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, operations = [], preview = false, sheet, outputPath } = args;

      if (!filePath) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Missing required parameter: filePath'
            }, null, 2)
          }]
        };
      }

      // Read the file
      const data = await readFileContent(filePath, sheet);

      if (data.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'File is empty or could not be read'
            }, null, 2)
          }]
        };
      }

      const headers = data[0];
      let workingData = data.map(row => [...row]); // Deep copy
      const changes: any[] = [];

      // Apply each cleaning operation
      for (const operation of operations) {
        switch (operation) {
          case 'trim_whitespace':
            workingData = this.trimWhitespace(workingData, changes);
            break;
          case 'remove_empty_rows':
            workingData = this.removeEmptyRows(workingData, changes);
            break;
          case 'standardize_phone_formats':
            workingData = this.standardizePhoneFormats(workingData, changes);
            break;
          case 'fix_dates':
            workingData = this.fixDates(workingData, changes);
            break;
          case 'standardize_names':
            workingData = this.standardizeNames(workingData, changes);
            break;
          case 'remove_special_chars':
            workingData = this.removeSpecialChars(workingData, changes);
            break;
          case 'fix_currency':
            workingData = this.fixCurrency(workingData, changes);
            break;
          default:
            throw new Error(`Unknown cleaning operation: ${operation}`);
        }
      }

      // Write back cleaned data unless in preview mode
      if (!preview) {
        await writeFileContent(outputPath || filePath, workingData, sheet);
      }

      const result = {
        success: true,
        operation: 'data_cleaner',
        preview,
        summary: {
          originalRows: data.length,
          cleanedRows: workingData.length,
          operationsApplied: operations,
          changesCount: changes.length
        },
        changes: changes.slice(0, 100), // Limit to first 100 changes for readability
        data: preview ? workingData.slice(0, 10) : undefined // Show first 10 rows in preview
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'data_cleaner'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * VLOOKUP helper with intelligent matching
   */
  async vlookupHelper(args: ToolArgs): Promise<ToolResponse> {
    try {
      const {
        sourceFile,
        lookupFile,
        lookupColumn,
        returnColumns = [],
        fuzzyMatch = false,
        handleErrors = true,
        sourceSheet,
        lookupSheet,
        outputPath
      } = args;

      if (!sourceFile || !lookupFile || !lookupColumn) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Missing required parameters: sourceFile, lookupFile, lookupColumn'
            }, null, 2)
          }]
        };
      }

      // Read both files
      const sourceData = await readFileContent(sourceFile, sourceSheet);
      const lookupData = await readFileContent(lookupFile, lookupSheet);

      if (sourceData.length === 0 || lookupData.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'One or both files are empty'
            }, null, 2)
          }]
        };
      }

      const sourceHeaders = sourceData[0];
      const lookupHeaders = lookupData[0];
      const lookupRows = lookupData.slice(1);

      // Find lookup column index
      let lookupColIndex = typeof lookupColumn === 'number' ? lookupColumn : lookupHeaders.indexOf(lookupColumn);
      if (lookupColIndex === -1) {
        throw new Error(`Lookup column "${lookupColumn}" not found`);
      }

      // Find return column indices
      let returnColIndices: number[] = [];
      if (returnColumns.length === 0) {
        // Return all columns except lookup column
        returnColIndices = Array.from({length: lookupHeaders.length}, (_, i) => i)
          .filter(i => i !== lookupColIndex);
      } else {
        returnColIndices = returnColumns.map((col: any) => {
          if (typeof col === 'number') return col;
          const index = lookupHeaders.indexOf(col);
          if (index === -1) throw new Error(`Return column "${col}" not found`);
          return index;
        });
      }

      // Create lookup map
      const lookupMap = new Map<string, any[]>();
      lookupRows.forEach((row: any[]) => {
        const key = String(row[lookupColIndex] || '').toLowerCase().trim();
        const values = returnColIndices.map((i: number) => row[i]);
        lookupMap.set(key, values);
      });

      // Find source lookup column index
      const sourceLookupColIndex = typeof lookupColumn === 'number' ? lookupColumn : sourceHeaders.indexOf(lookupColumn);
      if (sourceLookupColIndex === -1) {
        throw new Error(`Lookup column "${lookupColumn}" not found in source file`);
      }

      // Build merged result
      const returnColumnNames = returnColIndices.map((i: number) => lookupHeaders[i]);
      const mergedHeaders = [...sourceHeaders, ...returnColumnNames];
      const mergedData: any[][] = [mergedHeaders];

      let matchedCount = 0;
      let unmatchedCount = 0;

      const sourceRows = sourceData.slice(1);
      for (const row of sourceRows) {
        const sourceKey = String(row[sourceLookupColIndex] || '').toLowerCase().trim();
        let lookupValues: any[] | undefined;

        if (fuzzyMatch) {
          // Fuzzy: find first key that contains or is contained by the source key
          for (const [mapKey, mapValues] of lookupMap.entries()) {
            if (mapKey.includes(sourceKey) || sourceKey.includes(mapKey)) {
              lookupValues = mapValues;
              break;
            }
          }
        } else {
          lookupValues = lookupMap.get(sourceKey);
        }

        if (lookupValues) {
          mergedData.push([...row, ...lookupValues]);
          matchedCount++;
        } else {
          const fallback = handleErrors ? returnColIndices.map(() => '') : returnColIndices.map(() => '#N/A');
          mergedData.push([...row, ...fallback]);
          unmatchedCount++;
        }
      }

      // Write merged result if outputPath is provided
      if (outputPath) {
        await writeFileContent(outputPath, mergedData);
      }

      const result = {
        success: true,
        operation: 'vlookup_helper',
        summary: {
          sourceRows: sourceRows.length,
          lookupRows: lookupRows.length,
          lookupColumn: lookupHeaders[lookupColIndex],
          returnColumns: returnColumnNames,
          fuzzyMatch,
          handleErrors
        },
        matchedCount,
        unmatchedCount,
        outputPath: outputPath || null,
        preview: mergedData.slice(0, 6) // Header + first 5 rows
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'vlookup_helper'
          }, null, 2)
        }]
      };
    }
  }

  // Helper methods for data cleaning operations
  private trimWhitespace(data: any[][], changes: any[]): any[][] {
    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (typeof cell === 'string') {
          const trimmed = cell.trim();
          if (trimmed !== cell) {
            changes.push({
              operation: 'trim_whitespace',
              row: rowIndex,
              col: colIndex,
              before: cell,
              after: trimmed
            });
          }
          return trimmed;
        }
        return cell;
      })
    );
  }

  private removeEmptyRows(data: any[][], changes: any[]): any[][] {
    const result = data.filter((row, index) => {
      const isEmpty = row.every(cell => !cell || String(cell).trim() === '');
      if (isEmpty && index > 0) { // Don't remove header
        changes.push({
          operation: 'remove_empty_rows',
          row: index,
          action: 'removed'
        });
        return false;
      }
      return true;
    });
    return result;
  }

  private standardizePhoneFormats(data: any[][], changes: any[]): any[][] {
    const phoneRegex = /^[\d\s\-\(\)\.]{7,}$/;
    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (typeof cell === 'string' && phoneRegex.test(cell)) {
          const digits = cell.replace(/\D/g, '');
          if (digits.length === 10) {
            const formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
            if (formatted !== cell) {
              changes.push({
                operation: 'standardize_phone_formats',
                row: rowIndex,
                col: colIndex,
                before: cell,
                after: formatted
              });
            }
            return formatted;
          }
        }
        return cell;
      })
    );
  }

  private fixDates(data: any[][], changes: any[]): any[][] {
    const datePatterns: Array<{ regex: RegExp; parse: (m: RegExpMatchArray) => { y: string; m: string; d: string } | null }> = [
      // MM/DD/YYYY or MM-DD-YYYY
      { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, parse: (m) => ({ m: m[1], d: m[2], y: m[3] }) },
      // DD.MM.YYYY
      { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parse: (m) => ({ d: m[1], m: m[2], y: m[3] }) },
      // YYYY/MM/DD
      { regex: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, parse: (m) => ({ y: m[1], m: m[2], d: m[3] }) },
    ];

    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (rowIndex === 0 || typeof cell !== 'string') return cell;
        const trimmed = cell.trim();
        for (const pattern of datePatterns) {
          const match = trimmed.match(pattern.regex);
          if (match) {
            const parts = pattern.parse(match);
            if (!parts) continue;
            const month = parseInt(parts.m, 10);
            const day = parseInt(parts.d, 10);
            const year = parseInt(parts.y, 10);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const standardized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              if (standardized !== cell) {
                changes.push({
                  operation: 'fix_dates',
                  row: rowIndex,
                  col: colIndex,
                  before: cell,
                  after: standardized
                });
              }
              return standardized;
            }
          }
        }
        return cell;
      })
    );
  }

  private standardizeNames(data: any[][], changes: any[]): any[][] {
    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (typeof cell === 'string' && /^[a-zA-Z\s]+$/.test(cell)) {
          const standardized = cell.toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .trim();
          if (standardized !== cell) {
            changes.push({
              operation: 'standardize_names',
              row: rowIndex,
              col: colIndex,
              before: cell,
              after: standardized
            });
          }
          return standardized;
        }
        return cell;
      })
    );
  }

  private removeSpecialChars(data: any[][], changes: any[]): any[][] {
    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (typeof cell === 'string') {
          const cleaned = cell.replace(/[^\w\s\-\.@]/g, '');
          if (cleaned !== cell) {
            changes.push({
              operation: 'remove_special_chars',
              row: rowIndex,
              col: colIndex,
              before: cell,
              after: cleaned
            });
          }
          return cleaned;
        }
        return cell;
      })
    );
  }

  private fixCurrency(data: any[][], changes: any[]): any[][] {
    const currencyRegex = /[\$\£\€]?[\d,]+\.?\d*/;
    return data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (typeof cell === 'string' && currencyRegex.test(cell)) {
          const numbers = cell.replace(/[^\d\.]/g, '');
          if (numbers && !isNaN(parseFloat(numbers))) {
            const formatted = `$${parseFloat(numbers).toFixed(2)}`;
            if (formatted !== cell) {
              changes.push({
                operation: 'fix_currency',
                row: rowIndex,
                col: colIndex,
                before: cell,
                after: formatted
              });
            }
            return formatted;
          }
        }
        return cell;
      })
    );
  }
}