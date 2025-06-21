/**
 * Natural Language Processor for Excel Commands
 * Converts natural language to Excel formulas and operations
 */

import { AIManager, createAIManagerConfig, ProviderType } from './ai-manager';

export interface NLPCommand {
  type: 'formula' | 'operation' | 'analysis' | 'format' | 'chart';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export interface FormulaIntent {
  formula: string;
  explanation: string;
  references: string[];
}

export class NLPProcessor {
  private aiManager: AIManager;
  private isAvailable: boolean = false;
  
  constructor(customConfig?: any) {
    const config = customConfig || createAIManagerConfig();
    this.aiManager = new AIManager(config);
    this.initializeAI();
  }

  private async initializeAI(): Promise<void> {
    try {
      await this.aiManager.initialize();
      this.isAvailable = true;
      
      const activeProvider = this.aiManager.getActiveProvider();
      if (activeProvider) {
        // console.log(`🤖 NLP Processor ready with ${activeProvider.name}`);
      }
    } catch (error) {
      // console.warn('AI Manager initialization failed, using local fallback:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Parse natural language command into structured Excel operation
   */
  async parseCommand(text: string, context?: WorksheetContext, preferredProvider?: ProviderType): Promise<NLPCommand> {
    const prompt = this.buildCommandPrompt(text, context);
    
    try {
      const response = await this.aiManager.createCompletion([
        { role: 'user', content: prompt }
      ], {
        systemPrompt: this.getSystemPrompt(),
        maxTokens: 1000,
        temperature: 0,
        preferredProvider
      });

      return this.parseCommandResponse(response.content);
    } catch (error) {
      // console.error('Error parsing command:', error);
      return this.fallbackParser(text);
    }
  }

  /**
   * Convert natural language to Excel formula
   */
  async buildFormula(description: string, context?: WorksheetContext, preferredProvider?: ProviderType): Promise<FormulaIntent> {
    const prompt = this.buildFormulaPrompt(description, context);
    
    try {
      const response = await this.aiManager.createCompletion([
        { role: 'user', content: prompt }
      ], {
        systemPrompt: this.getFormulaSystemPrompt(),
        maxTokens: 500,
        temperature: 0,
        preferredProvider
      });

      return this.parseFormulaResponse(response.content);
    } catch (error) {
      // console.error('Error building formula:', error);
      return this.fallbackFormulaBuilder(description);
    }
  }

  /**
   * Explain an Excel formula in natural language
   */
  async explainFormula(formula: string, preferredProvider?: ProviderType): Promise<string> {
    const prompt = `Explain this Excel formula in simple terms: ${formula}`;
    
    try {
      const response = await this.aiManager.createCompletion([
        { role: 'user', content: prompt }
      ], {
        maxTokens: 300,
        temperature: 0,
        preferredProvider
      });

      return response.content;
    } catch (error) {
      // console.error('Error explaining formula:', error);
      return this.fallbackFormulaExplainer(formula);
    }
  }

  /**
   * Suggest formulas based on data context
   */
  async suggestFormulas(context: WorksheetContext): Promise<FormulaIntent[]> {
    const suggestions: FormulaIntent[] = [];
    
    // Analyze data patterns
    const patterns = this.analyzeDataPatterns(context);
    
    // Generate suggestions based on patterns
    if (patterns.hasNumbers) {
      suggestions.push({
        formula: `=SUM(${patterns.numericColumns[0]}:${patterns.numericColumns[0]})`,
        explanation: 'Sum all values in the column',
        references: patterns.numericColumns
      });
      
      suggestions.push({
        formula: `=AVERAGE(${patterns.numericColumns[0]}:${patterns.numericColumns[0]})`,
        explanation: 'Calculate the average of all values',
        references: patterns.numericColumns
      });
    }
    
    if (patterns.hasDates && patterns.hasNumbers) {
      suggestions.push({
        formula: `=SUMIFS(${patterns.numericColumns[0]}:${patterns.numericColumns[0]}, ${patterns.dateColumns[0]}:${patterns.dateColumns[0]}, ">="&TODAY()-30)`,
        explanation: 'Sum values from the last 30 days',
        references: [...patterns.numericColumns, ...patterns.dateColumns]
      });
    }
    
    return suggestions;
  }

  /**
   * Get available AI providers
   */
  getAvailableProviders() {
    return this.aiManager.getAvailableProviders();
  }

  /**
   * Get currently active provider
   */
  getActiveProvider() {
    return this.aiManager.getActiveProvider();
  }

  /**
   * Switch to a different AI provider
   */
  async switchProvider(type: ProviderType): Promise<boolean> {
    return this.aiManager.switchProvider(type);
  }

  /**
   * Test all available providers
   */
  async testProviders() {
    return this.aiManager.testAllProviders();
  }

  // Private helper methods
  private getSystemPrompt(): string {
    return `You are an Excel formula expert. Convert natural language requests into structured Excel commands.
    
    Respond in JSON format:
    {
      "type": "formula|operation|analysis|format|chart",
      "action": "specific action",
      "parameters": {
        // relevant parameters
      },
      "confidence": 0.0-1.0
    }
    
    Examples:
    - "sum all values in column A" → {"type": "formula", "action": "create", "parameters": {"formula": "=SUM(A:A)"}, "confidence": 0.95}
    - "find duplicates" → {"type": "operation", "action": "find_duplicates", "parameters": {"range": "current"}, "confidence": 0.9}
    - "create a chart" → {"type": "chart", "action": "create", "parameters": {"chartType": "auto"}, "confidence": 0.8}`;
  }

  private getFormulaSystemPrompt(): string {
    return `You are an Excel formula expert. Convert natural language descriptions into Excel formulas.
    
    Respond in JSON format:
    {
      "formula": "=FORMULA HERE",
      "explanation": "What the formula does",
      "references": ["A1", "B:B", etc]
    }
    
    Use proper Excel syntax and functions.`;
  }

  private buildCommandPrompt(text: string, context?: WorksheetContext): string {
    let prompt = `Convert this request to an Excel command: "${text}"`;
    
    if (context) {
      prompt += `\n\nContext:`;
      prompt += `\n- Active cell: ${context.activeCell}`;
      prompt += `\n- Selected range: ${context.selectedRange}`;
      prompt += `\n- Sheet has ${context.rowCount} rows and ${context.columnCount} columns`;
    }
    
    return prompt;
  }

  private buildFormulaPrompt(description: string, context?: WorksheetContext): string {
    let prompt = `Create an Excel formula for: "${description}"`;
    
    if (context) {
      prompt += `\n\nAvailable data:`;
      if (context.headers) {
        prompt += `\n- Column headers: ${context.headers.join(', ')}`;
      }
      if (context.dataTypes) {
        prompt += `\n- Data types: ${JSON.stringify(context.dataTypes)}`;
      }
    }
    
    return prompt;
  }

  private parseCommandResponse(response: string): NLPCommand {
    try {
      const json = JSON.parse(response);
      return {
        type: json.type || 'operation',
        action: json.action || 'unknown',
        parameters: json.parameters || {},
        confidence: json.confidence || 0.5
      };
    } catch {
      return this.fallbackParser(response);
    }
  }

  private parseFormulaResponse(response: string): FormulaIntent {
    try {
      const json = JSON.parse(response);
      return {
        formula: json.formula,
        explanation: json.explanation,
        references: json.references || []
      };
    } catch {
      return this.fallbackFormulaBuilder(response);
    }
  }

  private fallbackParser(text: string): NLPCommand {
    // Simple keyword-based parsing
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('sum')) {
      return {
        type: 'formula',
        action: 'create',
        parameters: { formula: '=SUM()' },
        confidence: 0.6
      };
    } else if (lowerText.includes('average') || lowerText.includes('avg')) {
      return {
        type: 'formula',
        action: 'create',
        parameters: { formula: '=AVERAGE()' },
        confidence: 0.6
      };
    } else if (lowerText.includes('count')) {
      return {
        type: 'formula',
        action: 'create',
        parameters: { formula: '=COUNT()' },
        confidence: 0.6
      };
    } else if (lowerText.includes('duplicate')) {
      return {
        type: 'operation',
        action: 'find_duplicates',
        parameters: {},
        confidence: 0.7
      };
    } else if (lowerText.includes('chart') || lowerText.includes('graph')) {
      return {
        type: 'chart',
        action: 'create',
        parameters: { chartType: 'auto' },
        confidence: 0.6
      };
    }
    
    return {
      type: 'operation',
      action: 'unknown',
      parameters: { query: text },
      confidence: 0.3
    };
  }

  private fallbackFormulaBuilder(description: string): FormulaIntent {
    const lower = description.toLowerCase();
    
    if (lower.includes('sum')) {
      return {
        formula: '=SUM(A:A)',
        explanation: 'Sums all values in column A',
        references: ['A:A']
      };
    } else if (lower.includes('average')) {
      return {
        formula: '=AVERAGE(A:A)',
        explanation: 'Calculates the average of values in column A',
        references: ['A:A']
      };
    }
    
    return {
      formula: '=A1',
      explanation: 'Reference to cell A1',
      references: ['A1']
    };
  }

  private fallbackFormulaExplainer(formula: string): string {
    // Basic pattern matching for common formulas
    if (formula.includes('SUM')) {
      return 'This formula adds up all the values in the specified range.';
    } else if (formula.includes('AVERAGE')) {
      return 'This formula calculates the average (mean) of the values in the specified range.';
    } else if (formula.includes('IF')) {
      return 'This formula checks a condition and returns one value if true, another if false.';
    } else if (formula.includes('VLOOKUP')) {
      return 'This formula searches for a value in the first column of a range and returns a value in the same row from another column.';
    }
    
    return 'This formula performs a calculation or operation on the specified cells.';
  }

  private analyzeDataPatterns(context: WorksheetContext): DataPatterns {
    const patterns: DataPatterns = {
      hasNumbers: false,
      hasText: false,
      hasDates: false,
      hasFormulas: false,
      numericColumns: [],
      textColumns: [],
      dateColumns: [],
      formulaColumns: []
    };
    
    if (!context.dataTypes) return patterns;
    
    Object.entries(context.dataTypes).forEach(([column, type]) => {
      switch (type) {
        case 'number':
          patterns.hasNumbers = true;
          patterns.numericColumns.push(column);
          break;
        case 'date':
          patterns.hasDates = true;
          patterns.dateColumns.push(column);
          break;
        case 'text':
          patterns.hasText = true;
          patterns.textColumns.push(column);
          break;
        case 'formula':
          patterns.hasFormulas = true;
          patterns.formulaColumns.push(column);
          break;
      }
    });
    
    return patterns;
  }
}

// Type definitions
export interface WorksheetContext {
  activeCell: string;
  selectedRange: string;
  rowCount: number;
  columnCount: number;
  headers?: string[];
  dataTypes?: Record<string, 'number' | 'text' | 'date' | 'formula'>;
}

interface DataPatterns {
  hasNumbers: boolean;
  hasText: boolean;
  hasDates: boolean;
  hasFormulas: boolean;
  numericColumns: string[];
  textColumns: string[];
  dateColumns: string[];
  formulaColumns: string[];
}

// Export singleton instance
export const nlpProcessor = new NLPProcessor();