/**
 * Validation Reporter - Creates actionable validation reports
 */

import { ValidationResult, ValidationIssue, ValidationSummary } from '../core/validation-result.js';

export class ValidationReporter {

  generateReport(result: ValidationResult): string {
    if (result.issues.length === 0) {
      return this.generateSuccessReport(result.summary);
    }

    return this.generateIssuesReport(result.summary, result.issues, result.recommendations);
  }

  generateSummaryReport(result: ValidationResult): string {
    const { summary, issues } = result;

    let report = `📊 VALIDATION SUMMARY\n`;
    report += `${'='.repeat(50)}\n\n`;

    // Overall status
    const status = summary.criticalIssues > 0 ? '❌ CRITICAL ISSUES FOUND' :
                   summary.warningIssues > 0 ? '⚠️ WARNINGS FOUND' :
                   '✅ VALIDATION PASSED';

    report += `Status: ${status}\n`;
    report += `Files Validated: ${summary.totalFiles}\n`;
    report += `Total Rows: ${summary.totalRows.toLocaleString()}\n`;
    report += `Validation Time: ${summary.validationTimeMs}ms\n\n`;

    // Issue breakdown
    if (summary.totalIssues > 0) {
      report += `Issues Found:\n`;
      if (summary.criticalIssues > 0) report += `  🔴 Critical: ${summary.criticalIssues}\n`;
      if (summary.warningIssues > 0) report += `  🟡 Warning: ${summary.warningIssues}\n`;
      if (summary.infoIssues > 0) report += `  🔵 Info: ${summary.infoIssues}\n`;
      report += '\n';
    }

    // Files with issues
    if (summary.filesWithIssues.length > 0) {
      report += `Files with Issues:\n`;
      summary.filesWithIssues.forEach(file => {
        const fileIssues = issues.filter(issue => issue.location.file === file);
        const criticalCount = fileIssues.filter(i => i.severity === 'critical').length;
        const warningCount = fileIssues.filter(i => i.severity === 'warning').length;
        const infoCount = fileIssues.filter(i => i.severity === 'info').length;

        report += `  📄 ${file}\n`;
        if (criticalCount > 0) report += `     🔴 ${criticalCount} critical\n`;
        if (warningCount > 0) report += `     🟡 ${warningCount} warnings\n`;
        if (infoCount > 0) report += `     🔵 ${infoCount} info\n`;
      });
      report += '\n';
    }

    return report;
  }

  generateDetailedReport(result: ValidationResult): string {
    let report = this.generateSummaryReport(result);

    if (result.issues.length > 0) {
      report += `📋 DETAILED ISSUES\n`;
      report += `${'='.repeat(50)}\n\n`;

      // Group issues by severity and file
      const issuesByFile = this.groupIssuesByFile(result.issues);

      for (const [file, fileIssues] of issuesByFile) {
        report += `📄 File: ${file}\n`;
        report += `${'-'.repeat(30)}\n\n`;

        const issuesBySeverity = this.groupIssuesBySeverity(fileIssues);

        // Critical issues first
        if (issuesBySeverity.critical.length > 0) {
          report += `🔴 CRITICAL ISSUES (${issuesBySeverity.critical.length})\n\n`;
          report += this.formatIssueList(issuesBySeverity.critical);
        }

        // Then warnings
        if (issuesBySeverity.warning.length > 0) {
          report += `🟡 WARNINGS (${issuesBySeverity.warning.length})\n\n`;
          report += this.formatIssueList(issuesBySeverity.warning);
        }

        // Finally info
        if (issuesBySeverity.info.length > 0) {
          report += `🔵 INFO (${issuesBySeverity.info.length})\n\n`;
          report += this.formatIssueList(issuesBySeverity.info);
        }

        report += '\n';
      }
    }

    // Add recommendations
    if (result.recommendations.length > 0) {
      report += `💡 RECOMMENDATIONS\n`;
      report += `${'='.repeat(50)}\n\n`;

      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n\n`;
      });
    }

    return report;
  }

  private generateSuccessReport(summary: ValidationSummary): string {
    let report = `✅ VALIDATION PASSED\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `🎉 All validation checks passed successfully!\n\n`;

    report += `📊 Summary:\n`;
    report += `  Files Validated: ${summary.totalFiles}\n`;
    report += `  Total Rows: ${summary.totalRows.toLocaleString()}\n`;
    report += `  Validation Time: ${summary.validationTimeMs}ms\n\n`;

    report += `✅ Your data quality looks excellent!\n`;

    return report;
  }

  private generateIssuesReport(
    summary: ValidationSummary,
    issues: ValidationIssue[],
    recommendations: string[]
  ): string {
    let report = `⚠️ VALIDATION ISSUES FOUND\n`;
    report += `${'='.repeat(50)}\n\n`;

    // Quick summary
    report += `Found ${summary.totalIssues} issues across ${summary.filesWithIssues.length} files:\n`;
    if (summary.criticalIssues > 0) {
      report += `  🔴 ${summary.criticalIssues} critical issues (fix immediately)\n`;
    }
    if (summary.warningIssues > 0) {
      report += `  🟡 ${summary.warningIssues} warnings (should fix)\n`;
    }
    if (summary.infoIssues > 0) {
      report += `  🔵 ${summary.infoIssues} info items (consider reviewing)\n`;
    }
    report += '\n';

    // Top issues (most critical first)
    const topIssues = this.getTopIssues(issues, 5);
    if (topIssues.length > 0) {
      report += `🔥 TOP ISSUES TO FIX:\n\n`;

      topIssues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'warning' ? '🟡' : '🔵';

        report += `${index + 1}. ${icon} ${issue.message}\n`;
        report += `   📍 ${issue.location.file}:${issue.location.row}:${issue.location.column}\n`;
        report += `   💡 ${issue.suggestion}\n`;

        if (issue.affectedRows.length > 1) {
          const rowCount = issue.affectedRows.length;
          const sampleRows = issue.affectedRows.slice(0, 5).join(', ');
          const moreRows = rowCount > 5 ? ` and ${rowCount - 5} more` : '';
          report += `   📊 Affected rows: ${sampleRows}${moreRows}\n`;
        }

        report += '\n';
      });
    }

    return report;
  }

  private groupIssuesByFile(issues: ValidationIssue[]): Map<string, ValidationIssue[]> {
    const grouped = new Map<string, ValidationIssue[]>();

    for (const issue of issues) {
      const file = issue.location.file;
      if (!grouped.has(file)) {
        grouped.set(file, []);
      }
      grouped.get(file)!.push(issue);
    }

    return grouped;
  }

  private groupIssuesBySeverity(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      warning: issues.filter(i => i.severity === 'warning'),
      info: issues.filter(i => i.severity === 'info')
    };
  }

  private formatIssueList(issues: ValidationIssue[]): string {
    let output = '';

    issues.forEach((issue, index) => {
      output += `${index + 1}. ${issue.message}\n`;
      output += `   📍 Row ${issue.location.row}, Column: ${issue.location.column}\n`;
      output += `   💡 ${issue.suggestion}\n`;

      if (issue.affectedRows.length > 1) {
        const rowCount = issue.affectedRows.length;
        const sampleRows = issue.affectedRows.slice(0, 10).join(', ');
        const moreRows = rowCount > 10 ? ` and ${rowCount - 10} more` : '';
        output += `   📊 Affected rows: ${sampleRows}${moreRows}\n`;
      }

      if (issue.metadata) {
        // Add relevant metadata information
        if (issue.metadata.missingValues) {
          const missing = issue.metadata.missingValues.slice(0, 5);
          output += `   🔍 Missing values: ${missing.join(', ')}\n`;
        }

        if (issue.metadata.expectedRange) {
          const range = issue.metadata.expectedRange;
          output += `   📊 Expected range: ${range.min.toFixed(2)} - ${range.max.toFixed(2)}\n`;
        }
      }

      output += '\n';
    });

    return output;
  }

  private getTopIssues(issues: ValidationIssue[], limit: number): ValidationIssue[] {
    // Sort by severity (critical first) and then by number of affected rows
    return issues
      .sort((a, b) => {
        // Severity priority
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;

        // Then by impact (affected rows)
        return b.affectedRows.length - a.affectedRows.length;
      })
      .slice(0, limit);
  }
}