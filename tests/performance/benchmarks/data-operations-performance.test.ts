/**
 * Performance Tests for Data Operations
 * Benchmarks critical operations with large datasets
 */

import { DataOperationsHandler } from '../../../src/handlers/data-operations';
import { performance } from 'perf_hooks';

describe('Data Operations Performance', () => {
  let handler: DataOperationsHandler;
  let largeDatasetPath: string;
  let mediumDatasetPath: string;

  beforeAll(async () => {
    handler = new DataOperationsHandler();

    console.log('📊 Generating performance test datasets...');

    // Generate large dataset (100k rows)
    largeDatasetPath = await global.testDataManager.generateLargeDataset('large_dataset.csv', 100000);

    // Generate medium dataset (10k rows)
    mediumDatasetPath = await global.testDataManager.generateLargeDataset('medium_dataset.csv', 10000);

    console.log('✅ Performance test datasets ready');
  });

  describe('File Reading Performance', () => {
    test('should read large CSV file within acceptable time', async () => {
      const startTime = performance.now();

      const result = await handler.readFile({ filePath: largeDatasetPath });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.rowCount).toBe(100001); // Including header

      // Should complete within 10 seconds for 100k rows
      expect(duration).toBeLessThan(10000);

      console.log(`📈 Large file read: ${duration.toFixed(2)}ms for ${response.rowCount} rows`);
    }, 15000);

    test('should read medium CSV file quickly', async () => {
      const startTime = performance.now();

      const result = await handler.readFile({ filePath: mediumDatasetPath });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      // Should complete within 2 seconds for 10k rows
      expect(duration).toBeLessThan(2000);

      console.log(`📈 Medium file read: ${duration.toFixed(2)}ms for ${response.rowCount} rows`);
    });

    test('should handle multiple concurrent reads efficiently', async () => {
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(handler.readFile({ filePath: mediumDatasetPath }));
      }

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });

      // Concurrent reads should not take significantly longer than sequential
      expect(duration).toBeLessThan(10000);

      console.log(`📈 Concurrent reads (5x): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Search Performance', () => {
    test('should search large dataset efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.search({
        filePath: largeDatasetPath,
        searchValue: 'Engineering',
        exact: true
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      // Search should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      console.log(`🔍 Large dataset search: ${duration.toFixed(2)}ms, found ${response.matches.length} matches`);
    });

    test('should handle regex-like partial searches efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.search({
        filePath: largeDatasetPath,
        searchValue: 'user',
        exact: false
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      // Partial search should still be reasonably fast
      expect(duration).toBeLessThan(8000);

      console.log(`🔍 Partial search: ${duration.toFixed(2)}ms, found ${response.matches.length} matches`);
    });
  });

  describe('Filtering Performance', () => {
    test('should filter large dataset by numeric criteria efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.filterRows({
        filePath: largeDatasetPath,
        column: 'Salary',
        condition: 'greater_than',
        value: '50000'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      // Filtering should complete within 3 seconds
      expect(duration).toBeLessThan(3000);

      console.log(`🔽 Large dataset filter: ${duration.toFixed(2)}ms, ${response.filteredData.length} rows matched`);
    });

    test('should filter by string criteria efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.filterRows({
        filePath: largeDatasetPath,
        column: 'Department',
        condition: 'equals',
        value: 'Engineering'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      expect(duration).toBeLessThan(3000);

      console.log(`🔽 String filter: ${duration.toFixed(2)}ms, ${response.filteredData.length} rows matched`);
    });
  });

  describe('Aggregation Performance', () => {
    test('should sum large numeric column efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.aggregate({
        filePath: largeDatasetPath,
        column: 'Salary',
        operation: 'sum'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBeGreaterThan(0);

      // Aggregation should complete within 2 seconds
      expect(duration).toBeLessThan(2000);

      console.log(`📊 Large dataset sum: ${duration.toFixed(2)}ms, result: ${response.result.toLocaleString()}`);
    });

    test('should calculate average efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.aggregate({
        filePath: largeDatasetPath,
        column: 'Age',
        operation: 'average'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      expect(duration).toBeLessThan(2000);

      console.log(`📊 Average calculation: ${duration.toFixed(2)}ms, result: ${response.result.toFixed(2)}`);
    });

    test('should count non-null values efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.aggregate({
        filePath: largeDatasetPath,
        column: 'Email',
        operation: 'count'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      expect(duration).toBeLessThan(1500);

      console.log(`📊 Count operation: ${duration.toFixed(2)}ms, count: ${response.result.toLocaleString()}`);
    });
  });

  describe('Cell Operations Performance', () => {
    test('should get cell values quickly even from large files', async () => {
      const startTime = performance.now();

      // Get multiple random cells
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const row = Math.floor(Math.random() * 1000) + 2; // Skip header
        promises.push(handler.getCell({
          filePath: largeDatasetPath,
          cell: `A${row}`
        }));
      }

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });

      // Should complete within 5 seconds for 100 cell lookups
      expect(duration).toBeLessThan(5000);

      console.log(`📍 100 random cell lookups: ${duration.toFixed(2)}ms`);
    });

    test('should get ranges efficiently', async () => {
      const startTime = performance.now();

      const result = await handler.getRange({
        filePath: largeDatasetPath,
        startCell: 'A1',
        endCell: 'H1000' // First 1000 rows, all columns
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1000);

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);

      console.log(`📐 Range extraction (1000x8): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should not cause memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await handler.getHeaders({ filePath: mediumDatasetPath });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(`💾 Memory increase after 50 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid concurrent operations', async () => {
      const startTime = performance.now();

      const operations = [];

      // Mix different types of operations
      for (let i = 0; i < 20; i++) {
        operations.push(handler.getHeaders({ filePath: mediumDatasetPath }));
        operations.push(handler.search({ filePath: mediumDatasetPath, searchValue: 'test', exact: false }));
        operations.push(handler.aggregate({ filePath: mediumDatasetPath, column: 'Salary', operation: 'average' }));
      }

      const results = await Promise.all(operations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All operations should succeed
      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });

      console.log(`⚡ 60 concurrent mixed operations: ${duration.toFixed(2)}ms`);

      // Should handle the load reasonably well
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });

  afterEach(() => {
    // Prevent global cleanup from removing our performance test files
    // We'll clean them up in afterAll instead
  });

  afterAll(async () => {
    console.log('🧹 Performance test cleanup...');
    await global.testDataManager.cleanup();
    console.log('🧹 Performance test cleanup complete');
  });
});