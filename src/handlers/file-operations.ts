import { ToolResponse, ToolArgs } from '../types/shared';
import { parseA1Notation } from '../utils/file-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csvStringify from 'csv-stringify/sync';
import * as XLSX from 'xlsx';

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

      const workbook = XLSX.utils.book_new();
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

        const worksheet = XLSX.utils.aoa_to_sheet(fullData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetData.name);

        totalRows += fullData.length;
        if (fullData.length > 0 && Array.isArray(fullData[0])) {
          totalColumns = Math.max(totalColumns, fullData[0].length || 0);
        }
      }

      XLSX.writeFile(workbook, absolutePath);

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
    const workbook = XLSX.readFile(absolutePath);

    // Check if sheet name already exists
    if (workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" already exists in the workbook`);
    }

    // Prepare data with headers if provided
    const fullData = headers ? [headers, ...data] : data;

    // Create new worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(fullData);

    // Add sheet at specified position or at the end
    if (position !== undefined && position >= 0 && position <= workbook.SheetNames.length) {
      // Insert at specific position
      workbook.SheetNames.splice(position, 0, sheetName);
      workbook.Sheets[sheetName] = worksheet;
    } else {
      // Append at the end
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Write the updated workbook
    XLSX.writeFile(workbook, absolutePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            sheetName,
            sheetCount: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames,
            rowsAdded: fullData.length,
            columnsAdded: fullData[0]?.length || 0,
            position: position !== undefined ? position : workbook.SheetNames.length - 1,
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

    const workbook = XLSX.utils.book_new();
    const sheetInfo: any[] = [];

    // First pass: Create all sheets with data
    for (const sheetDef of sheets) {
      const { name, data, headers, formulas } = sheetDef;

      // Prepare data with headers if provided
      const fullData = headers ? [headers, ...data] : data;

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(fullData);

      // Apply formulas if provided
      if (formulas && Array.isArray(formulas)) {
        for (const formulaDef of formulas) {
          const { cell, formula } = formulaDef;
          const cellAddr = parseA1Notation(cell);

          // Set formula in worksheet
          if (!worksheet[cell]) {
            worksheet[cell] = {};
          }
          worksheet[cell].f = formula;

          // If the formula starts with =, remove it for the stored formula
          const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula;
          worksheet[cell].f = cleanFormula;
        }
      }

      // Add sheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, name);

      sheetInfo.push({
        name,
        rowCount: fullData.length,
        columnCount: (fullData.length > 0 && fullData[0]) ? fullData[0].length : 0,
        formulaCount: formulas?.length || 0,
      });
    }

    // Update sheet ranges if needed
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        worksheet['!ref'] = XLSX.utils.encode_range(range);
      }
    }

    // Write the workbook
    XLSX.writeFile(workbook, absolutePath);

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
}