#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import * as csvStringify from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// AI and Formula Engine imports
import { NLPProcessor } from './ai/nlp-processor.js';
import { parseFormula } from './formula/parser.js';
import { FormulaEvaluator, WorkbookContext } from './formula/evaluator.js';

interface CellAddress {
  row: number;
  col: number;
}

class ExcelCSVServer {
  private server: Server;
  private nlpProcessor: NLPProcessor;
  private formulaEvaluator: FormulaEvaluator;

  constructor() {
    this.server = new Server(
      {
        name: 'excel-csv-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize AI and Formula engines
    this.nlpProcessor = new NLPProcessor();
    this.formulaEvaluator = new FormulaEvaluator();

    this.setupHandlers();
  }

  private parseA1Notation(a1: string): CellAddress {
    const match = a1.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid A1 notation: ${a1}`);
    }

    const col = match[1].split('').reduce((acc, char) => {
      return acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    }, 0) - 1;

    const row = parseInt(match[2]) - 1;

    return { row, col };
  }

  private async readFileContent(filePath: string, sheet?: string): Promise<any[][]> {
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    if (ext === '.csv') {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return csv.parse(content, {
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      });
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(absolutePath);
      const sheetName = sheet || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    } else {
      throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Basic Tools
        {
          name: 'read_file',
          description: 'Read an entire CSV or Excel file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional, defaults to first sheet)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'get_cell',
          description: 'Get the value of a specific cell using A1 notation',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              cell: {
                type: 'string',
                description: 'Cell address in A1 notation (e.g., "A1", "B5")',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'cell'],
          },
        },
        {
          name: 'get_range',
          description: 'Get values from a range of cells',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              startCell: {
                type: 'string',
                description: 'Start cell in A1 notation (e.g., "A1")',
              },
              endCell: {
                type: 'string',
                description: 'End cell in A1 notation (e.g., "D10")',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'startCell', 'endCell'],
          },
        },
        {
          name: 'get_headers',
          description: 'Get the column headers (first row) of a file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'search',
          description: 'Search for cells containing a specific value',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              searchValue: {
                type: 'string',
                description: 'Value to search for',
              },
              exact: {
                type: 'boolean',
                description: 'Whether to match exactly or contains (default: false)',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'searchValue'],
          },
        },
        {
          name: 'filter_rows',
          description: 'Filter rows based on column values',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              column: {
                type: 'string',
                description: 'Column name or index (0-based)',
              },
              condition: {
                type: 'string',
                description: 'Condition: equals, contains, greater_than, less_than',
                enum: ['equals', 'contains', 'greater_than', 'less_than'],
              },
              value: {
                type: 'string',
                description: 'Value to compare against',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'column', 'condition', 'value'],
          },
        },
        {
          name: 'aggregate',
          description: 'Perform aggregation operations on a column',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              column: {
                type: 'string',
                description: 'Column name or index (0-based)',
              },
              operation: {
                type: 'string',
                description: 'Aggregation operation',
                enum: ['sum', 'average', 'count', 'min', 'max'],
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'column', 'operation'],
          },
        },
        // Advanced Data Science Tools
        {
          name: 'statistical_analysis',
          description: 'Perform comprehensive statistical analysis on a column',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              column: {
                type: 'string',
                description: 'Column name or index (0-based)',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'column'],
          },
        },
        {
          name: 'correlation_analysis',
          description: 'Calculate correlation between two numeric columns',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              column1: {
                type: 'string',
                description: 'First column name or index (0-based)',
              },
              column2: {
                type: 'string',
                description: 'Second column name or index (0-based)',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'column1', 'column2'],
          },
        },
        {
          name: 'data_profile',
          description: 'Generate comprehensive data profiling report for all columns',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'pivot_table',
          description: 'Create pivot table with grouping and aggregation',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file',
              },
              groupBy: {
                type: 'string',
                description: 'Column to group by',
              },
              aggregateColumn: {
                type: 'string',
                description: 'Column to aggregate',
              },
              operation: {
                type: 'string',
                description: 'Aggregation operation',
                enum: ['sum', 'average', 'count', 'min', 'max'],
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
            },
            required: ['filePath', 'groupBy', 'aggregateColumn', 'operation'],
          },
        },
        // Write/Export Tools
        {
          name: 'write_file',
          description: 'Write data to a new CSV or Excel file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path for the new file (must end with .csv, .xlsx, or .xls)',
              },
              data: {
                type: 'array',
                description: 'Array of arrays representing rows of data',
                items: {
                  type: 'array',
                },
              },
              headers: {
                type: 'array',
                description: 'Optional headers for the first row',
                items: {
                  type: 'string',
                },
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional, defaults to "Sheet1")',
              },
            },
            required: ['filePath', 'data'],
          },
        },
        {
          name: 'export_analysis',
          description: 'Export analysis results (pivot tables, statistics, etc.) to a new file',
          inputSchema: {
            type: 'object',
            properties: {
              analysisType: {
                type: 'string',
                description: 'Type of analysis to export',
                enum: ['pivot_table', 'statistical_analysis', 'correlation', 'data_profile'],
              },
              sourceFile: {
                type: 'string',
                description: 'Path to the source data file',
              },
              outputFile: {
                type: 'string',
                description: 'Path for the output file',
              },
              analysisParams: {
                type: 'object',
                description: 'Parameters for the analysis (depends on analysisType)',
              },
            },
            required: ['analysisType', 'sourceFile', 'outputFile', 'analysisParams'],
          },
        },

        // AI-Powered Formula & Natural Language Tools
        {
          name: 'evaluate_formula',
          description: 'Evaluate an Excel formula with given context',
          inputSchema: {
            type: 'object',
            properties: {
              formula: {
                type: 'string',
                description: 'Excel formula to evaluate (e.g., "=SUM(A1:A10)", "=VLOOKUP(B2,C:D,2,FALSE)")',
              },
              context: {
                type: 'object',
                description: 'Cell values and ranges for formula evaluation (optional)',
                additionalProperties: true,
              },
            },
            required: ['formula'],
          },
        },
        {
          name: 'parse_natural_language',
          description: 'Convert natural language to Excel formula or command',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language query (e.g., "sum all sales", "find duplicates", "average by category")',
              },
              filePath: {
                type: 'string',
                description: 'Path to file for context (optional)',
              },
              provider: {
                type: 'string',
                description: 'Preferred AI provider: anthropic, openai, deepseek, gemini, or local (optional)',
                enum: ['anthropic', 'openai', 'deepseek', 'gemini', 'local'],
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'explain_formula',
          description: 'Explain what an Excel formula does in plain English',
          inputSchema: {
            type: 'object',
            properties: {
              formula: {
                type: 'string',
                description: 'Excel formula to explain (e.g., "=VLOOKUP(A2,B:C,2,FALSE)")',
              },
              provider: {
                type: 'string',
                description: 'Preferred AI provider: anthropic, openai, deepseek, gemini, or local (optional)',
                enum: ['anthropic', 'openai', 'deepseek', 'gemini', 'local'],
              },
            },
            required: ['formula'],
          },
        },
        {
          name: 'ai_provider_status',
          description: 'Check status of available AI providers',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'smart_data_analysis',
          description: 'AI-powered analysis suggestions for your data',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file to analyze',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)',
              },
              provider: {
                type: 'string',
                description: 'Preferred AI provider: anthropic, openai, deepseek, gemini, or local (optional)',
                enum: ['anthropic', 'openai', 'deepseek', 'gemini', 'local'],
              },
            },
            required: ['filePath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'read_file':
            return await this.readFile(args);
          case 'get_cell':
            return await this.getCell(args);
          case 'get_range':
            return await this.getRange(args);
          case 'get_headers':
            return await this.getHeaders(args);
          case 'search':
            return await this.search(args);
          case 'filter_rows':
            return await this.filterRows(args);
          case 'aggregate':
            return await this.aggregate(args);
          case 'statistical_analysis':
            return await this.statisticalAnalysis(args);
          case 'correlation_analysis':
            return await this.correlationAnalysis(args);
          case 'data_profile':
            return await this.dataProfile(args);
          case 'pivot_table':
            return await this.pivotTable(args);
          case 'write_file':
            return await this.writeFile(args);
          case 'export_analysis':
            return await this.exportAnalysis(args);

          // AI-Powered Tools
          case 'evaluate_formula':
            return await this.evaluateFormula(args);
          case 'parse_natural_language':
            return await this.parseNaturalLanguage(args);
          case 'explain_formula':
            return await this.explainFormula(args);
          case 'ai_provider_status':
            return await this.getAIProviderStatus(args);
          case 'smart_data_analysis':
            return await this.smartDataAnalysis(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  // Basic Tools Implementation
  private async readFile(args: any) {
    const { filePath, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            rows: data.length,
            columns: data[0]?.length || 0,
            data: data,
          }, null, 2),
        },
      ],
    };
  }

  private async getCell(args: any) {
    const { filePath, cell, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    const { row, col } = this.parseA1Notation(cell);
    
    if (row >= data.length || col >= (data[0]?.length || 0)) {
      throw new Error(`Cell ${cell} is out of range`);
    }
    
    const value = data[row][col];
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cell,
            value,
          }, null, 2),
        },
      ],
    };
  }

  private async getRange(args: any) {
    const { filePath, startCell, endCell, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    const start = this.parseA1Notation(startCell);
    const end = this.parseA1Notation(endCell);
    
    const rangeData = [];
    for (let row = start.row; row <= end.row && row < data.length; row++) {
      const rowData = [];
      for (let col = start.col; col <= end.col && col < (data[row]?.length || 0); col++) {
        rowData.push(data[row][col]);
      }
      rangeData.push(rowData);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            range: `${startCell}:${endCell}`,
            data: rangeData,
          }, null, 2),
        },
      ],
    };
  }

  private async getHeaders(args: any) {
    const { filePath, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length === 0) {
      throw new Error('File is empty');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            headers: data[0],
          }, null, 2),
        },
      ],
    };
  }

  private async search(args: any) {
    const { filePath, searchValue, exact = false, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    const results = [];
    
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < (data[row]?.length || 0); col++) {
        const cellValue = String(data[row][col]);
        const matches = exact 
          ? cellValue === searchValue 
          : cellValue.toLowerCase().includes(searchValue.toLowerCase());
          
        if (matches) {
          const colLetter = String.fromCharCode(65 + (col % 26));
          results.push({
            cell: `${colLetter}${row + 1}`,
            value: data[row][col],
            row: row + 1,
            column: col + 1,
          });
        }
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            searchValue,
            found: results.length,
            results,
          }, null, 2),
        },
      ],
    };
  }

  private async filterRows(args: any) {
    const { filePath, column, condition, value, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length === 0) {
      throw new Error('File is empty');
    }
    
    const colIndex = isNaN(Number(column)) 
      ? data[0].indexOf(column)
      : Number(column);
      
    if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
      throw new Error(`Column "${column}" not found`);
    }
    
    const headers = data[0];
    const filteredRows = [headers];
    
    for (let i = 1; i < data.length; i++) {
      const cellValue = String(data[i][colIndex]);
      let matches = false;
      
      switch (condition) {
        case 'equals':
          matches = cellValue === value;
          break;
        case 'contains':
          matches = cellValue.toLowerCase().includes(value.toLowerCase());
          break;
        case 'greater_than':
          matches = Number(cellValue) > Number(value);
          break;
        case 'less_than':
          matches = Number(cellValue) < Number(value);
          break;
      }
      
      if (matches) {
        filteredRows.push(data[i]);
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalRows: data.length - 1,
            filteredRows: filteredRows.length - 1,
            data: filteredRows,
          }, null, 2),
        },
      ],
    };
  }

  private async aggregate(args: any) {
    const { filePath, column, operation, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }
    
    const colIndex = isNaN(Number(column)) 
      ? data[0].indexOf(column)
      : Number(column);
      
    if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
      throw new Error(`Column "${column}" not found`);
    }
    
    const values = [];
    for (let i = 1; i < data.length; i++) {
      const val = Number(data[i][colIndex]);
      if (!isNaN(val)) {
        values.push(val);
      }
    }
    
    let result;
    switch (operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'average':
        result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'count':
        result = values.length;
        break;
      case 'min':
        result = values.length > 0 ? Math.min(...values) : null;
        break;
      case 'max':
        result = values.length > 0 ? Math.max(...values) : null;
        break;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            column: data[0][colIndex],
            operation,
            result,
            validValues: values.length,
          }, null, 2),
        },
      ],
    };
  }

  // Advanced Data Science Tools Implementation
  private async statisticalAnalysis(args: any) {
    const { filePath, column, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }
    
    const colIndex = isNaN(Number(column)) 
      ? data[0].indexOf(column)
      : Number(column);
      
    if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
      throw new Error(`Column "${column}" not found`);
    }
    
    const values = [];
    for (let i = 1; i < data.length; i++) {
      const val = Number(data[i][colIndex]);
      if (!isNaN(val)) {
        values.push(val);
      }
    }
    
    if (values.length === 0) {
      throw new Error('No numeric values found in column');
    }
    
    // Calculate statistics
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    // Sort for median and quartiles
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)];
    
    // Mode calculation
    const frequency: Record<number, number> = {};
    values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency).filter(val => frequency[+val] === maxFreq).map(Number);
    
    // Variance and standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    // Quartiles
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    // Skewness (simplified Pearson's method)
    const skewness = 3 * (mean - median) / stdDev;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            column: data[0][colIndex],
            statistics: {
              count: n,
              sum,
              mean: Math.round(mean * 10000) / 10000,
              median,
              mode: modes.length === 1 ? modes[0] : modes,
              min: Math.min(...values),
              max: Math.max(...values),
              range: Math.max(...values) - Math.min(...values),
              variance: Math.round(variance * 10000) / 10000,
              standardDeviation: Math.round(stdDev * 10000) / 10000,
              quartiles: {
                q1,
                q2: median,
                q3,
                iqr
              },
              skewness: Math.round(skewness * 10000) / 10000,
              coefficientOfVariation: Math.round((stdDev / mean) * 100 * 100) / 100
            }
          }, null, 2),
        },
      ],
    };
  }

  private async correlationAnalysis(args: any) {
    const { filePath, column1, column2, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }
    
    const col1Index = isNaN(Number(column1)) ? data[0].indexOf(column1) : Number(column1);
    const col2Index = isNaN(Number(column2)) ? data[0].indexOf(column2) : Number(column2);
    
    if (col1Index === -1 || col2Index === -1) {
      throw new Error('One or both columns not found');
    }
    
    const pairs = [];
    for (let i = 1; i < data.length; i++) {
      const val1 = Number(data[i][col1Index]);
      const val2 = Number(data[i][col2Index]);
      if (!isNaN(val1) && !isNaN(val2)) {
        pairs.push([val1, val2]);
      }
    }
    
    if (pairs.length < 2) {
      throw new Error('Not enough valid numeric pairs for correlation analysis');
    }
    
    // Calculate Pearson correlation coefficient
    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    const correlation = denominator === 0 ? 0 : numerator / denominator;
    
    // Interpret correlation strength
    const absCorr = Math.abs(correlation);
    let strength = 'No correlation';
    if (absCorr >= 0.9) strength = 'Very strong';
    else if (absCorr >= 0.7) strength = 'Strong';
    else if (absCorr >= 0.5) strength = 'Moderate';
    else if (absCorr >= 0.3) strength = 'Weak';
    else if (absCorr >= 0.1) strength = 'Very weak';
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            column1: data[0][col1Index],
            column2: data[0][col2Index],
            correlation: {
              coefficient: Math.round(correlation * 10000) / 10000,
              strength,
              direction: correlation > 0 ? 'Positive' : correlation < 0 ? 'Negative' : 'None',
              validPairs: n,
              interpretation: `${strength} ${correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : ''} correlation`
            }
          }, null, 2),
        },
      ],
    };
  }

  private async dataProfile(args: any) {
    const { filePath, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length === 0) {
      throw new Error('File is empty');
    }
    
    const headers = data[0];
    const profile: Record<string, any> = {
      overview: {
        totalRows: data.length - 1,
        totalColumns: headers.length,
        fileName: filePath.split('/').pop() || filePath
      },
      columns: {}
    };
    
    // Analyze each column
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const columnName = headers[colIdx];
      const values = data.slice(1).map(row => row[colIdx]);
      const nonEmptyValues = values.filter(val => val !== '' && val !== null && val !== undefined);
      
      // Detect data type
      const numericValues = nonEmptyValues.map(Number).filter(val => !isNaN(val));
      const isNumeric = numericValues.length > nonEmptyValues.length * 0.8;
      
      const columnProfile: Record<string, any> = {
        dataType: isNumeric ? 'Numeric' : 'Text',
        totalValues: values.length,
        nonEmptyValues: nonEmptyValues.length,
        emptyValues: values.length - nonEmptyValues.length,
        uniqueValues: new Set(nonEmptyValues).size,
        duplicateValues: nonEmptyValues.length - new Set(nonEmptyValues).size
      };
      
      if (isNumeric && numericValues.length > 0) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        columnProfile.statistics = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          mean: Math.round(mean * 100) / 100,
          median: numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]
        };
      } else {
        // Text analysis
        const lengths = nonEmptyValues.map(val => String(val).length);
        if (lengths.length > 0) {
          columnProfile.textAnalysis = {
            minLength: Math.min(...lengths),
            maxLength: Math.max(...lengths),
            avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length * 100) / 100
          };
        }
      }
      
      profile.columns[columnName] = columnProfile;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(profile, null, 2),
        },
      ],
    };
  }

  private async pivotTable(args: any) {
    const { filePath, groupBy, aggregateColumn, operation, sheet } = args;
    const data = await this.readFileContent(filePath, sheet);
    
    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }
    
    const groupByIndex = isNaN(Number(groupBy)) ? data[0].indexOf(groupBy) : Number(groupBy);
    const aggIndex = isNaN(Number(aggregateColumn)) ? data[0].indexOf(aggregateColumn) : Number(aggregateColumn);
    
    if (groupByIndex === -1 || aggIndex === -1) {
      throw new Error('One or both columns not found');
    }
    
    // Group data
    const groups: Record<string, number[]> = {};
    for (let i = 1; i < data.length; i++) {
      const groupKey = String(data[i][groupByIndex]);
      const value = Number(data[i][aggIndex]);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      if (!isNaN(value)) {
        groups[groupKey].push(value);
      }
    }
    
    // Calculate aggregations
    const results: Array<{group: string, value: number, count: number}> = [];
    for (const [group, values] of Object.entries(groups)) {
      if (values.length === 0) continue;
      
      let result: number;
      switch (operation) {
        case 'sum':
          result = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'average':
          result = values.reduce((a: number, b: number) => a + b, 0) / values.length;
          break;
        case 'count':
          result = values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
        default:
          result = 0;
      }
      
      results.push({
        group,
        value: Math.round(result * 100) / 100,
        count: values.length
      });
    }
    
    // Sort by value descending
    results.sort((a, b) => b.value - a.value);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            pivotTable: {
              groupBy: data[0][groupByIndex],
              aggregateColumn: data[0][aggIndex],
              operation,
              totalGroups: results.length,
              results
            }
          }, null, 2),
        },
      ],
    };
  }

  // Write/Export Tools Implementation
  private async writeFile(args: any) {
    const { filePath, data, headers, sheet = 'Sheet1' } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);
    
    // Prepare data with headers if provided
    const fullData = headers ? [headers, ...data] : data;
    
    if (ext === '.csv') {
      // Write CSV file
      const csvContent = csvStringify.stringify(fullData);
      await fs.writeFile(absolutePath, csvContent, 'utf-8');
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Write Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(fullData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
      XLSX.writeFile(workbook, absolutePath);
    } else {
      throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls extension.');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            rowsWritten: fullData.length,
            columnsWritten: fullData[0]?.length || 0,
          }, null, 2),
        },
      ],
    };
  }

  private async exportAnalysis(args: any) {
    const { analysisType, sourceFile, outputFile, analysisParams } = args;
    
    let result: any;
    let exportData: any[][] = [];
    
    switch (analysisType) {
      case 'pivot_table': {
        // Run pivot table analysis
        const pivotResult = await this.pivotTable({
          filePath: sourceFile,
          ...analysisParams
        });
        const pivotData = JSON.parse(pivotResult.content[0].text);
        
        // Convert to tabular format
        exportData = [
          ['Group', 'Value', 'Count'],
          ...pivotData.pivotTable.results.map((r: any) => [r.group, r.value, r.count])
        ];
        break;
      }
      
      case 'statistical_analysis': {
        // Run statistical analysis
        const statsResult = await this.statisticalAnalysis({
          filePath: sourceFile,
          ...analysisParams
        });
        const statsData = JSON.parse(statsResult.content[0].text);
        
        // Convert to tabular format
        exportData = [
          ['Metric', 'Value'],
          ['Column', statsData.column],
          ['Count', statsData.statistics.count],
          ['Sum', statsData.statistics.sum],
          ['Mean', statsData.statistics.mean],
          ['Median', statsData.statistics.median],
          ['Min', statsData.statistics.min],
          ['Max', statsData.statistics.max],
          ['Range', statsData.statistics.range],
          ['Std Dev', statsData.statistics.standardDeviation],
          ['Variance', statsData.statistics.variance],
          ['CV%', statsData.statistics.coefficientOfVariation],
          ['Q1', statsData.statistics.quartiles.q1],
          ['Q3', statsData.statistics.quartiles.q3],
          ['IQR', statsData.statistics.quartiles.iqr],
          ['Skewness', statsData.statistics.skewness]
        ];
        break;
      }
      
      case 'correlation': {
        // Run correlation analysis
        const corrResult = await this.correlationAnalysis({
          filePath: sourceFile,
          ...analysisParams
        });
        const corrData = JSON.parse(corrResult.content[0].text);
        
        // Convert to tabular format
        exportData = [
          ['Metric', 'Value'],
          ['Column 1', corrData.column1],
          ['Column 2', corrData.column2],
          ['Correlation', corrData.correlation],
          ['R-squared', corrData.rSquared],
          ['P-value', corrData.pValue || 'N/A'],
          ['Interpretation', corrData.interpretation]
        ];
        break;
      }
      
      case 'data_profile': {
        // Run data profiling
        const profileResult = await this.dataProfile({
          filePath: sourceFile,
          ...analysisParams
        });
        const profileData = JSON.parse(profileResult.content[0].text);
        
        // Convert to tabular format
        const headers = ['Column', 'Type', 'Count', 'Unique', 'Missing', 'Missing%'];
        const rows = profileData.columns.map((col: any) => [
          col.name,
          col.type,
          col.count,
          col.unique,
          col.missing,
          col.missingPercentage
        ]);
        
        exportData = [headers, ...rows];
        break;
      }
      
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
    
    // Write the analysis results to file
    await this.writeFile({
      filePath: outputFile,
      data: exportData.slice(1), // Remove headers
      headers: exportData[0] // Use first row as headers
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysisType,
            sourceFile,
            outputFile,
            rowsExported: exportData.length,
          }, null, 2),
        },
      ],
    };
  }

  // AI-Powered Methods
  private async evaluateFormula(args: any) {
    const { formula, context = {} } = args;
    
    try {
      // Parse the formula
      const ast = parseFormula(formula);
      
      // Create a workbook context from the provided context
      const workbookContext: WorkbookContext = {
        getCellValue: (reference: string) => {
          return context[reference] || 0;
        },
        getNamedRangeValue: (name: string) => {
          return context[name] || 0;
        },
        getRangeValues: (range: string) => {
          // Simple implementation - can be enhanced
          return context[range] || [];
        }
      };
      
      // Evaluate the formula
      const result = this.formulaEvaluator.evaluate(ast, workbookContext);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              formula,
              result,
              success: true
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              formula,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            }, null, 2),
          },
        ],
      };
    }
  }

  private async parseNaturalLanguage(args: any) {
    const { query, filePath, provider } = args;
    
    try {
      // Get file context if provided
      let context = undefined;
      if (filePath) {
        try {
          const data = await this.readFileContent(filePath);
          context = {
            headers: data[0],
            rowCount: data.length,
            columnCount: data[0]?.length || 0,
            dataTypes: this.detectDataTypes(data),
            activeCell: 'A1',
            selectedRange: 'A1:A1'
          };
        } catch (error) {
          // File context is optional, continue without it
        }
      }
      
      // Parse the natural language query
      const result = await this.nlpProcessor.parseCommand(query, context, provider);
      
      // If it's a formula, also try to build the actual formula
      if (result.type === 'formula') {
        try {
          const formulaResult = await this.nlpProcessor.buildFormula(query, context, provider);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query,
                  command: result,
                  formula: formulaResult,
                  success: true,
                  provider: this.nlpProcessor.getActiveProvider()?.name || 'Local'
                }, null, 2),
              },
            ],
          };
        } catch (formulaError) {
          // Fallback to just the command result
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              result,
              success: true,
              provider: this.nlpProcessor.getActiveProvider()?.name || 'Local'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            }, null, 2),
          },
        ],
      };
    }
  }

  private async explainFormula(args: any) {
    const { formula, provider } = args;
    
    try {
      const explanation = await this.nlpProcessor.explainFormula(formula, provider);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              formula,
              explanation,
              success: true,
              provider: this.nlpProcessor.getActiveProvider()?.name || 'Local'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              formula,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getAIProviderStatus(args: any) {
    try {
      const providers = this.nlpProcessor.getAvailableProviders();
      const activeProvider = this.nlpProcessor.getActiveProvider();
      const healthStatus = await this.nlpProcessor.testProviders();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              activeProvider,
              availableProviders: providers,
              healthStatus,
              success: true
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            }, null, 2),
          },
        ],
      };
    }
  }

  private async smartDataAnalysis(args: any) {
    const { filePath, sheet, provider } = args;
    
    try {
      // Read the file
      const data = await this.readFileContent(filePath, sheet);
      
      if (data.length === 0) {
        throw new Error('File is empty');
      }
      
      // Create context for AI analysis
      const context = {
        headers: data[0],
        rowCount: data.length,
        columnCount: data[0]?.length || 0,
        dataTypes: this.detectDataTypes(data),
        sampleData: data.slice(0, 6), // First 5 data rows + header
        activeCell: 'A1',
        selectedRange: 'A1:A1'
      };
      
      // Generate AI suggestions
      const suggestions = await this.nlpProcessor.suggestFormulas(context);
      
      // Get data profile for additional insights
      const profile = await this.dataProfile({ filePath, sheet });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              filePath,
              context: {
                headers: context.headers,
                rowCount: context.rowCount,
                columnCount: context.columnCount,
                dataTypes: context.dataTypes
              },
              aiSuggestions: suggestions,
              dataProfile: JSON.parse(profile.content[0].text),
              success: true,
              provider: this.nlpProcessor.getActiveProvider()?.name || 'Local'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            }, null, 2),
          },
        ],
      };
    }
  }

  private detectDataTypes(data: any[][]): Record<string, 'number' | 'text' | 'date' | 'formula'> {
    if (data.length < 2) return {};
    
    const headers = data[0];
    const types: Record<string, 'number' | 'text' | 'date' | 'formula'> = {};
    
    for (let col = 0; col < headers.length; col++) {
      const columnData = data.slice(1).map(row => row[col]).filter(val => val != null && val !== '');
      
      if (columnData.length === 0) {
        types[headers[col]] = 'text';
        continue;
      }
      
      // Check if all values are numbers
      const numericCount = columnData.filter(val => !isNaN(Number(val))).length;
      const dateCount = columnData.filter(val => !isNaN(Date.parse(val))).length;
      
      if (numericCount === columnData.length) {
        types[headers[col]] = 'number';
      } else if (dateCount === columnData.length) {
        types[headers[col]] = 'date';
      } else {
        types[headers[col]] = 'text';
      }
    }
    
    return types;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // console.error('Excel/CSV MCP server running on stdio');
  }
}

const server = new ExcelCSVServer();
server.run().catch(console.error);