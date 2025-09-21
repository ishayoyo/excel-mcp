/**
 * Validation Engine - Main orchestrator for data validation
 */

import { ValidationContextBuilder } from './validation-context.js';
import { SmartIndexer } from '../indexing/smart-indexer.js';
import { ValidationReporter } from '../reporting/validation-reporter.js';
import { BaseValidationRule } from '../rules/base-rule.js';
import { ReferentialIntegrityRule } from '../rules/referential-integrity.js';
import { DataCompletenessRule } from '../rules/data-completeness.js';
import { ValueRangeRule } from '../rules/value-ranges.js';
import {
  ValidationResult,
  ValidationSummary,
  ValidationIssue,
  ValidationContext
} from './validation-result.js';

export interface ValidationEngineConfig {
  autoDetectRelationships?: boolean;
  enableCaching?: boolean;
  maxConcurrentValidations?: number;
  rules?: string[];
  reportFormat?: 'summary' | 'detailed';
  tolerance?: number;
}

export class ValidationEngine {
  private contextBuilder: ValidationContextBuilder;
  private indexer: SmartIndexer;
  private reporter: ValidationReporter;
  private rules: Map<string, BaseValidationRule>;

  constructor(private config: ValidationEngineConfig = {}) {
    this.config = {
      autoDetectRelationships: true,
      enableCaching: false,
      maxConcurrentValidations: 5,
      reportFormat: 'detailed',
      tolerance: 0.01,
      ...config
    };

    this.contextBuilder = new ValidationContextBuilder();
    this.indexer = new SmartIndexer();
    this.reporter = new ValidationReporter();
    this.rules = new Map();

    this.initializeRules();
  }

  private initializeRules(): void {
    // Initialize all available validation rules
    this.rules.set('referential_integrity', new ReferentialIntegrityRule({
      autoDetect: this.config.autoDetectRelationships,
      caseSensitive: false,
      allowEmpty: true
    }));

    this.rules.set('data_completeness', new DataCompletenessRule({
      minCompleteness: 95,
      checkAllColumns: false
    }));

    this.rules.set('value_ranges', new ValueRangeRule({
      autoDetect: true,
      outlierMethod: 'iqr',
      outlierThreshold: 1.5,
      tolerance: this.config.tolerance
    }));
  }

  async validateDataConsistency(
    primaryFilePath: string,
    referenceFilePaths: string[],
    options: {
      validationRules?: string[];
      keyColumns?: string[];
      sheet?: string;
      autoDetectRelationships?: boolean;
      tolerance?: number;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Build validation context
      const context = await this.contextBuilder.buildContext(
        primaryFilePath,
        referenceFilePaths,
        options.sheet
      );

      // Build performance indexes
      const indexes = await this.indexer.buildIndexes(context);
      context.indexes = indexes;

      // Determine which rules to run
      const rulesToRun = options.validationRules || this.config.rules || [
        'referential_integrity',
        'data_completeness',
        'value_ranges'
      ];

      // Configure rules based on options
      if (options.keyColumns) {
        const refIntegrityRule = this.rules.get('referential_integrity') as ReferentialIntegrityRule;
        if (refIntegrityRule) {
          // Update rule configuration
          (refIntegrityRule as any).config.keyColumns = options.keyColumns;
          (refIntegrityRule as any).config.autoDetect = false;
        }
      }

      // Run validation rules
      const allIssues: ValidationIssue[] = [];
      const validationPromises: Promise<ValidationIssue[]>[] = [];

      for (const ruleName of rulesToRun) {
        const rule = this.rules.get(ruleName);
        if (rule) {
          validationPromises.push(rule.validate(context, indexes));
        }
      }

      // Execute validations (potentially in parallel)
      const results = await Promise.all(validationPromises);
      results.forEach(issues => allIssues.push(...issues));

      // Calculate summary
      const summary = this.calculateSummary(context, allIssues, startTime);

      // Generate recommendations
      const recommendations = this.generateRecommendations(allIssues, context);

      // Create final result
      const result: ValidationResult = {
        success: allIssues.filter(i => i.severity === 'critical').length === 0,
        summary,
        issues: allIssues,
        recommendations
      };

      // Generate report if requested
      if (this.config.reportFormat === 'detailed') {
        result.detailedReport = this.reporter.generateDetailedReport(result);
      } else {
        result.detailedReport = this.reporter.generateSummaryReport(result);
      }

      return result;

    } catch (error) {
      // Handle validation errors gracefully
      const summary: ValidationSummary = {
        totalFiles: referenceFilePaths.length + 1,
        totalRows: 0,
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0,
        filesWithIssues: [primaryFilePath],
        validationTimeMs: Date.now() - startTime
      };

      return {
        success: false,
        summary,
        issues: [{
          rule: 'validation_engine',
          severity: 'critical',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: { file: primaryFilePath, row: 1, column: 'N/A' },
          suggestion: 'Check file paths and formats. Ensure all files are accessible and valid.',
          affectedRows: [],
          metadata: { error: error instanceof Error ? error.message : String(error) }
        }],
        recommendations: [
          'Verify all file paths are correct and files exist',
          'Check file formats are supported (.csv, .xlsx, .xls)',
          'Ensure files are not corrupted or locked'
        ]
      };
    }
  }

  private calculateSummary(
    context: ValidationContext,
    issues: ValidationIssue[],
    startTime: number
  ): ValidationSummary {
    const filesWithIssues = Array.from(new Set(issues.map(i => i.location.file)));

    return {
      totalFiles: context.referenceFiles.size + 1,
      totalRows: context.primaryFile.rowCount +
                 Array.from(context.referenceFiles.values())
                   .reduce((sum, file) => sum + file.rowCount, 0),
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      warningIssues: issues.filter(i => i.severity === 'warning').length,
      infoIssues: issues.filter(i => i.severity === 'info').length,
      filesWithIssues,
      validationTimeMs: Date.now() - startTime
    };
  }

  private generateRecommendations(
    issues: ValidationIssue[],
    context: ValidationContext
  ): string[] {
    const recommendations: string[] = [];

    // Critical issues recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        `🔴 Address ${criticalIssues.length} critical issues immediately - these may cause data integrity problems`
      );

      // Specific recommendations based on issue types
      const refIntegrityIssues = criticalIssues.filter(i => i.rule === 'referential_integrity');
      if (refIntegrityIssues.length > 0) {
        recommendations.push(
          `🔗 Fix referential integrity: Add missing references to lookup tables or correct invalid values`
        );
      }
    }

    // Warning issues recommendations
    const warningIssues = issues.filter(i => i.severity === 'warning');
    if (warningIssues.length > 0) {
      recommendations.push(
        `🟡 Review ${warningIssues.length} warnings - these indicate potential data quality issues`
      );

      const completenessIssues = warningIssues.filter(i => i.rule === 'data_completeness');
      if (completenessIssues.length > 0) {
        recommendations.push(
          `📝 Improve data completeness: Fill missing values in required fields`
        );
      }

      const rangeIssues = warningIssues.filter(i => i.rule === 'value_ranges');
      if (rangeIssues.length > 0) {
        recommendations.push(
          `📊 Check outlier values: Verify if unusual values are legitimate or data entry errors`
        );
      }
    }

    // General recommendations
    if (issues.length === 0) {
      recommendations.push('✅ Your data looks great! Consider running validation regularly to maintain quality');
    } else {
      recommendations.push('🔄 Re-run validation after fixes to ensure all issues are resolved');
      recommendations.push('📊 Consider setting up automated validation for ongoing data quality monitoring');
    }

    return recommendations;
  }

  getAvailableRules(): string[] {
    return Array.from(this.rules.keys());
  }

  getRuleDescription(ruleName: string): string {
    const rule = this.rules.get(ruleName);
    return rule ? rule.description : 'Unknown rule';
  }
}