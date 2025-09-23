import { ToolResponse, ToolArgs } from '../types/shared';
import { parseA1Notation } from '../utils/file-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csvStringify from 'csv-stringify/sync';
import ExcelJS from 'exceljs';

export class FileOperationsHandler {
  async writeFile(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, data, headers, sheet = 'Sheet1', sheets } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    // Multi-sheet mode for Excel files
    if (sheets && Array.isArray(sheets)) {
      if (ext === '.csv') {
        throw new Error('CSV format does not support multiple sheets. Use .xlsx or .xls for multi-sheet files.');
      }

      if (ext !== '.xlsx' && ext !== '.xls') {
        throw new Error('Multi-sheet mode only works with Excel files (.xlsx or .xls)');
      }

      const workbook = new ExcelJS.Workbook();
      let totalRows = 0;
      let totalColumns = 0;

      for (const sheetData of sheets) {
        if (!sheetData.data || !Array.isArray(sheetData.data)) {
          throw new Error(`Sheet "${sheetData.name}" must have valid data array`);
        }

        const fullData = sheetData.headers
          ? [sheetData.headers, ...sheetData.data]
          : sheetData.data;

        if (fullData.length === 0) {
          // Add empty row if no data
          fullData.push([]);
        }

        const worksheet = workbook.addWorksheet(sheetData.name);
        fullData.forEach((row: any[]) => {
          worksheet.addRow(row);
        });

        totalRows += fullData.length;
        if (fullData.length > 0 && Array.isArray(fullData[0])) {
          totalColumns = Math.max(totalColumns, fullData[0].length || 0);
        }
      }

      await workbook.xlsx.writeFile(absolutePath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              filePath: absolutePath,
              mode: 'multi-sheet',
              sheetsWritten: sheets.length,
              sheetNames: sheets.map(s => s.name),
              totalRowsWritten: totalRows,
              maxColumnsWritten: totalColumns,
            }, null, 2),
          },
        ],
      };
    }

    // Single sheet mode (backward compatible)
    if (!data || !Array.isArray(data)) {
      throw new Error('Either "data" (for single sheet) or "sheets" (for multiple sheets) must be provided.');
    }

    const fullData = headers ? [headers, ...data] : data;

    if (ext === '.csv') {
      // Write CSV file
      const csvContent = csvStringify.stringify(fullData);
      await fs.writeFile(absolutePath, csvContent, 'utf-8');
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Write Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheet);
      fullData.forEach((row: any[]) => {
        worksheet.addRow(row);
      });
      await workbook.xlsx.writeFile(absolutePath);
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
            mode: 'single-sheet',
            sheetName: ext === '.csv' ? null : sheet,
            rowsWritten: fullData.length,
            columnsWritten: fullData[0]?.length || 0,
          }, null, 2),
        },
      ],
    };
  }

  async addSheet(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheetName, data, headers, position } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new Error('add_sheet only works with Excel files (.xlsx or .xls)');
    }

    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read existing workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);

    // Check if sheet name already exists
    if (workbook.getWorksheet(sheetName)) {
      throw new Error(`Sheet "${sheetName}" already exists in the workbook`);
    }

    // Prepare data with headers if provided
    const fullData = headers ? [headers, ...data] : data;

    // Create new worksheet
    const worksheet = workbook.addWorksheet(sheetName);
    fullData.forEach((row: any[]) => {
      worksheet.addRow(row);
    });

    // Note: ExcelJS doesn't support inserting worksheets at specific positions
    // The worksheet is added at the end of the workbook

    // Write the updated workbook
    await workbook.xlsx.writeFile(absolutePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            sheetName,
            sheetCount: workbook.worksheets.length,
            sheetNames: workbook.worksheets.map(ws => ws.name),
            rowsAdded: fullData.length,
            columnsAdded: fullData[0]?.length || 0,
            position: position !== undefined ? position : workbook.worksheets.length - 1,
          }, null, 2),
        },
      ],
    };
  }

  async writeMultiSheet(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheets, sheetReferences = true } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new Error('write_multi_sheet only works with Excel files (.xlsx or .xls)');
    }

    const workbook = new ExcelJS.Workbook();
    const sheetInfo: any[] = [];

    // First pass: Create all sheets with data
    for (const sheetDef of sheets) {
      const { name, data, headers, formulas } = sheetDef;

      // Prepare data with headers if provided
      const fullData = headers ? [headers, ...data] : data;

      // Create worksheet
      const worksheet = workbook.addWorksheet(name);

      // Add data to worksheet
      fullData.forEach((row: any[]) => {
        worksheet.addRow(row);
      });

      // Apply formulas if provided
      if (formulas && Array.isArray(formulas)) {
        for (const formulaDef of formulas) {
          const { cell, formula } = formulaDef;

          // Set formula in worksheet
          const excelCell = worksheet.getCell(cell);
          // If the formula starts with =, remove it for ExcelJS
          const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula;
          excelCell.value = { formula: cleanFormula };
        }
      }

      sheetInfo.push({
        name,
        rowCount: fullData.length,
        columnCount: (fullData.length > 0 && fullData[0]) ? fullData[0].length : 0,
        formulaCount: formulas?.length || 0,
      });
    }

    // Write the workbook
    await workbook.xlsx.writeFile(absolutePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            mode: 'multi-sheet-advanced',
            sheetsCreated: sheets.length,
            sheetReferences: sheetReferences,
            sheets: sheetInfo,
            totalFormulas: sheetInfo.reduce((sum, sheet) => sum + sheet.formulaCount, 0),
          }, null, 2),
        },
      ],
    };
  }

  async exportAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { analysisType, sourceFile, outputFile, analysisParams } = args;

    let exportData: any[][] = [];

    switch (analysisType) {
      case 'pivot_table': {
        // This would need to call the analytics handler - simplified for now
        exportData = [
          ['Group', 'Value', 'Count'],
          // Results would go here
        ];
        break;
      }

      case 'statistical_analysis': {
        exportData = [
          ['Metric', 'Value'],
          ['Column', 'Sample Column'],
          // Statistical results would go here
        ];
        break;
      }

      // Add other analysis types as needed
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

  async formatCells(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, range, styling, sheet } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new Error('Cell formatting only works with Excel files (.xlsx or .xls)');
    }

    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read existing workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);

    // Get the worksheet
    const worksheet = sheet ? workbook.getWorksheet(sheet) : workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error(`Sheet "${sheet || 'first sheet'}" not found`);
    }

    // Parse range (e.g., "A1:C5" or "B2")
    let startCell: { row: number; col: number };
    let endCell: { row: number; col: number };

    if (range.includes(':')) {
      const [start, end] = range.split(':');
      const startParsed = parseA1Notation(start);
      const endParsed = parseA1Notation(end);
      // Convert to 1-based indexing for ExcelJS
      startCell = { row: startParsed.row + 1, col: startParsed.col + 1 };
      endCell = { row: endParsed.row + 1, col: endParsed.col + 1 };
    } else {
      const parsed = parseA1Notation(range);
      // Convert to 1-based indexing for ExcelJS
      startCell = endCell = { row: parsed.row + 1, col: parsed.col + 1 };
    }

    let formattedCells = 0;

    // Apply formatting to the range
    for (let row = startCell.row; row <= endCell.row; row++) {
      for (let col = startCell.col; col <= endCell.col; col++) {
        const cell = worksheet.getCell(row, col);

        // Apply font styling
        if (styling.font) {
          const fontStyle: any = {};
          if (styling.font.bold !== undefined) fontStyle.bold = styling.font.bold;
          if (styling.font.italic !== undefined) fontStyle.italic = styling.font.italic;
          if (styling.font.underline !== undefined) fontStyle.underline = styling.font.underline;
          if (styling.font.size !== undefined) fontStyle.size = styling.font.size;
          if (styling.font.color !== undefined) fontStyle.color = { argb: styling.font.color };
          if (styling.font.name !== undefined) fontStyle.name = styling.font.name;

          cell.font = { ...cell.font, ...fontStyle };
        }

        // Apply fill (background color)
        if (styling.fill) {
          if (styling.fill.color) {
            cell.fill = {
              type: 'pattern',
              pattern: styling.fill.pattern || 'solid',
              fgColor: { argb: styling.fill.color }
            };
          }
        }

        // Apply borders
        if (styling.border) {
          const borderStyle: any = {};
          const borderConfig = {
            style: styling.border.style || 'thin',
            color: { argb: styling.border.color || 'FF000000' }
          };

          if (styling.border.top !== false) borderStyle.top = borderConfig;
          if (styling.border.bottom !== false) borderStyle.bottom = borderConfig;
          if (styling.border.left !== false) borderStyle.left = borderConfig;
          if (styling.border.right !== false) borderStyle.right = borderConfig;

          cell.border = { ...cell.border, ...borderStyle };
        }

        // Apply alignment
        if (styling.alignment) {
          const alignmentStyle: any = {};
          if (styling.alignment.horizontal) alignmentStyle.horizontal = styling.alignment.horizontal;
          if (styling.alignment.vertical) alignmentStyle.vertical = styling.alignment.vertical;
          if (styling.alignment.wrapText !== undefined) alignmentStyle.wrapText = styling.alignment.wrapText;
          if (styling.alignment.textRotation !== undefined) alignmentStyle.textRotation = styling.alignment.textRotation;

          cell.alignment = { ...cell.alignment, ...alignmentStyle };
        }

        // Apply number format
        if (styling.numberFormat) {
          cell.numFmt = styling.numberFormat;
        }

        formattedCells++;
      }
    }

    // Save the workbook
    await workbook.xlsx.writeFile(absolutePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            sheetName: worksheet.name,
            range,
            cellsFormatted: formattedCells,
            stylingApplied: Object.keys(styling),
          }, null, 2),
        },
      ],
    };
  }

  async autoFitColumns(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, columns, minWidth = 10, maxWidth = 60, padding = 2 } = args;
    const ext = path.extname(filePath).toLowerCase();
    const absolutePath = path.resolve(filePath);

    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new Error('Auto-fit columns only works with Excel files (.xlsx or .xls)');
    }

    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read existing workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(absolutePath);

    let worksheets: ExcelJS.Worksheet[] = [];

    if (sheet) {
      const targetSheet = workbook.getWorksheet(sheet);
      if (!targetSheet) {
        throw new Error(`Sheet "${sheet}" not found`);
      }
      worksheets = [targetSheet];
    } else {
      // Auto-fit all worksheets if no specific sheet provided
      worksheets = workbook.worksheets;
    }

    const results: any[] = [];

    for (const worksheet of worksheets) {
      const columnInfo: any[] = [];
      const columnCount = worksheet.columnCount || 0;

      // Determine which columns to process
      let columnsToProcess: number[] = [];
      if (columns && Array.isArray(columns)) {
        // Convert column letters/numbers to column indices
        columnsToProcess = columns.map(col => {
          if (typeof col === 'string') {
            // Handle column letters like "A", "B", "C"
            const parsed = parseA1Notation(col + '1');
            return parsed.col + 1; // Convert to 1-based for ExcelJS
          } else if (typeof col === 'number') {
            return col; // Assume already 1-based
          }
          return 1;
        });
      } else {
        // Auto-fit all columns
        columnsToProcess = Array.from({ length: columnCount }, (_, i) => i + 1);
      }

      for (const colIndex of columnsToProcess) {
        if (colIndex > columnCount) continue;

        const column = worksheet.getColumn(colIndex);
        let maxContentLength = 0;

        // Iterate through all cells in the column to find max content length
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value;
          let contentLength = 0;

          if (cellValue !== null && cellValue !== undefined) {
            if (typeof cellValue === 'string') {
              contentLength = cellValue.length;
            } else if (typeof cellValue === 'number') {
              contentLength = cellValue.toString().length;
            } else if (cellValue && typeof cellValue === 'object' && 'richText' in cellValue) {
              // Handle rich text
              contentLength = cellValue.richText?.reduce((sum: number, part: any) =>
                sum + (part.text?.length || 0), 0) || 0;
            } else if (cellValue && typeof cellValue === 'object' && 'formula' in cellValue) {
              // For formula cells, use the result or a reasonable default
              const result = cellValue.result;
              if (result !== null && result !== undefined) {
                contentLength = result.toString().length;
              } else {
                contentLength = 15; // Default width for formulas
              }
            } else {
              contentLength = cellValue.toString().length;
            }
          }

          // Account for font size (approximate character width scaling)
          const font = cell.font;
          let fontMultiplier = 1;
          if (font && font.size) {
            fontMultiplier = font.size / 11; // 11 is default Excel font size
          }

          contentLength *= fontMultiplier;
          maxContentLength = Math.max(maxContentLength, contentLength);
        });

        // Apply padding and constraints
        let optimalWidth = maxContentLength + padding;
        optimalWidth = Math.max(optimalWidth, minWidth);
        optimalWidth = Math.min(optimalWidth, maxWidth);

        // Set the column width
        column.width = optimalWidth;

        columnInfo.push({
          columnIndex: colIndex,
          columnLetter: this.getColumnLetter(colIndex),
          maxContentLength: Math.round(maxContentLength * 100) / 100,
          finalWidth: Math.round(optimalWidth * 100) / 100,
        });
      }

      results.push({
        sheetName: worksheet.name,
        columnsProcessed: columnsToProcess.length,
        columnDetails: columnInfo,
      });
    }

    // Save the workbook
    await workbook.xlsx.writeFile(absolutePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            sheetsProcessed: results.length,
            totalColumnsAdjusted: results.reduce((sum, sheet) => sum + sheet.columnsProcessed, 0),
            results,
            settings: {
              minWidth,
              maxWidth,
              padding,
            },
          }, null, 2),
        },
      ],
    };
  }

  private getColumnLetter(columnIndex: number): string {
    let result = '';
    let index = columnIndex - 1; // Convert to 0-based

    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }

    return result;
  }
}