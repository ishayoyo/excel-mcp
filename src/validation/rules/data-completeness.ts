/**
 * Data Completeness Validation Rule
 * Checks for missing or empty required fields
 */

import { BaseValidationRule } from './base-rule.js';
import { ValidationContext, ValidationIssue, DataIndexes } from '../core/validation-result.js';

export interface DataCompletenessConfig {
  requiredColumns?: string[];
  allowEmpty?: boolean;
  minCompleteness?: number; // Percentage (0-100)
  checkAllColumns?: boolean;
}

export class DataCompletenessRule extends BaseValidationRule {
  name = 'data_completeness';
  severity: 'critical' | 'warning' | 'info' = 'warning';
  description = 'Validates that required fields are not empty';

  constructor(private config: DataCompletenessConfig = {}) {
    super();
    this.config = {
      allowEmpty: false,
      minCompleteness: 95, // 95% completeness required
      checkAllColumns: false,
      ...config
    };
  }

  async validate(context: ValidationContext, indexes: DataIndexes): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Determine which columns to check
    const columnsToCheck = this.getColumnsToCheck(context);

    for (const columnName of columnsToCheck) {
      const columnIssues = await this.validateColumn(columnName, context, indexes);
      issues.push(...columnIssues);
    }

    return issues;
  }

  private getColumnsToCheck(context: ValidationContext): string[] {
    if (this.config.requiredColumns && this.config.requiredColumns.length > 0) {
      return this.config.requiredColumns;
    }

    if (this.config.checkAllColumns) {
      return context.primaryFile.headers;
    }

    // Auto-detect important columns (those that look like required fields)
    const importantPatterns = [
      /^id$/i,
      /^.*_id$/i,
      /^name$/i,
      /^.*_name$/i,
      /^code$/i,
      /^.*_code$/i,
      /^email$/i,
      /^phone$/i,
      /^amount$/i,
      /^price$/i,
      /^revenue$/i,
      /^total$/i,
      /^status$/i,
      /^date$/i,
      /^.*_date$/i
    ];

    return context.primaryFile.headers.filter(header =>
      importantPatterns.some(pattern => pattern.test(header))
    );
  }

  private async validateColumn(
    columnName: string,
    context: ValidationContext,
    indexes: DataIndexes
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    const columnIndex = this.findColumnIndex(context.primaryFile.headers, columnName);
    if (columnIndex === -1) {
      issues.push(this.createIssue(
        `Column "${columnName}" not found`,
        {
          file: context.primaryFile.filePath,
          row: 1,
          column: columnName
        },
        `Check column name spelling. Available columns: ${context.primaryFile.headers.join(', ')}`
      ));
      return issues;
    }

    // Count empty/null values
    const emptyRows: number[] = [];
    const totalRows = context.primaryFile.data.length - 1; // Exclude header

    for (let rowIdx = 1; rowIdx < context.primaryFile.data.length; rowIdx++) {
      const value = context.primaryFile.data[rowIdx][columnIndex];

      if (this.isEmpty(value)) {
        emptyRows.push(rowIdx + 1); // +1 for 1-based row numbers
      }
    }

    // Calculate completeness percentage
    const completeness = totalRows > 0 ? ((totalRows - emptyRows.length) / totalRows) * 100 : 100;

    // Check if completeness meets threshold
    if (completeness < this.config.minCompleteness!) {
      const severity = completeness < 50 ? 'critical' : 'warning';

      issues.push({
        ...this.createIssue(
          `Column "${columnName}" is only ${completeness.toFixed(1)}% complete (${emptyRows.length}/${totalRows} empty)`,
          {
            file: context.primaryFile.filePath,
            row: emptyRows[0] || 1,
            column: columnName
          },
          emptyRows.length > 10
            ? `Fill missing values in ${emptyRows.length} rows. Consider data cleaning or validation rules.`
            : `Fill missing values in rows: ${emptyRows.slice(0, 10).join(', ')}`,
          emptyRows.slice(0, 100), // Limit to 100 affected rows
          {
            emptyCount: emptyRows.length,
            totalRows,
            completenessPercent: completeness,
            threshold: this.config.minCompleteness
          }
        ),
        severity
      });
    } else if (emptyRows.length > 0 && emptyRows.length <= 5) {
      // Minor completeness issue - just a few missing values
      issues.push(this.createIssue(
        `Column "${columnName}" has ${emptyRows.length} empty values`,
        {
          file: context.primaryFile.filePath,
          row: emptyRows[0],
          column: columnName
        },
        `Fill missing values in rows: ${emptyRows.join(', ')}`,
        emptyRows,
        {
          emptyCount: emptyRows.length,
          totalRows,
          completenessPercent: completeness
        }
      ));
    }

    return issues;
  }

  private isEmpty(value: any): boolean {
    return value === null ||
           value === undefined ||
           value === '' ||
           (typeof value === 'string' && value.trim() === '') ||
           value === 'NULL' ||
           value === 'null' ||
           value === 'N/A' ||
           value === 'n/a';
  }
}