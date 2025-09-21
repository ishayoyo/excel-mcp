import { ToolResponse, ToolArgs } from '../types/shared.js';
import { readFileContent, parseA1Notation } from '../utils/file-utils.js';

export class DataOperationsHandler {
  async readFile(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet } = args;
    const data = await readFileContent(filePath, sheet);

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

  async getCell(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, cell, sheet } = args;
    const data = await readFileContent(filePath, sheet);
    const { row, col } = parseA1Notation(cell);

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

  async getRange(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, startCell, endCell, sheet } = args;
    const data = await readFileContent(filePath, sheet);
    const start = parseA1Notation(startCell);
    const end = parseA1Notation(endCell);

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

  async getHeaders(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet } = args;
    const data = await readFileContent(filePath, sheet);

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

  async search(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, searchValue, exact = false, sheet } = args;
    const data = await readFileContent(filePath, sheet);
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

  async filterRows(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, column, condition, value, sheet } = args;
    const data = await readFileContent(filePath, sheet);

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

  async aggregate(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, column, operation, sheet } = args;
    const data = await readFileContent(filePath, sheet);

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
}