import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent, detectDataTypes } from '../utils/file-utils';
import { NLPProcessor } from '../ai/nlp-processor';
import { parseFormula } from '../formula/parser';
import { FormulaEvaluator, WorkbookContext } from '../formula/evaluator';

export class AIOperationsHandler {
  private nlpProcessor: NLPProcessor;
  private formulaEvaluator: FormulaEvaluator;

  constructor() {
    this.nlpProcessor = new NLPProcessor();
    this.formulaEvaluator = new FormulaEvaluator();
  }

  /**
   * Expand a range reference into an array of values from individual cells
   */
  private expandRange(range: string, context: any): any[][] {
    // Simple range expansion for A1:A3 format
    const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!rangeMatch) {
      return [];
    }

    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startRowNum = parseInt(startRow);
    const endRowNum = parseInt(endRow);

    if (startCol !== endCol) {
      // For now, only handle single column ranges
      return [];
    }

    const result: any[][] = [];
    for (let row = startRowNum; row <= endRowNum; row++) {
      const cellRef = `${startCol}${row}`;
      const value = context[cellRef] || 0;
      result.push([value]);
    }

    return result;
  }

  async evaluateFormula(args: ToolArgs): Promise<ToolResponse> {
    const { formula, context = {} } = args;

    try {
      // Parse the formula
      const ast = parseFormula(formula);

      // Create a workbook context from the provided context
      const workbookContext: WorkbookContext = {
        getCellValue: (reference: string) => {
          const value = context[reference] || 0;

          // If the value is a formula, detect potential circular references
          if (typeof value === 'string' && value.startsWith('=')) {
            // This is a formula reference, check for circular references
            if (value === formula) {
              throw new Error('Circular reference detected');
            }
            // For formulas that reference the same cell, also check
            if (value.includes(reference)) {
              throw new Error('Circular reference detected');
            }
          }

          return value;
        },
        getNamedRangeValue: (name: string) => {
          return context[name] || 0;
        },
        getRangeValues: (range: string) => {
          // Check if range is already provided in context
          if (context[range]) {
            return context[range];
          }

          // Try to expand the range from individual cells
          const expanded = this.expandRange(range, context);
          return expanded;
        },
        getSheetCellValue: (sheetName: string, reference: string) => {
          // For sheet references, try to get from context using proper Excel sheet!reference format
          const key = `${sheetName}!${reference}`;
          return context[key] || context[reference] || 0;
        },
        getSheetRangeValues: (sheetName: string, range: string) => {
          // For sheet range references, try to get from context using proper Excel sheet!range format
          const key = `${sheetName}!${range}`;
          return context[key] || context[range] || [];
        }
      };

      // Evaluate the formula
      const result = this.formulaEvaluator.evaluate(ast, workbookContext);

      // Check if result is an error
      const isError = typeof result === 'string' && result.startsWith('#');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              formula,
              result,
              success: !isError,
              ...(isError && { error: result })
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

  async parseNaturalLanguage(args: ToolArgs): Promise<ToolResponse> {
    const { query, filePath, provider } = args;

    try {
      // Get file context if provided
      let context = undefined;
      if (filePath) {
        try {
          const data = await readFileContent(filePath);
          context = {
            headers: data[0],
            rowCount: data.length,
            columnCount: data[0]?.length || 0,
            dataTypes: detectDataTypes(data),
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
      let formulaResult = undefined;
      if (result.type === 'formula') {
        try {
          formulaResult = await this.nlpProcessor.buildFormula(query, context, provider);
        } catch (formulaError) {
          // Formula building failed, continue with just the command
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              result: result, // Keep the command result in 'result' field for consistency
              formula: formulaResult,
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

  async explainFormula(args: ToolArgs): Promise<ToolResponse> {
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

  async getAIProviderStatus(args: ToolArgs): Promise<ToolResponse> {
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

  async smartDataAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, provider } = args;

    try {
      // Read the file
      const data = await readFileContent(filePath, sheet);

      if (data.length === 0) {
        throw new Error('File is empty');
      }

      // Create context for AI analysis
      const context = {
        headers: data[0],
        rowCount: data.length,
        columnCount: data[0]?.length || 0,
        dataTypes: detectDataTypes(data),
        sampleData: data.slice(0, 6), // First 5 data rows + header
        activeCell: 'A1',
        selectedRange: 'A1:A1'
      };

      // Generate AI suggestions
      const suggestions = await this.nlpProcessor.suggestFormulas(context);

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
}