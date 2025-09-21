/**
 * Test Data Manager
 * Handles creation, management, and cleanup of test data files
 */

import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

interface TestDataConfig {
  rows: number;
  columns: string[];
  dataTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'>;
  includeHeaders?: boolean;
  nullPercentage?: number;
}

class TestDataManager {
  private tempFiles: string[] = [];
  private baseDir = path.resolve('tests/temp');

  constructor() {
    // Directory creation will be handled in the methods that need it
  }

  private async ensureDirectoryExists() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * Check if a file already exists before generating it
   */
  private async fileExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, filename);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a CSV file with test data
   */
  async generateCSV(filename: string, config: TestDataConfig, forceRegenerate: boolean = false): Promise<string> {
    await this.ensureDirectoryExists();
    const filePath = path.join(this.baseDir, filename);

    // Skip generation if file already exists (for persistent test data) unless forced
    if (!forceRegenerate && await this.fileExists(filename)) {
      return filePath;
    }

    const data = this.generateData(config);

    const csvContent = data.map(row =>
      row.map(cell => this.formatCellForCSV(cell)).join(',')
    ).join('\n');

    await fs.writeFile(filePath, csvContent, 'utf-8');
    this.tempFiles.push(filePath);

    return filePath;
  }

  /**
   * Generate an Excel file with test data
   */
  async generateExcel(filename: string, sheets: Record<string, TestDataConfig>): Promise<string> {
    await this.ensureDirectoryExists();
    const filePath = path.join(this.baseDir, filename);

    // Skip generation if file already exists (for persistent test data)
    if (await this.fileExists(filename)) {
      return filePath;
    }

    const workbook = XLSX.utils.book_new();

    for (const [sheetName, config] of Object.entries(sheets)) {
      const data = this.generateData(config);
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    XLSX.writeFile(workbook, filePath);
    this.tempFiles.push(filePath);

    return filePath;
  }

  /**
   * Generate large dataset for performance testing
   */
  async generateLargeDataset(filename: string, rows: number = 100000): Promise<string> {
    const config: TestDataConfig = {
      rows,
      columns: ['ID', 'Name', 'Email', 'Age', 'Salary', 'Department', 'Join_Date', 'Active'],
      dataTypes: {
        ID: 'number',
        Name: 'string',
        Email: 'string',
        Age: 'number',
        Salary: 'number',
        Department: 'string',
        Join_Date: 'date',
        Active: 'boolean'
      },
      includeHeaders: true
    };

    // For performance tests, always regenerate to ensure fresh data
    return this.generateCSV(filename, config, true);
  }

  /**
   * Generate corrupted/invalid data for error testing
   */
  async generateInvalidData(filename: string, errorType: 'malformed' | 'empty' | 'binary'): Promise<string> {
    await this.ensureDirectoryExists();
    const filePath = path.join(this.baseDir, filename);

    switch (errorType) {
      case 'malformed':
        await fs.writeFile(filePath, 'Name,Age\n"John,25\n"Jane",30\nBob,', 'utf-8');
        break;
      case 'empty':
        await fs.writeFile(filePath, '', 'utf-8');
        break;
      case 'binary':
        await fs.writeFile(filePath, Buffer.from([0xFF, 0xFE, 0x00, 0x01]));
        break;
    }

    this.tempFiles.push(filePath);
    return filePath;
  }

  /**
   * Create sample business datasets
   */
  async generateBusinessDatasets(): Promise<Record<string, string>> {
    const datasets: Record<string, string> = {};

    // Sales data
    datasets.sales = await this.generateCSV('sales_data.csv', {
      rows: 1000,
      columns: ['Date', 'Product', 'Category', 'Quantity', 'Price', 'Revenue', 'Region', 'Salesperson'],
      dataTypes: {
        Date: 'date',
        Product: 'string',
        Category: 'string',
        Quantity: 'number',
        Price: 'number',
        Revenue: 'number',
        Region: 'string',
        Salesperson: 'string'
      },
      includeHeaders: true
    });

    // Employee data
    datasets.employees = await this.generateCSV('employee_data.csv', {
      rows: 500,
      columns: ['ID', 'Name', 'Department', 'Position', 'Salary', 'Hire_Date', 'Manager_ID', 'Status'],
      dataTypes: {
        ID: 'number',
        Name: 'string',
        Department: 'string',
        Position: 'string',
        Salary: 'number',
        Hire_Date: 'date',
        Manager_ID: 'number',
        Status: 'string'
      },
      includeHeaders: true
    });

    // Financial data
    datasets.financial = await this.generateExcel('financial_data.xlsx', {
      'Income_Statement': {
        rows: 50,
        columns: ['Account', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
        dataTypes: {
          Account: 'string',
          Q1: 'number',
          Q2: 'number',
          Q3: 'number',
          Q4: 'number',
          Total: 'number'
        },
        includeHeaders: true
      },
      'Balance_Sheet': {
        rows: 40,
        columns: ['Item', 'Current_Year', 'Previous_Year', 'Variance'],
        dataTypes: {
          Item: 'string',
          Current_Year: 'number',
          Previous_Year: 'number',
          Variance: 'number'
        },
        includeHeaders: true
      }
    });

    return datasets;
  }

  /**
   * Generate data with specific patterns for validation testing
   */
  async generateValidationTestData(): Promise<Record<string, string>> {
    const datasets: Record<string, string> = {};

    // Master data (for referential integrity)
    datasets.branches = await this.generateCSV('branches.csv', {
      rows: 10,
      columns: ['Branch_ID', 'Branch_Name', 'Region', 'Manager'],
      dataTypes: {
        Branch_ID: 'string',
        Branch_Name: 'string',
        Region: 'string',
        Manager: 'string'
      },
      includeHeaders: true
    });

    // Transaction data (references master data)
    datasets.transactions = await this.generateCSV('transactions.csv', {
      rows: 100,
      columns: ['Transaction_ID', 'Branch_ID', 'Amount', 'Date', 'Customer_ID'],
      dataTypes: {
        Transaction_ID: 'string',
        Branch_ID: 'string',
        Amount: 'number',
        Date: 'date',
        Customer_ID: 'string'
      },
      includeHeaders: true
    });

    return datasets;
  }

  /**
   * Copy existing test data files to temp directory
   */
  async copyDataFile(sourcePath: string, destName: string): Promise<string> {
    await this.ensureDirectoryExists();
    const destPath = path.join(this.baseDir, destName);
    await fs.copyFile(sourcePath, destPath);
    this.tempFiles.push(destPath);
    return destPath;
  }

  /**
   * Clean up all temporary files
   */
  async cleanup(): Promise<void> {
    for (const filePath of this.tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors (file might already be deleted)
      }
    }
    this.tempFiles = [];
  }

  /**
   * Generate realistic test data based on configuration
   */
  private generateData(config: TestDataConfig): any[][] {
    const data: any[][] = [];

    // Add headers if requested
    if (config.includeHeaders) {
      data.push([...config.columns]);
    }

    // Generate data rows
    for (let i = 0; i < config.rows; i++) {
      const row: any[] = [];

      for (const column of config.columns) {
        const dataType = config.dataTypes[column] || 'string';
        let value = this.generateValueByType(dataType, i, column);

        // Apply null percentage
        if (config.nullPercentage && Math.random() < config.nullPercentage) {
          value = null;
        }

        row.push(value);
      }

      data.push(row);
    }

    return data;
  }

  /**
   * Generate realistic values based on data type
   */
  private generateValueByType(type: string, index: number, column: string): any {
    switch (type) {
      case 'number':
        if (column.toLowerCase().includes('id')) {
          return index + 1;
        } else if (column.toLowerCase().includes('salary')) {
          return Math.floor(Math.random() * 100000) + 30000;
        } else if (column.toLowerCase().includes('age')) {
          return Math.floor(Math.random() * 40) + 25;
        } else if (column.toLowerCase().includes('price') || column.toLowerCase().includes('revenue')) {
          return +(Math.random() * 1000).toFixed(2);
        }
        return Math.floor(Math.random() * 1000);

      case 'string':
        if (column.toLowerCase().includes('name')) {
          const names = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
          return names[index % names.length];
        } else if (column.toLowerCase().includes('email')) {
          return `user${index}@example.com`;
        } else if (column.toLowerCase().includes('department')) {
          const departments = ['Sales', 'Marketing', 'Engineering', 'HR', 'Finance'];
          return departments[index % departments.length];
        } else if (column.toLowerCase().includes('region')) {
          const regions = ['North', 'South', 'East', 'West', 'Central'];
          return regions[index % regions.length];
        }
        return `Value_${index}`;

      case 'date':
        const start = new Date(2020, 0, 1);
        const end = new Date();
        const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
        return new Date(randomTime).toISOString().split('T')[0];

      case 'boolean':
        return Math.random() > 0.5;

      default:
        return `Data_${index}`;
    }
  }

  /**
   * Format cell value for CSV output
   */
  private formatCellForCSV(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Escape quotes and wrap in quotes if contains comma or quote
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}

export { TestDataManager };