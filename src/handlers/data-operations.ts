import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent, readFileContentWithWarnings, parseA1Notation } from '../utils/file-utils';

export class DataOperationsHandler {
  async readFile(args: ToolArgs): Promise<ToolResponse> {
    try {
      if (!args.filePath) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Missing required parameter: filePath',
              }, null, 2),
            },
          ],
        };
      }

      const { filePath, sheet } = args;
      const result = await readFileContentWithWarnings(filePath, sheet);

      // Extract headers (first row)
      const headers = result.data.length > 0 ? result.data[0] : [];

      const response: any = {
        success: true,
        data: result.data,
        rowCount: result.data.length,
        columnCount: result.data[0]?.length || 0,
        headers: headers,
      };

      // Include warnings if they exist
      if (result.warnings) {
        response.warnings = result.warnings;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async getCell(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, cell, sheet } = args;
      const data = await readFileContent(filePath, sheet);

      if (!cell || typeof cell !== 'string') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Invalid cell reference',
              }, null, 2),
            },
          ],
        };
      }

      const { row, col } = parseA1Notation(cell);

      if (row >= data.length || col >= (data[0]?.length || 0)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Cell ${cell} is out of range`,
              }, null, 2),
            },
          ],
        };
      }

      const value = data[row][col];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              cellValue: value,
              cellAddress: cell,
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async getRange(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, startCell, endCell, sheet } = args;
      const data = await readFileContent(filePath, sheet);
      const start = parseA1Notation(startCell);
      const end = parseA1Notation(endCell);

      // Validate range
      if (start.row > end.row || start.col > end.col) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Invalid range: start cell must be before end cell',
              }, null, 2),
            },
          ],
        };
      }

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
              success: true,
              range: `${startCell}:${endCell}`,
              data: rangeData,
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async getHeaders(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, sheet } = args;
      const data = await readFileContent(filePath, sheet);

      if (data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'File is empty',
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              headers: data[0],
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async search(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, searchValue, exact = false, sheet } = args;
      const data = await readFileContent(filePath, sheet);
      const matches = [];

      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < (data[row]?.length || 0); col++) {
          const cellValue = String(data[row][col]);
          const isMatch = exact
            ? cellValue === searchValue
            : cellValue.toLowerCase().includes(searchValue.toLowerCase());

          if (isMatch) {
            const colLetter = String.fromCharCode(65 + (col % 26));
            matches.push({
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
              success: true,
              searchValue,
              found: matches.length,
              matches,
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async filterRows(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, column, condition, value, sheet } = args;
      const data = await readFileContent(filePath, sheet);

      if (data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'File is empty',
              }, null, 2),
            },
          ],
        };
      }

      const colIndex = isNaN(Number(column))
        ? data[0].indexOf(column)
        : Number(column);

      if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Column "${column}" not found`,
              }, null, 2),
            },
          ],
        };
      }

      const headers = data[0];
      const filteredRows = [];

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
              success: true,
              totalRows: data.length - 1,
              filteredRows: filteredRows.length,
              filteredData: filteredRows,
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }

  async aggregate(args: ToolArgs): Promise<ToolResponse> {
    try {
      const { filePath, column, operation, sheet } = args;
      const data = await readFileContent(filePath, sheet);

      if (data.length <= 1) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'File has no data rows',
              }, null, 2),
            },
          ],
        };
      }

      const colIndex = isNaN(Number(column))
        ? data[0].indexOf(column)
        : Number(column);

      if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Column "${column}" not found`,
              }, null, 2),
            },
          ],
        };
      }

      const numericValues = [];
      const nonNullValues = [];

      for (let i = 1; i < data.length; i++) {
        const cellValue = data[i][colIndex];
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          nonNullValues.push(cellValue);
          const numVal = Number(cellValue);
          if (!isNaN(numVal)) {
            numericValues.push(numVal);
          }
        }
      }

      // Check if operation requires numeric data but no numeric values found
      if (['sum', 'average', 'min', 'max'].includes(operation) && numericValues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Column contains no numeric values for numeric operation',
              }, null, 2),
            },
          ],
        };
      }

      // Check for mixed data types when doing numeric operations
      if (['sum', 'average', 'min', 'max'].includes(operation) &&
          numericValues.length > 0 &&
          numericValues.length < nonNullValues.length) {
        const mixedCount = nonNullValues.length - numericValues.length;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Column contains mixed data types: ${mixedCount} non-numeric values found among ${nonNullValues.length} total values`,
              }, null, 2),
            },
          ],
        };
      }

      let result;
      switch (operation) {
        case 'sum':
          result = numericValues.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          result = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
          break;
        case 'count':
          result = nonNullValues.length;
          break;
        case 'min':
          result = numericValues.length > 0 ? Math.min(...numericValues) : null;
          break;
        case 'max':
          result = numericValues.length > 0 ? Math.max(...numericValues) : null;
          break;
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Unknown operation: ${operation}`,
                }, null, 2),
              },
            ],
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              column: data[0][colIndex],
              operation,
              result,
              validValues: operation === 'count' ? nonNullValues.length : numericValues.length,
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
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }, null, 2),
          },
        ],
      };
    }
  }
}