/**
 * Value Range Validation Rule
 * Checks for values outside expected statistical ranges (anomaly detection)
 */

import { BaseValidationRule } from './base-rule';
import { ValidationContext, ValidationIssue, DataIndexes, ColumnStats } from '../core/validation-result';

export interface ValueRangeConfig {
  columns?: string[];
  autoDetect?: boolean;
  outlierMethod?: 'iqr' | 'zscore' | 'fixed';
  outlierThreshold?: number;
  fixedRanges?: Record<string, { min?: number; max?: number }>;
  tolerance?: number;
}

export class ValueRangeRule extends BaseValidationRule {
  name = 'value_ranges';
  severity: 'critical' | 'warning' | 'info' = 'warning';
  description = 'Validates that numeric values are within expected ranges';

  constructor(private config: ValueRangeConfig = {}) {
    super();
    this.config = {
      autoDetect: true,
      outlierMethod: 'iqr',
      outlierThreshold: 1.5, // IQR multiplier
      tolerance: 0.01,
      ...config
    };
  }

  async validate(context: ValidationContext, indexes: DataIndexes): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get numeric columns to check
    const columnsToCheck = this.getNumericColumns(context, indexes);

    for (const columnName of columnsToCheck) {
      const columnIssues = await this.validateColumnRange(columnName, context, indexes);
      issues.push(...columnIssues);
    }

    return issues;
  }

  private getNumericColumns(context: ValidationContext, indexes: DataIndexes): string[] {
    if (this.config.columns && this.config.columns.length > 0) {
      return this.config.columns;
    }

    // Auto-detect numeric columns
    const numericColumns: string[] = [];

    for (const columnName of context.primaryFile.headers) {
      const statsKey = `${context.primaryFile.filePath}:${columnName}`;
      const stats = indexes.rangeStats.get(statsKey);

      if (stats && stats.dataType === 'number') {
        numericColumns.push(columnName);
      }
    }

    return numericColumns;
  }

  private async validateColumnRange(
    columnName: string,
    context: ValidationContext,
    indexes: DataIndexes
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    const columnIndex = this.findColumnIndex(context.primaryFile.headers, columnName);
    if (columnIndex === -1) return issues;

    const statsKey = `${context.primaryFile.filePath}:${columnName}`;
    const stats = indexes.rangeStats.get(statsKey);

    if (!stats || stats.dataType !== 'number') return issues;

    // Get range boundaries
    const { lowerBound, upperBound } = this.calculateBounds(columnName, stats);

    // Find outlier values
    const outlierRows: number[] = [];
    const outlierValues: number[] = [];

    for (let rowIdx = 1; rowIdx < context.primaryFile.data.length; rowIdx++) {
      const value = Number(context.primaryFile.data[rowIdx][columnIndex]);

      if (!isNaN(value)) {
        if (value < lowerBound || value > upperBound) {
          outlierRows.push(rowIdx + 1); // +1 for 1-based row numbers
          outlierValues.push(value);
        }
      }
    }

    // Create issues for outliers
    if (outlierRows.length > 0) {
      const severity = this.determineSeverity(outlierValues, stats);

      // Group outliers by type
      const tooLow = outlierValues.filter(v => v < lowerBound);
      const tooHigh = outlierValues.filter(v => v > upperBound);

      let message = `Column "${columnName}" has ${outlierRows.length} potential outliers`;
      let suggestion = '';

      if (tooLow.length > 0 && tooHigh.length > 0) {
        message += ` (${tooLow.length} below ${lowerBound.toFixed(2)}, ${tooHigh.length} above ${upperBound.toFixed(2)})`;
        suggestion = `Review values outside normal range [${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}]. Check for data entry errors or exceptional cases.`;
      } else if (tooLow.length > 0) {
        message += ` below expected minimum (${lowerBound.toFixed(2)})`;
        suggestion = `Values below ${lowerBound.toFixed(2)} may indicate data entry errors. Check: ${tooLow.slice(0, 3).join(', ')}`;
      } else {
        message += ` above expected maximum (${upperBound.toFixed(2)})`;
        suggestion = `Values above ${upperBound.toFixed(2)} may indicate exceptional cases or errors. Check: ${tooHigh.slice(0, 3).join(', ')}`;
      }

      issues.push({
        ...this.createIssue(
          message,
          {
            file: context.primaryFile.filePath,
            row: outlierRows[0],
            column: columnName
          },
          suggestion,
          outlierRows.slice(0, 50), // Limit to 50 affected rows
          {
            outlierCount: outlierRows.length,
            expectedRange: { min: lowerBound, max: upperBound },
            actualRange: { min: Math.min(...outlierValues), max: Math.max(...outlierValues) },
            statistics: {
              mean: stats.mean,
              median: stats.median,
              stdDev: stats.stdDev,
              dataType: stats.dataType
            },
            method: this.config.outlierMethod,
            threshold: this.config.outlierThreshold
          }
        ),
        severity
      });
    }

    return issues;
  }

  private calculateBounds(columnName: string, stats: ColumnStats): { lowerBound: number; upperBound: number } {
    // Check for fixed ranges first
    if (this.config.fixedRanges && this.config.fixedRanges[columnName]) {
      const fixedRange = this.config.fixedRanges[columnName];
      return {
        lowerBound: fixedRange.min ?? -Infinity,
        upperBound: fixedRange.max ?? Infinity
      };
    }

    // Apply outlier detection method
    switch (this.config.outlierMethod) {
      case 'zscore':
        return this.calculateZScoreBounds(stats);
      case 'iqr':
        return this.calculateIQRBounds(stats);
      case 'fixed':
      default:
        return { lowerBound: stats.min, upperBound: stats.max };
    }
  }

  private calculateIQRBounds(stats: ColumnStats): { lowerBound: number; upperBound: number } {
    // IQR method: Q1 - 1.5*IQR, Q3 + 1.5*IQR
    const q1 = stats.median - (stats.stdDev * 0.6745); // Approximate Q1
    const q3 = stats.median + (stats.stdDev * 0.6745); // Approximate Q3
    const iqr = q3 - q1;

    const multiplier = this.config.outlierThreshold || 1.5;

    return {
      lowerBound: q1 - (multiplier * iqr),
      upperBound: q3 + (multiplier * iqr)
    };
  }

  private calculateZScoreBounds(stats: ColumnStats): { lowerBound: number; upperBound: number } {
    // Z-score method: mean ± threshold * stdDev
    const threshold = this.config.outlierThreshold || 2.5;

    return {
      lowerBound: stats.mean - (threshold * stats.stdDev),
      upperBound: stats.mean + (threshold * stats.stdDev)
    };
  }

  private determineSeverity(outlierValues: number[], stats: ColumnStats): 'critical' | 'warning' | 'info' {
    // Determine severity based on how extreme the outliers are
    const extremeOutliers = outlierValues.filter(value => {
      const zScore = Math.abs((value - stats.mean) / stats.stdDev);
      return zScore > 3; // Very extreme outliers
    });

    if (extremeOutliers.length > 0) {
      return 'critical';
    }

    // If more than 10% of values are outliers, it might indicate a systematic issue
    const outlierRatio = outlierValues.length / (stats.uniqueCount || 1);
    if (outlierRatio > 0.1) {
      return 'warning';
    }

    return 'info';
  }
}