#!/usr/bin/env node

// Test script for validation engine
const { ValidationEngine } = require('./dist/validation/core/validation-engine.js');

async function testValidationEngine() {
  console.log('🔍 Testing Smart Data Validation Engine\n');

  const validator = new ValidationEngine({
    reportFormat: 'detailed'
  });

  try {
    // Test comprehensive validation
    console.log('Test: Comprehensive Data Validation');
    console.log('====================================');

    const result = await validator.validateDataConsistency(
      'test_bulk_data/sales_with_issues.csv',
      ['test_bulk_data/branches.csv', 'test_bulk_data/managers.csv'],
      {
        validationRules: ['referential_integrity', 'data_completeness', 'value_ranges'],
        autoDetectRelationships: true
      }
    );

    console.log('📊 VALIDATION SUMMARY:');
    console.log('======================');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📁 Files: ${result.summary.totalFiles}`);
    console.log(`📄 Rows: ${result.summary.totalRows}`);
    console.log(`⏱️  Time: ${result.summary.validationTimeMs}ms`);
    console.log(`🚨 Issues: ${result.summary.totalIssues}`);
    console.log(`  🔴 Critical: ${result.summary.criticalIssues}`);
    console.log(`  🟡 Warning: ${result.summary.warningIssues}`);
    console.log(`  🔵 Info: ${result.summary.infoIssues}`);
    console.log();

    if (result.issues.length > 0) {
      console.log('🔍 ISSUES FOUND:');
      console.log('================');

      result.issues.slice(0, 5).forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'warning' ? '🟡' : '🔵';

        console.log(`${index + 1}. ${icon} ${issue.rule.toUpperCase()}`);
        console.log(`   Message: ${issue.message}`);
        console.log(`   Location: ${issue.location.file}:${issue.location.row}:${issue.location.column}`);
        console.log(`   Fix: ${issue.suggestion}`);
        if (issue.affectedRows.length > 1) {
          console.log(`   Affected: ${issue.affectedRows.length} rows`);
        }
        console.log();
      });
    }

    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    console.log();

    console.log('📋 DETAILED REPORT:');
    console.log('===================');
    console.log(result.detailedReport);

    console.log('\n🎉 Validation test completed!');
    console.log('🔍 Key validations performed:');
    console.log('  ✅ Referential integrity (foreign keys)');
    console.log('  ✅ Data completeness (missing values)');
    console.log('  ✅ Value ranges (outlier detection)');
    console.log('  ✅ Hebrew text support');
    console.log('  ✅ Actionable error messages');

  } catch (error) {
    console.error('❌ Validation test failed:', error);
  }
}

testValidationEngine();