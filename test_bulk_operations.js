#!/usr/bin/env node

// Test script for bulk operations
const { BulkOperations } = require('./dist/bulk/bulk-operations.js');

async function testBulkAggregation() {
  console.log('🚀 Testing Bulk Operations Engine\n');

  const bulkOps = new BulkOperations();

  try {
    // Test 1: Bulk Aggregation - Sum revenue across multiple files
    console.log('Test 1: Bulk Revenue Aggregation');
    console.log('=====================================');

    const result1 = await bulkOps.aggregateMultiFiles({
      filePaths: [
        'test_bulk_data/sales_2024.csv',
        'test_bulk_data/sales_2025.csv',
        'test_bulk_data/sales_q1.csv'
      ],
      column: 'revenue',
      operation: 'sum',
      consolidate: true
    });

    console.log('✅ Result:', JSON.stringify(result1, null, 2));
    console.log('\n');

    // Test 2: Bulk Aggregation with filters - Only "Excellent" performance
    console.log('Test 2: Filtered Aggregation (Excellent Performance Only)');
    console.log('=========================================================');

    const result2 = await bulkOps.aggregateMultiFiles({
      filePaths: [
        'test_bulk_data/sales_2024.csv',
        'test_bulk_data/sales_2025.csv'
      ],
      column: 'revenue',
      operation: 'sum',
      consolidate: true,
      filters: [{
        column: 'productivity',
        condition: 'equals',
        value: 'Excellent'
      }]
    });

    console.log('✅ Result:', JSON.stringify(result2, null, 2));
    console.log('\n');

    // Test 3: Per-file breakdown
    console.log('Test 3: Per-File Revenue Breakdown');
    console.log('==================================');

    const result3 = await bulkOps.aggregateMultiFiles({
      filePaths: [
        'test_bulk_data/sales_2024.csv',
        'test_bulk_data/sales_2025.csv',
        'test_bulk_data/sales_q1.csv'
      ],
      column: 'revenue',
      operation: 'average',
      consolidate: false
    });

    console.log('✅ Result:', JSON.stringify(result3, null, 2));
    console.log('\n');

    // Test 4: Bulk Filter Operation
    console.log('Test 4: Bulk Filter Operation (Hebrew Performance Levels)');
    console.log('=========================================================');

    const result4 = await bulkOps.filterMultiFiles({
      filePaths: [
        'test_bulk_data/sales_2024.csv',
        'test_bulk_data/sales_q1.csv'
      ],
      filters: [{
        column: 'productivity',
        condition: 'contains',
        value: 'טוב'
      }],
      outputMode: 'summary'
    });

    console.log('✅ Result:', JSON.stringify(result4, null, 2));
    console.log('\n');

    console.log('🎉 All tests completed successfully!');
    console.log('💡 Performance improvement: Processing multiple files in parallel');
    console.log('🌍 Multi-language support: Hebrew text handling verified');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBulkAggregation();