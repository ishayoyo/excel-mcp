/**
 * Base Validation Rule - Abstract class for all validation rules
 */

import { ValidationContext, ValidationIssue, DataIndexes } from '../core/validation-result.js';

export abstract class BaseValidationRule {
  abstract name: string;
  abstract severity: 'critical' | 'warning' | 'info';
  abstract description: string;

  abstract validate(
    context: ValidationContext,
    indexes: DataIndexes
  ): Promise<ValidationIssue[]>;

  protected createIssue(
    message: string,
    location: { file: string; row: number; column: string },
    suggestion: string,
    affectedRows: number[] = [],
    metadata?: Record<string, any>
  ): ValidationIssue {
    return {
      rule: this.name,
      severity: this.severity,
      message,
      location,
      suggestion,
      affectedRows,
      metadata
    };
  }

  protected findColumnIndex(headers: string[], columnName: string): number {
    // Try exact match first
    let index = headers.indexOf(columnName);
    if (index !== -1) return index;

    // Try case-insensitive match
    const lowerColumnName = columnName.toLowerCase();
    index = headers.findIndex(h => h.toLowerCase() === lowerColumnName);
    if (index !== -1) return index;

    // Try fuzzy match (for typos)
    for (let i = 0; i < headers.length; i++) {
      if (this.calculateSimilarity(headers[i].toLowerCase(), lowerColumnName) > 0.8) {
        return i;
      }
    }

    return -1;
  }

  private calculateSimilarity(str1: string, str2: string): number {
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
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}