/**
 * Unit Tests for Data Operations Handler
 * Tests all basic data reading and manipulation operations
 */

import { DataOperationsHandler } from '../../../src/handlers/data-operations';
import path from 'path';

describe('DataOperationsHandler', () => {
  let handler: DataOperationsHandler;
  let sampleCSVPath: string;
  let sampleExcelPath: string;

  beforeAll(async () => {
    handler = new DataOperationsHandler();
    sampleCSVPath = path.resolve('tests/data/csv/sample_sales.csv');
    sampleExcelPath = path.resolve('tests/data/excel/sample_workbook.xlsx');
  });

  describe('readFile', () => {
    test('should read CSV file successfully', async () => {
      const result = await handler.readFile({ filePath: sampleCSVPath });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.rowCount).toBeGreaterThan(0);
      expect(response.columnCount).toBeGreaterThan(0);
      expect(response.headers).toContain('Date');
      expect(response.headers).toContain('Product');
      expect(response.headers).toContain('Revenue');
    });

    test('should read Excel file successfully', async () => {
      const result = await handler.readFile({
        filePath: sampleExcelPath,
        sheet: 'Financial'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.headers).toContain('Account');
      expect(response.headers).toContain('Q1');
    });

    test('should handle non-existent file gracefully', async () => {
      const result = await handler.readFile({
        filePath: 'non-existent-file.csv'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('should handle invalid file format', async () => {
      // Create a temporary invalid file
      const invalidFile = await global.testDataManager.generateInvalidData('invalid.csv', 'binary');

      const result = await handler.readFile({ filePath: invalidFile });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });
  });

  describe('getCell', () => {
    test('should get specific cell value from CSV', async () => {
      const result = await handler.getCell({
        filePath: sampleCSVPath,
        cell: 'A2'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.cellValue).toBeDefined();
      expect(response.cellAddress).toBe('A2');
    });

    test('should get cell value from Excel sheet', async () => {
      const result = await handler.getCell({
        filePath: sampleExcelPath,
        cell: 'B2',
        sheet: 'Financial'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.cellValue).toBe(100000);
    });

    test('should handle invalid cell reference', async () => {
      const result = await handler.getCell({
        filePath: sampleCSVPath,
        cell: 'Z999'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('out of range');
    });

    test('should handle malformed cell reference', async () => {
      const result = await handler.getCell({
        filePath: sampleCSVPath,
        cell: 'INVALID'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });
  });

  describe('getRange', () => {
    test('should get range of cells from CSV', async () => {
      const result = await handler.getRange({
        filePath: sampleCSVPath,
        startCell: 'A1',
        endCell: 'C3'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3); // 3 rows
      expect(response.data[0]).toHaveLength(3); // 3 columns
      expect(response.range).toBe('A1:C3');
    });

    test('should get range from Excel sheet', async () => {
      const result = await handler.getRange({
        filePath: sampleExcelPath,
        startCell: 'A1',
        endCell: 'B3',
        sheet: 'Financial'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3);
      expect(response.data[0]).toHaveLength(2);
    });

    test('should handle invalid range', async () => {
      const result = await handler.getRange({
        filePath: sampleCSVPath,
        startCell: 'C3',
        endCell: 'A1' // End before start
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });
  });

  describe('getHeaders', () => {
    test('should get column headers from CSV', async () => {
      const result = await handler.getHeaders({ filePath: sampleCSVPath });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.headers).toEqual([
        'Date', 'Product', 'Category', 'Quantity',
        'Price', 'Revenue', 'Region', 'Salesperson'
      ]);
    });

    test('should get headers from specific Excel sheet', async () => {
      const result = await handler.getHeaders({
        filePath: sampleExcelPath,
        sheet: 'Inventory'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.headers).toContain('Product_ID');
      expect(response.headers).toContain('Product_Name');
    });
  });

  describe('search', () => {
    test('should find exact matches', async () => {
      const result = await handler.search({
        filePath: sampleCSVPath,
        searchValue: 'Widget A',
        exact: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.matches.length).toBeGreaterThan(0);
      expect(response.matches[0].value).toBe('Widget A');
    });

    test('should find partial matches', async () => {
      const result = await handler.search({
        filePath: sampleCSVPath,
        searchValue: 'Widget',
        exact: false
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.matches.length).toBeGreaterThan(0);
    });

    test('should return empty results for non-existent value', async () => {
      const result = await handler.search({
        filePath: sampleCSVPath,
        searchValue: 'NonExistentValue',
        exact: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.matches).toHaveLength(0);
    });
  });

  describe('filterRows', () => {
    test('should filter rows by exact match', async () => {
      const result = await handler.filterRows({
        filePath: sampleCSVPath,
        column: 'Category',
        condition: 'equals',
        value: 'Electronics'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.filteredData.length).toBeGreaterThan(0);

      // All rows should have 'Electronics' in Category column
      response.filteredData.forEach((row: any[]) => {
        expect(row[2]).toBe('Electronics'); // Category is 3rd column (index 2)
      });
    });

    test('should filter rows by numeric comparison', async () => {
      const result = await handler.filterRows({
        filePath: sampleCSVPath,
        column: 'Quantity',
        condition: 'greater_than',
        value: '10'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);

      if (response.filteredData.length > 0) {
        response.filteredData.forEach((row: any[]) => {
          expect(parseFloat(row[3])).toBeGreaterThan(10); // Quantity is 4th column
        });
      }
    });

    test('should handle column by index', async () => {
      const result = await handler.filterRows({
        filePath: sampleCSVPath,
        column: '2', // Category column (0-based index)
        condition: 'contains',
        value: 'Home'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('aggregate', () => {
    test('should sum numeric column', async () => {
      const result = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Revenue',
        operation: 'sum'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBeGreaterThan(0);
      expect(response.operation).toBe('sum');
      expect(response.column).toBe('Revenue');
    });

    test('should calculate average', async () => {
      const result = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Price',
        operation: 'average'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBeGreaterThan(0);
    });

    test('should count non-null values', async () => {
      const result = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Product',
        operation: 'count'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBeGreaterThan(0);
    });

    test('should find min and max values', async () => {
      const minResult = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Quantity',
        operation: 'min'
      });

      const maxResult = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Quantity',
        operation: 'max'
      });

      const minResponse = JSON.parse(minResult.content[0].text);
      const maxResponse = JSON.parse(maxResult.content[0].text);

      expect(minResponse.success).toBe(true);
      expect(maxResponse.success).toBe(true);
      expect(maxResponse.result).toBeGreaterThanOrEqual(minResponse.result);
    });

    test('should handle non-numeric column for sum', async () => {
      const result = await handler.aggregate({
        filePath: sampleCSVPath,
        column: 'Product',
        operation: 'sum'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('numeric');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required parameters', async () => {
      const result = await handler.readFile({} as any);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('should handle file permission errors', async () => {
      // This test would need a file with restricted permissions
      // For now, we'll test with a non-existent path
      const result = await handler.readFile({
        filePath: '/invalid/path/file.csv'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });
  });
});