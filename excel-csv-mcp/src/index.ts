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

interface CellAddress {
  row: number;
  col: number;
}

class ExcelCSVServer {
  private server: Server;

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

  private async readFileContent(filePath: string): Promise<any[][]> {
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
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    } else {
      throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
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

  private async readFile(args: any) {
    const { filePath } = args;
    const data = await this.readFileContent(filePath);
    
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
    const { filePath, cell } = args;
    const data = await this.readFileContent(filePath);
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
    const { filePath, startCell, endCell } = args;
    const data = await this.readFileContent(filePath);
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
    const { filePath } = args;
    const data = await this.readFileContent(filePath);
    
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
    const { filePath, searchValue, exact = false } = args;
    const data = await this.readFileContent(filePath);
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
    const { filePath, column, condition, value } = args;
    const data = await this.readFileContent(filePath);
    
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
    const { filePath, column, operation } = args;
    const data = await this.readFileContent(filePath);
    
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Excel/CSV MCP server running on stdio');
  }
}

const server = new ExcelCSVServer();
server.run().catch(console.error);