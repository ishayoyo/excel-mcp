/**
 * Referential Integrity Validation Rule
 * Checks if foreign key references exist in reference tables
 */

import { BaseValidationRule } from './base-rule.js';
import { ValidationContext, ValidationIssue, DataIndexes } from '../core/validation-result.js';

export interface ReferentialIntegrityConfig {
  keyColumns?: string[];
  autoDetect?: boolean;
  caseSensitive?: boolean;
  allowEmpty?: boolean;
}

export class ReferentialIntegrityRule extends BaseValidationRule {
  name = 'referential_integrity';
  severity: 'critical' | 'warning' | 'info' = 'critical';
  description = 'Validates that foreign key references exist in reference tables';

  constructor(private config: ReferentialIntegrityConfig = {}) {
    super();
    this.config = {
      autoDetect: true,
      caseSensitive: false,
      allowEmpty: true,
      ...config
    };
  }

  async validate(context: ValidationContext, indexes: DataIndexes): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get relationships to validate
    const relationships = this.config.autoDetect
      ? context.relationships || []
      : this.createManualRelationships(context);

    for (const relationship of relationships) {
      const relationshipIssues = await this.validateRelationship(
        relationship,
        context,
        indexes
      );
      issues.push(...relationshipIssues);
    }

    return issues;
  }

  private createManualRelationships(context: ValidationContext) {
    // Create relationships based on configured key columns
    const relationships = [];

    if (this.config.keyColumns) {
      for (const keyColumn of this.config.keyColumns) {
        // Try to find matching columns in reference files
        for (const [refPath, refFile] of context.referenceFiles) {
          for (const refColumn of refFile.headers) {
            if (this.isLikelyMatch(keyColumn, refColumn)) {
              relationships.push({
                primaryColumn: keyColumn,
                referenceFile: refPath,
                referenceColumn: refColumn,
                confidence: 1.0,
                matchType: 'manual' as const
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  private isLikelyMatch(primaryCol: string, refCol: string): boolean {
    const p = primaryCol.toLowerCase();
    const r = refCol.toLowerCase();

    // Exact match
    if (p === r) return true;

    // Common patterns: branch_id -> id, category_id -> id
    if (p.includes('_id') && r === 'id') return true;
    if (p.includes('_code') && r === 'code') return true;
    if (p.includes('_name') && r === 'name') return true;

    return false;
  }

  private async validateRelationship(
    relationship: any,
    context: ValidationContext,
    indexes: DataIndexes
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Find primary column index
    const primaryColIndex = this.findColumnIndex(
      context.primaryFile.headers,
      relationship.primaryColumn
    );

    if (primaryColIndex === -1) {
      issues.push(this.createIssue(
        `Primary column "${relationship.primaryColumn}" not found`,
        {
          file: context.primaryFile.filePath,
          row: 1,
          column: relationship.primaryColumn
        },
        `Check column name spelling. Available columns: ${context.primaryFile.headers.join(', ')}`
      ));
      return issues;
    }

    // Get reference key set
    const refKeySet = indexes.keyIndexes.get(
      `${relationship.referenceFile}:${relationship.referenceColumn}`
    );

    if (!refKeySet) {
      issues.push(this.createIssue(
        `Reference column "${relationship.referenceColumn}" not found in ${relationship.referenceFile}`,
        {
          file: relationship.referenceFile,
          row: 1,
          column: relationship.referenceColumn
        },
        `Check reference file and column name`
      ));
      return issues;
    }

    // Validate each value in primary file
    const invalidRows: number[] = [];
    const missingValues = new Set<string>();

    for (let rowIdx = 1; rowIdx < context.primaryFile.data.length; rowIdx++) {
      const value = context.primaryFile.data[rowIdx][primaryColIndex];

      // Skip empty values if allowed
      if ((value === '' || value == null) && this.config.allowEmpty) {
        continue;
      }

      const searchValue = this.config.caseSensitive
        ? String(value)
        : String(value || '').toLowerCase().trim();

      if (!refKeySet.has(searchValue)) {
        invalidRows.push(rowIdx + 1); // +1 for 1-based row numbers
        missingValues.add(String(value));
      }
    }

    // Create issues for missing references
    if (invalidRows.length > 0) {
      const missingList = Array.from(missingValues).slice(0, 5); // Show max 5 examples
      const moreCount = missingValues.size > 5 ? ` and ${missingValues.size - 5} more` : '';

      issues.push(this.createIssue(
        `${invalidRows.length} rows have invalid ${relationship.primaryColumn} references`,
        {
          file: context.primaryFile.filePath,
          row: invalidRows[0],
          column: relationship.primaryColumn
        },
        `Missing values: ${missingList.join(', ')}${moreCount}. Add these to ${relationship.referenceFile} or use existing values.`,
        invalidRows,
        {
          missingValues: Array.from(missingValues),
          referenceFile: relationship.referenceFile,
          referenceColumn: relationship.referenceColumn,
          availableValues: Array.from(refKeySet).slice(0, 10) // Show sample valid values
        }
      ));
    }

    return issues;
  }
}