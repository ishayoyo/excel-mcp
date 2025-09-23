#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Handler imports
import { DataOperationsHandler } from './handlers/data-operations';
import { AnalyticsHandler } from './handlers/analytics';
import { FileOperationsHandler } from './handlers/file-operations';
import { AIOperationsHandler } from './handlers/ai-operations';
import { FinancialAnalysisHandler } from './handlers/financial-analysis';

// Other imports for existing functionality
import { BulkOperations } from './bulk/bulk-operations';
import { ValidationEngine } from './validation/core/validation-engine';

class ExcelCSVServer {
  private server: Server;

  // Handler instances
  private dataOpsHandler: DataOperationsHandler;
  private analyticsHandler: AnalyticsHandler;
  private fileOpsHandler: FileOperationsHandler;
  private aiOpsHandler: AIOperationsHandler;
  private financialHandler: FinancialAnalysisHandler;

  // Legacy instances (to be refactored later)
  private bulkOperations: BulkOperations;
  private validationEngine: ValidationEngine;

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

    // Initialize handlers
    this.dataOpsHandler = new DataOperationsHandler();
    this.analyticsHandler = new AnalyticsHandler();
    this.fileOpsHandler = new FileOperationsHandler();
    this.aiOpsHandler = new AIOperationsHandler();
    this.financialHandler = new FinancialAnalysisHandler();

    // Initialize legacy components
    this.bulkOperations = new BulkOperations();
    this.validationEngine = new ValidationEngine();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Basic Data Tools
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

        // Analytics Tools
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

        // Financial Analysis Tools (CFO-Level)
        {
          name: 'dcf_analysis',
          description: 'Perform Discounted Cash Flow (DCF) valuation analysis for investment evaluation',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file with cash flow data'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              assumptions: {
                type: 'object',
                description: 'DCF assumptions (optional)',
                properties: {
                  initialInvestment: { type: 'number', description: 'Initial investment amount (negative)' },
                  growthRate: { type: 'number', description: 'Annual growth rate (0.15 = 15%)' },
                  discountRate: { type: 'number', description: 'Discount rate/WACC (0.12 = 12%)' },
                  terminalMultiple: { type: 'number', description: 'Terminal value multiple (8x)' },
                  projectionYears: { type: 'number', description: 'Number of projection years' }
                }
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'budget_variance_analysis',
          description: 'Analyze budget vs actual performance with variance calculations',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file with budget and actual data'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              actualColumn: {
                type: 'string',
                description: 'Column name or index containing actual values'
              },
              budgetColumn: {
                type: 'string',
                description: 'Column name or index containing budget values'
              }
            },
            required: ['filePath', 'actualColumn', 'budgetColumn']
          }
        },
        {
          name: 'ratio_analysis',
          description: 'Perform comprehensive financial ratio analysis with industry benchmarks',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file with financial statement data'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'scenario_modeling',
          description: 'Perform what-if scenario analysis with multiple assumptions',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file with base data'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              scenarios: {
                type: 'array',
                description: 'Array of scenario definitions',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Scenario name' },
                    assumptions: {
                      type: 'object',
                      description: 'Key-value pairs of assumption changes',
                      additionalProperties: { type: 'number' }
                    }
                  },
                  required: ['name', 'assumptions']
                }
              }
            },
            required: ['filePath', 'scenarios']
          }
        },
        {
          name: 'trend_analysis',
          description: 'Analyze time series trends, growth rates, seasonality, and forecasting for sales and performance data',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the CSV or Excel file with time series data'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              dateColumn: {
                type: 'string',
                description: 'Column name or index containing date/time values'
              },
              valueColumn: {
                type: 'string',
                description: 'Column name or index containing numeric values to analyze'
              },
              periods: {
                type: 'number',
                description: 'Number of future periods to forecast (default: 12)',
                default: 12
              }
            },
            required: ['filePath', 'dateColumn', 'valueColumn']
          }
        },

        // File Operations Tools
        {
          name: 'write_file',
          description: 'Write data to a new CSV or Excel file (supports multiple sheets for Excel)',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path for the new file (must end with .csv, .xlsx, or .xls)',
              },
              data: {
                type: 'array',
                description: 'Array of arrays representing rows of data (single sheet mode)',
                items: {
                  type: 'array',
                },
              },
              headers: {
                type: 'array',
                description: 'Optional headers for the first row (single sheet mode)',
                items: {
                  type: 'string',
                },
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (single sheet mode, defaults to "Sheet1")',
              },
              sheets: {
                type: 'array',
                description: 'Array of sheet objects for multi-sheet Excel files',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Sheet name',
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
                  },
                  required: ['name', 'data'],
                },
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'add_sheet',
          description: 'Add a new sheet to an existing Excel file',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the existing Excel file (.xlsx or .xls)',
              },
              sheetName: {
                type: 'string',
                description: 'Name for the new sheet',
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
              position: {
                type: 'number',
                description: 'Position to insert the sheet (0-based index, optional)',
              },
            },
            required: ['filePath', 'sheetName', 'data'],
          },
        },
        {
          name: 'write_multi_sheet',
          description: 'Create a complex Excel file with multiple sheets, formulas, and inter-sheet references',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path for the new Excel file (must end with .xlsx or .xls)',
              },
              sheets: {
                type: 'array',
                description: 'Array of sheet definitions',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Sheet name',
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
                    formulas: {
                      type: 'array',
                      description: 'Array of formula definitions',
                      items: {
                        type: 'object',
                        properties: {
                          cell: {
                            type: 'string',
                            description: 'Cell address in A1 notation (e.g., "A1", "B5")',
                          },
                          formula: {
                            type: 'string',
                            description: 'Excel formula (e.g., "=SUM(A1:A10)", "=Sheet1!A1+Sheet2!B2")',
                          },
                        },
                        required: ['cell', 'formula'],
                      },
                    },
                  },
                  required: ['name', 'data'],
                },
              },
              sheetReferences: {
                type: 'boolean',
                description: 'Enable inter-sheet formula references (default: true)',
              },
            },
            required: ['filePath', 'sheets'],
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
        {
          name: 'format_cells',
          description: 'Apply formatting to Excel cells (fonts, colors, borders, alignment)',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the Excel file (.xlsx or .xls)',
              },
              range: {
                type: 'string',
                description: 'Cell range in A1 notation (e.g., "A1", "A1:C5", "B2:D10")',
              },
              styling: {
                type: 'object',
                description: 'Formatting options to apply',
                properties: {
                  font: {
                    type: 'object',
                    description: 'Font styling options',
                    properties: {
                      bold: { type: 'boolean', description: 'Make text bold' },
                      italic: { type: 'boolean', description: 'Make text italic' },
                      underline: { type: 'boolean', description: 'Underline text' },
                      size: { type: 'number', description: 'Font size (e.g., 12, 14, 16)' },
                      color: { type: 'string', description: 'Font color in ARGB format (e.g., "FFFF0000" for red)' },
                      name: { type: 'string', description: 'Font name (e.g., "Arial", "Times New Roman")' }
                    }
                  },
                  fill: {
                    type: 'object',
                    description: 'Background fill options',
                    properties: {
                      color: { type: 'string', description: 'Background color in ARGB format (e.g., "FFFFFF00" for yellow)' },
                      pattern: { type: 'string', description: 'Fill pattern (default: "solid")' }
                    }
                  },
                  border: {
                    type: 'object',
                    description: 'Border styling options',
                    properties: {
                      style: { type: 'string', description: 'Border style: thin, medium, thick, dotted, dashed' },
                      color: { type: 'string', description: 'Border color in ARGB format (e.g., "FF000000" for black)' },
                      top: { type: 'boolean', description: 'Apply border to top (default: true)' },
                      bottom: { type: 'boolean', description: 'Apply border to bottom (default: true)' },
                      left: { type: 'boolean', description: 'Apply border to left (default: true)' },
                      right: { type: 'boolean', description: 'Apply border to right (default: true)' }
                    }
                  },
                  alignment: {
                    type: 'object',
                    description: 'Text alignment options',
                    properties: {
                      horizontal: { type: 'string', description: 'Horizontal alignment: left, center, right, justify' },
                      vertical: { type: 'string', description: 'Vertical alignment: top, middle, bottom' },
                      wrapText: { type: 'boolean', description: 'Wrap text within cell' },
                      textRotation: { type: 'number', description: 'Text rotation angle in degrees' }
                    }
                  },
                  numberFormat: {
                    type: 'string',
                    description: 'Number format (e.g., "$#,##0.00", "0.00%", "mm/dd/yyyy")'
                  }
                }
              },
              sheet: {
                type: 'string',
                description: 'Sheet name (optional, defaults to first sheet)',
              },
            },
            required: ['filePath', 'range', 'styling'],
          },
        },
        {
          name: 'auto_fit_columns',
          description: 'Automatically adjust column widths to fit content in Excel files',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the Excel file (.xlsx or .xls)',
              },
              sheet: {
                type: 'string',
                description: 'Sheet name (optional, defaults to all sheets)',
              },
              columns: {
                type: 'array',
                description: 'Specific columns to auto-fit (optional, defaults to all columns). Can be column letters (e.g., ["A", "B"]) or numbers (e.g., [1, 2])',
                items: {
                  oneOf: [
                    { type: 'string', description: 'Column letter (e.g., "A", "B", "C")' },
                    { type: 'number', description: 'Column number (1-based, e.g., 1, 2, 3)' }
                  ]
                }
              },
              minWidth: {
                type: 'number',
                description: 'Minimum column width (default: 10)',
                default: 10
              },
              maxWidth: {
                type: 'number',
                description: 'Maximum column width (default: 60)',
                default: 60
              },
              padding: {
                type: 'number',
                description: 'Extra padding to add to calculated width (default: 2)',
                default: 2
              }
            },
            required: ['filePath'],
          },
        },

        // AI-Powered Tools
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

        // Validation Tools (legacy - to be refactored)
        {
          name: 'validate_data_consistency',
          description: 'Cross-validate data integrity across related files',
          inputSchema: {
            type: 'object',
            properties: {
              primaryFile: {
                type: 'string',
                description: 'Path to the primary data file to validate'
              },
              referenceFiles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of reference file paths for validation'
              },
              validationRules: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['referential_integrity', 'data_completeness', 'value_ranges']
                },
                description: 'Specific validation rules to apply (optional, defaults to all)'
              },
              keyColumns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific columns to validate for referential integrity (optional)'
              },
              autoDetectRelationships: {
                type: 'boolean',
                description: 'Automatically detect column relationships (default: true)'
              },
              tolerance: {
                type: 'number',
                description: 'Tolerance for numeric validations (default: 0.01)'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              reportFormat: {
                type: 'string',
                enum: ['summary', 'detailed'],
                description: 'Format of validation report (default: detailed)'
              }
            },
            required: ['primaryFile', 'referenceFiles']
          }
        },

        // Bulk Operations Tools (legacy - to be refactored)
        {
          name: 'bulk_aggregate_multi_files',
          description: 'Aggregate same column across multiple files in parallel',
          inputSchema: {
            type: 'object',
            properties: {
              filePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of file paths to process'
              },
              column: {
                type: 'string',
                description: 'Column name or index (0-based) to aggregate'
              },
              operation: {
                type: 'string',
                enum: ['sum', 'average', 'count', 'min', 'max'],
                description: 'Aggregation operation'
              },
              consolidate: {
                type: 'boolean',
                description: 'Whether to return consolidated result or per-file breakdown (default: true)'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              },
              filters: {
                type: 'array',
                description: 'Optional filters to apply before aggregation',
                items: {
                  type: 'object',
                  properties: {
                    column: { type: 'string' },
                    condition: {
                      type: 'string',
                      enum: ['equals', 'contains', 'greater_than', 'less_than', 'not_equals']
                    },
                    value: { type: ['string', 'number'] }
                  },
                  required: ['column', 'condition', 'value']
                }
              }
            },
            required: ['filePaths', 'column', 'operation']
          }
        },
        {
          name: 'bulk_filter_multi_files',
          description: 'Filter data across multiple files with optional export',
          inputSchema: {
            type: 'object',
            properties: {
              filePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of file paths to process'
              },
              filters: {
                type: 'array',
                description: 'Filters to apply to the data',
                items: {
                  type: 'object',
                  properties: {
                    column: { type: 'string' },
                    condition: {
                      type: 'string',
                      enum: ['equals', 'contains', 'greater_than', 'less_than', 'not_equals']
                    },
                    value: { type: ['string', 'number'] }
                  },
                  required: ['column', 'condition', 'value']
                }
              },
              outputMode: {
                type: 'string',
                enum: ['count', 'export', 'summary'],
                description: 'How to return results: count only, export to file, or summary with counts'
              },
              outputPath: {
                type: 'string',
                description: 'Output file path (required when outputMode is "export")'
              },
              sheet: {
                type: 'string',
                description: 'Sheet name for Excel files (optional)'
              }
            },
            required: ['filePaths', 'filters', 'outputMode']
          }
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        const toolArgs = args || {};

        switch (name) {
          // Data Operations
          case 'read_file':
            return await this.dataOpsHandler.readFile(toolArgs);
          case 'get_cell':
            return await this.dataOpsHandler.getCell(toolArgs);
          case 'get_range':
            return await this.dataOpsHandler.getRange(toolArgs);
          case 'get_headers':
            return await this.dataOpsHandler.getHeaders(toolArgs);
          case 'search':
            return await this.dataOpsHandler.search(toolArgs);
          case 'filter_rows':
            return await this.dataOpsHandler.filterRows(toolArgs);
          case 'aggregate':
            return await this.dataOpsHandler.aggregate(toolArgs);

          // Analytics
          case 'statistical_analysis':
            return await this.analyticsHandler.statisticalAnalysis(toolArgs);
          case 'correlation_analysis':
            return await this.analyticsHandler.correlationAnalysis(toolArgs);
          case 'data_profile':
            return await this.analyticsHandler.dataProfile(toolArgs);
          case 'pivot_table':
            return await this.analyticsHandler.pivotTable(toolArgs);

          // Financial Analysis (CFO-Level)
          case 'dcf_analysis':
            return await this.financialHandler.dcfAnalysis(toolArgs);
          case 'budget_variance_analysis':
            return await this.financialHandler.budgetVarianceAnalysis(toolArgs);
          case 'ratio_analysis':
            return await this.financialHandler.ratioAnalysis(toolArgs);
          case 'scenario_modeling':
            return await this.financialHandler.scenarioModeling(toolArgs);
          case 'trend_analysis':
            return await this.financialHandler.trendAnalysis(toolArgs);

          // File Operations
          case 'write_file':
            return await this.fileOpsHandler.writeFile(toolArgs);
          case 'add_sheet':
            return await this.fileOpsHandler.addSheet(toolArgs);
          case 'write_multi_sheet':
            return await this.fileOpsHandler.writeMultiSheet(toolArgs);
          case 'export_analysis':
            return await this.fileOpsHandler.exportAnalysis(toolArgs);
          case 'format_cells':
            return await this.fileOpsHandler.formatCells(toolArgs);
          case 'auto_fit_columns':
            return await this.fileOpsHandler.autoFitColumns(toolArgs);

          // AI-Powered Tools
          case 'evaluate_formula':
            return await this.aiOpsHandler.evaluateFormula(toolArgs);
          case 'parse_natural_language':
            return await this.aiOpsHandler.parseNaturalLanguage(toolArgs);
          case 'explain_formula':
            return await this.aiOpsHandler.explainFormula(toolArgs);
          case 'ai_provider_status':
            return await this.aiOpsHandler.getAIProviderStatus(toolArgs);
          case 'smart_data_analysis':
            return await this.aiOpsHandler.smartDataAnalysis(toolArgs);

          // Legacy bulk operations (to be refactored)
          case 'bulk_aggregate_multi_files':
            return await this.bulkAggregateMultiFiles(toolArgs);
          case 'bulk_filter_multi_files':
            return await this.bulkFilterMultiFiles(toolArgs);

          // Legacy validation (to be refactored)
          case 'validate_data_consistency':
            return await this.validateDataConsistency(toolArgs);

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

  // Legacy methods (to be moved to dedicated handlers later)
  private async bulkAggregateMultiFiles(args: any) {
    try {
      const result = await this.bulkOperations.aggregateMultiFiles({
        filePaths: args.filePaths,
        column: args.column,
        operation: args.operation,
        consolidate: args.consolidate !== false,
        sheet: args.sheet,
        filters: args.filters
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ...result
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
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'bulk_aggregate_multi_files'
            }, null, 2),
          },
        ],
      };
    }
  }

  private async bulkFilterMultiFiles(args: any) {
    try {
      if (args.outputMode === 'export' && !args.outputPath) {
        throw new Error('outputPath is required when outputMode is "export"');
      }

      const result = await this.bulkOperations.filterMultiFiles({
        filePaths: args.filePaths,
        filters: args.filters,
        outputMode: args.outputMode,
        outputPath: args.outputPath,
        sheet: args.sheet
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ...result
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
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'bulk_filter_multi_files'
            }, null, 2),
          },
        ],
      };
    }
  }

  private async validateDataConsistency(args: any) {
    try {
      const result = await this.validationEngine.validateDataConsistency(
        args.primaryFile,
        args.referenceFiles,
        {
          validationRules: args.validationRules,
          keyColumns: args.keyColumns,
          sheet: args.sheet,
          autoDetectRelationships: args.autoDetectRelationships,
          tolerance: args.tolerance
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              validation: {
                summary: result.summary,
                issues: result.issues,
                recommendations: result.recommendations
              },
              report: result.detailedReport
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
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'validate_data_consistency'
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new ExcelCSVServer();
server.run().catch(console.error);