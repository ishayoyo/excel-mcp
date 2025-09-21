import { ToolResponse, ToolArgs } from '../types/shared.js';
import { readFileContent, detectDataTypes } from '../utils/file-utils.js';
import { NLPProcessor } from '../ai/nlp-processor.js';
import { parseFormula } from '../formula/parser.js';
import { FormulaEvaluator, WorkbookContext } from '../formula/evaluator.js';

export class AIOperationsHandler {
  private nlpProcessor: NLPProcessor;
  private formulaEvaluator: FormulaEvaluator;

  constructor() {
    this.nlpProcessor = new NLPProcessor();
    this.formulaEvaluator = new FormulaEvaluator();
  }

  async evaluateFormula(args: ToolArgs): Promise<ToolResponse> {
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