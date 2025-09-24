import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent, readFileContentWithWarnings, parseA1Notation, validateChunkBoundaries, calculateOptimalChunkSize, getFileInfo } from '../utils/file-utils';

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

      const { filePath, sheet, offset, limit } = args;
      const result = await readFileContentWithWarnings(filePath, sheet);

      // Store original data info for metadata
      const totalRows = result.data.length;
      const totalColumns = result.data[0]?.length || 0;
      const headers = totalRows > 0 ? result.data[0] : [];

      // Apply chunking if offset or limit are specified
      let chunkedData = result.data;
      let chunkMetadata = null;

      if (offset !== undefined || limit !== undefined) {
        const requestedOffset = offset || 0;
        const requestedLimit = limit || (totalRows - requestedOffset);

        // Validate chunk boundaries
        const { validOffset, validLimit } = validateChunkBoundaries(result.data, requestedOffset, requestedLimit);

        const endRow = validOffset + validLimit;
        chunkedData = result.data.slice(validOffset, endRow);

        chunkMetadata = {
          offset: validOffset,
          limit: validLimit,
          totalRows,
          returnedRows: chunkedData.length,
          hasMore: endRow < totalRows,
          nextOffset: endRow < totalRows ? endRow : null,
          note: validOffset > 0 && totalRows > 0 ? "This chunk doesn't include headers. Consider including row 0 for headers." : undefined,
        };
      }

      const response: any = {
        success: true,
        data: chunkedData,
        rowCount: chunkedData.length,
        columnCount: totalColumns,
        headers: headers,
      };

      // Add chunk metadata if chunking was used
      if (chunkMetadata) {
        response.chunkInfo = chunkMetadata;
      }

      // Include warnings if they exist
      if (result.warnings) {
        response.warnings = result.warnings;
      }

      // Add suggestion for large files
      if (!chunkMetadata && totalRows > 10000) {
        response.suggestion = `Large file detected (${totalRows} rows). Consider using offset/limit parameters for chunked reading to avoid token limits.`;
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

  async readFileChunked(args: ToolArgs): Promise<ToolResponse> {
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

      const { filePath, sheet, chunkIndex = 0, chunkSize } = args;
      const result = await readFileContentWithWarnings(filePath, sheet);

      const totalRows = result.data.length;
      const totalColumns = result.data[0]?.length || 0;

      // Calculate optimal chunk size if not provided
      const optimalChunkSize = chunkSize || calculateOptimalChunkSize(totalRows, totalColumns);

      // Calculate offset for requested chunk
      const offset = chunkIndex * optimalChunkSize;

      if (offset >= totalRows) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Chunk index ${chunkIndex} is out of range. File has ${Math.ceil(totalRows / optimalChunkSize)} chunks.`,
              }, null, 2),
            },
          ],
        };
      }

      // Validate and apply chunking
      const { validOffset, validLimit } = validateChunkBoundaries(result.data, offset, optimalChunkSize);
      const endRow = validOffset + validLimit;
      const chunkedData = result.data.slice(validOffset, endRow);

      // Include headers if this is the first chunk or if specifically requested
      let finalData = chunkedData;
      if (chunkIndex === 0 && totalRows > 0) {
        // First chunk already includes headers naturally
      } else if (chunkIndex > 0 && totalRows > 0) {
        // For subsequent chunks, optionally include headers as context
        finalData = [result.data[0], ...chunkedData.slice(validOffset === 0 ? 1 : 0)];
      }

      const totalChunks = Math.ceil(totalRows / optimalChunkSize);

      const response: any = {
        success: true,
        data: finalData,
        chunkInfo: {
          chunkIndex,
          chunkSize: optimalChunkSize,
          totalChunks,
          totalRows,
          totalColumns,
          currentChunkRows: chunkedData.length,
          hasNext: chunkIndex < totalChunks - 1,
          hasPrevious: chunkIndex > 0,
          nextChunkIndex: chunkIndex < totalChunks - 1 ? chunkIndex + 1 : null,
          previousChunkIndex: chunkIndex > 0 ? chunkIndex - 1 : null,
        },
        headers: totalRows > 0 ? result.data[0] : [],
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

  async getFileInfo(args: ToolArgs): Promise<ToolResponse> {
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
      const fileInfo = await getFileInfo(filePath, sheet);

      // Add additional recommendations based on file size
      let recommendations = [];

      if (fileInfo.estimatedTokens > 50000) {
        recommendations.push('Large file detected. Strongly recommend using chunked reading to avoid token limits.');
        recommendations.push(`Use read_file_chunked or read_file with offset/limit parameters.`);
      } else if (fileInfo.estimatedTokens > 20000) {
        recommendations.push('Medium-sized file. Consider chunked reading for better performance.');
      } else {
        recommendations.push('File size is manageable for direct reading.');
      }

      recommendations.push(`Recommended chunk size: ${fileInfo.recommendedChunkSize} rows per chunk.`);

      if (fileInfo.sheets && fileInfo.sheets.length > 1) {
        recommendations.push(`Excel file contains ${fileInfo.sheets.length} sheets. Specify 'sheet' parameter to read specific sheets.`);
      }

      const response = {
        success: true,
        fileInfo: {
          ...fileInfo,
          fileSizeMB: Math.round((fileInfo.fileSize / 1024 / 1024) * 100) / 100,
        },
        recommendations,
        chunkingAdvice: {
          useChunking: fileInfo.estimatedTokens > 20000,
          optimalChunkSize: fileInfo.recommendedChunkSize,
          estimatedChunks: Math.ceil(fileInfo.totalRows / fileInfo.recommendedChunkSize),
          maxTokensPerChunk: Math.ceil((fileInfo.recommendedChunkSize * fileInfo.totalColumns * 10) / 4),
        }
      };

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
}