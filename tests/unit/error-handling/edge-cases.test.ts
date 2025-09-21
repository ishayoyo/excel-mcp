/**
 * Edge Cases and Error Handling Tests
 * Tests system behavior under extreme conditions and error scenarios
 */

import { DataOperationsHandler } from '../../../src/handlers/data-operations';
import { AnalyticsHandler } from '../../../src/handlers/analytics';
import { AIOperationsHandler } from '../../../src/handlers/ai-operations';
import { FileOperationsHandler } from '../../../src/handlers/file-operations';

describe('Edge Cases and Error Handling', () => {
  let dataHandler: DataOperationsHandler;
  let analyticsHandler: AnalyticsHandler;
  let aiHandler: AIOperationsHandler;
  let fileHandler: FileOperationsHandler;

  beforeAll(() => {
    dataHandler = new DataOperationsHandler();
    analyticsHandler = new AnalyticsHandler();
    aiHandler = new AIOperationsHandler();
    fileHandler = new FileOperationsHandler();
  });

  describe('Invalid File Formats and Corruption', () => {
    test('should handle completely empty files', async () => {
      const emptyFile = await global.testDataManager.generateInvalidData('empty.csv', 'empty');

      const result = await dataHandler.readFile({ filePath: emptyFile });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('empty');
    });

    test('should handle binary files disguised as CSV', async () => {
      const binaryFile = await global.testDataManager.generateInvalidData('binary.csv', 'binary');

      const result = await dataHandler.readFile({ filePath: binaryFile });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('should handle malformed CSV with inconsistent columns', async () => {
      const malformedFile = await global.testDataManager.generateInvalidData('malformed.csv', 'malformed');

      const result = await dataHandler.readFile({ filePath: malformedFile });
      const response = JSON.parse(result.content[0].text);

      // Should handle gracefully but may succeed with warnings
      if (response.success) {
        expect(response.warnings).toBeDefined();
      } else {
        expect(response.error).toBeDefined();
      }
    });

    test('should handle extremely large cell values', async () => {
      const largeValueData = [
        ['ID', 'Description'],
        ['1', 'A'.repeat(100000)], // 100k character string
        ['2', '9'.repeat(50)], // Very large number as string
      ];

      const filePath = await global.testDataManager.generateCSV('large_values.csv', {
        rows: 0,
        columns: ['ID', 'Description'],
        dataTypes: { ID: 'string', Description: 'string' }
      });

      // Manually write the large data
      const fs = require('fs');
      const csvContent = largeValueData.map(row => row.join(',')).join('\n');
      await fs.promises.writeFile(filePath, csvContent);

      const result = await dataHandler.readFile({ filePath });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.data[1][1]).toHaveLength(100000);
    });
  });

  describe('Extreme Cell References', () => {
    test('should handle cell references beyond Excel limits', async () => {
      const sampleFile = await global.testDataManager.generateCSV('sample.csv', {
        rows: 5,
        columns: ['A', 'B', 'C'],
        dataTypes: { A: 'number', B: 'number', C: 'number' }
      });

      // Try to access cell beyond reasonable limits
      const result = await dataHandler.getCell({
        filePath: sampleFile,
        cell: 'ZZZ99999'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('out of range');
    });

    test('should handle invalid cell reference formats', async () => {
      const sampleFile = await global.testDataManager.generateCSV('sample.csv', {
        rows: 5,
        columns: ['A', 'B', 'C'],
        dataTypes: { A: 'number', B: 'number', C: 'number' }
      });

      const invalidRefs = ['123', 'AA', '11AA', 'A-1', '@#$', ''];

      for (const ref of invalidRefs) {
        const result = await dataHandler.getCell({
          filePath: sampleFile,
          cell: ref
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      }
    });

    test('should handle negative and zero row/column references', async () => {
      const sampleFile = await global.testDataManager.generateCSV('sample.csv', {
        rows: 5,
        columns: ['A', 'B', 'C'],
        dataTypes: { A: 'number', B: 'number', C: 'number' }
      });

      const invalidRefs = ['A0', 'A-1'];

      for (const ref of invalidRefs) {
        const result = await dataHandler.getCell({
          filePath: sampleFile,
          cell: ref
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle files with extremely wide tables', async () => {
      // Create a file with 100 columns but few rows
      const wideColumns = Array.from({ length: 100 }, (_, i) => `Col${i + 1}`);
      const wideFile = await global.testDataManager.generateCSV('wide_table.csv', {
        rows: 10,
        columns: wideColumns,
        dataTypes: Object.fromEntries(wideColumns.map(col => [col, 'number']))
      });

      const result = await dataHandler.readFile({ filePath: wideFile });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.columnCount).toBe(100);
    });

    test('should handle concurrent access to the same file', async () => {
      const sampleFile = await global.testDataManager.generateCSV('concurrent.csv', {
        rows: 100,
        columns: ['A', 'B', 'C'],
        dataTypes: { A: 'number', B: 'number', C: 'number' }
      });

      // Launch multiple operations simultaneously
      const promises = [
        dataHandler.readFile({ filePath: sampleFile }),
        dataHandler.getHeaders({ filePath: sampleFile }),
        dataHandler.aggregate({ filePath: sampleFile, column: 'A', operation: 'sum' }),
        dataHandler.search({ filePath: sampleFile, searchValue: '1', exact: false }),
        dataHandler.filterRows({ filePath: sampleFile, column: 'A', condition: 'greater_than', value: '0' })
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Data Type Edge Cases', () => {
    test('should handle mixed data types in numeric operations', async () => {
      const mixedFile = await global.testDataManager.generateCSV('mixed_types.csv', {
        rows: 0,
        columns: ['Mixed'],
        dataTypes: { Mixed: 'string' }
      });

      // Manually create mixed data
      const fs = require('fs');
      const mixedData = [
        'Mixed',
        '123',
        'abc',
        '45.67',
        '',
        'null',
        '0',
        'true',
        'false'
      ].join('\n');

      await fs.promises.writeFile(mixedFile, mixedData);

      const result = await dataHandler.aggregate({
        filePath: mixedFile,
        column: 'Mixed',
        operation: 'sum'
      });

      const response = JSON.parse(result.content[0].text);
      // Should fail gracefully for mixed types in numeric operation
      expect(response.success).toBe(false);
      expect(response.error).toContain('numeric');
    });

    test('should handle special values (null, undefined, NaN, Infinity)', async () => {
      const specialFile = await global.testDataManager.generateCSV('special_values.csv', {
        rows: 0,
        columns: ['Special'],
        dataTypes: { Special: 'string' }
      });

      const fs = require('fs');
      const specialData = [
        'Special',
        'null',
        'undefined',
        'NaN',
        'Infinity',
        '-Infinity',
        '',
        '   ',
        '0'
      ].join('\n');

      await fs.promises.writeFile(specialFile, specialData);

      const countResult = await dataHandler.aggregate({
        filePath: specialFile,
        column: 'Special',
        operation: 'count'
      });

      const countResponse = JSON.parse(countResult.content[0].text);
      expect(countResponse.success).toBe(true);
      // Should count non-empty values
      expect(countResponse.result).toBeGreaterThan(0);
    });

    test('should handle Unicode and special characters', async () => {
      const unicodeFile = await global.testDataManager.generateCSV('unicode.csv', {
        rows: 0,
        columns: ['Unicode'],
        dataTypes: { Unicode: 'string' }
      });

      const fs = require('fs');
      const unicodeData = [
        'Unicode',
        '🚀 Rocket',
        'עברית Hebrew',
        '中文 Chinese',
        'العربية Arabic',
        '日本語 Japanese',
        'emoji: 😀🎉🔥',
        'symbols: ®©™'
      ].join('\n');

      await fs.promises.writeFile(unicodeFile, unicodeData, 'utf8');

      const result = await dataHandler.readFile({ filePath: unicodeFile });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.data[1][0]).toBe('🚀 Rocket');
    });
  });

  describe('Formula Edge Cases', () => {
    test('should handle circular references', async () => {
      const result = await aiHandler.evaluateFormula({
        formula: '=A1',
        context: {
          'A1': '=A1' // Circular reference
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('circular');
    });

    test('should handle deeply nested formulas', async () => {
      const deepFormula = '=SUM(' + 'IF('.repeat(10) + 'A1>0,A1,0' + ')'.repeat(10) + ')';

      const result = await aiHandler.evaluateFormula({
        formula: deepFormula,
        context: { 'A1': 5 }
      });

      const response = JSON.parse(result.content[0].text);
      // Should either succeed or fail gracefully
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    });

    test('should handle formulas with missing functions', async () => {
      const result = await aiHandler.evaluateFormula({
        formula: '=NONEXISTENT_FUNCTION(A1)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('NONEXISTENT_FUNCTION');
    });
  });

  describe('Network and Resource Edge Cases', () => {
    test('should handle file path with special characters', async () => {
      const specialPathFile = await global.testDataManager.generateCSV(
        'special & name (with spaces) [brackets].csv',
        {
          rows: 5,
          columns: ['A'],
          dataTypes: { A: 'number' }
        }
      );

      const result = await dataHandler.readFile({ filePath: specialPathFile });
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
    });

    test('should handle very long file paths', async () => {
      const longName = 'a'.repeat(200) + '.csv';

      try {
        const longPathFile = await global.testDataManager.generateCSV(longName, {
          rows: 5,
          columns: ['A'],
          dataTypes: { A: 'number' }
        });

        const result = await dataHandler.readFile({ filePath: longPathFile });
        const response = JSON.parse(result.content[0].text);

        // Should either succeed or fail gracefully
        if (!response.success) {
          expect(response.error).toBeDefined();
        }
      } catch (error) {
        // Expected on some systems with path length limits
        expect(error).toBeDefined();
      }
    });
  });

  describe('AI Provider Edge Cases', () => {
    test('should handle AI provider returning malformed JSON', async () => {
      // Mock AI manager to simulate malformed response
      const originalAIManager = (aiHandler as any).nlpProcessor.aiManager;
      const mockCreateCompletion = jest.fn().mockResolvedValue({
        content: '{invalid json malformed'
      });

      (aiHandler as any).nlpProcessor.aiManager = {
        ...originalAIManager,
        createCompletion: mockCreateCompletion
      };

      const result = await aiHandler.parseNaturalLanguage({
        query: 'test query'
      });

      const response = JSON.parse(result.content[0].text);
      // The fallback should work at the NLP processor level when JSON parsing fails
      expect(response.success).toBe(true);

      // Restore original
      (aiHandler as any).nlpProcessor.aiManager = originalAIManager;
    });

    test('should handle AI provider timeouts', async () => {
      const originalAIManager = (aiHandler as any).nlpProcessor.aiManager;
      const mockCreateCompletion = jest.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      (aiHandler as any).nlpProcessor.aiManager = {
        ...originalAIManager,
        createCompletion: mockCreateCompletion
      };

      const result = await aiHandler.explainFormula({
        formula: '=SUM(A1:A10)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true); // Should fall back to local explanation

      // Restore original
      (aiHandler as any).nlpProcessor.aiManager = originalAIManager;
    });
  });

  describe('Resource Exhaustion', () => {
    test('should handle operations when system memory is low', async () => {
      // Simulate memory pressure by creating large objects
      const memoryHogs: any[] = [];

      try {
        // Create some memory pressure (but not enough to crash)
        for (let i = 0; i < 100; i++) {
          memoryHogs.push(new Array(100000).fill('memory_test'));
        }

        const testFile = await global.testDataManager.generateCSV('memory_test.csv', {
          rows: 1000,
          columns: ['A', 'B', 'C'],
          dataTypes: { A: 'number', B: 'number', C: 'number' }
        });

        const result = await dataHandler.readFile({ filePath: testFile });
        const response = JSON.parse(result.content[0].text);

        expect(response.success).toBe(true);
      } finally {
        // Clean up memory
        memoryHogs.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Parameter Validation Edge Cases', () => {
    test('should handle missing required parameters', async () => {
      const results = await Promise.all([
        dataHandler.readFile({} as any),
        dataHandler.getCell({ filePath: 'test.csv' } as any),
        dataHandler.aggregate({ filePath: 'test.csv' } as any),
        analyticsHandler.statisticalAnalysis({ filePath: 'test.csv' } as any)
      ]);

      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      });
    });

    test('should handle null and undefined parameters', async () => {
      const results = await Promise.all([
        dataHandler.readFile({ filePath: null } as any),
        dataHandler.getCell({ filePath: 'test.csv', cell: undefined } as any),
        dataHandler.filterRows({
          filePath: 'test.csv',
          column: 'A',
          condition: null,
          value: 'test'
        } as any)
      ]);

      results.forEach(result => {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
      });
    });

    test('should handle extremely long parameter values', async () => {
      const longString = 'a'.repeat(100000);
      const testFile = await global.testDataManager.generateCSV('param_test.csv', {
        rows: 5,
        columns: ['A'],
        dataTypes: { A: 'string' }
      });

      const result = await dataHandler.search({
        filePath: testFile,
        searchValue: longString,
        exact: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.matches).toHaveLength(0);
    });
  });
});