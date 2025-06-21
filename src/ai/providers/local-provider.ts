/**
 * Local/Offline Provider
 * Fallback provider that works without any external API
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './base-provider';

export class LocalProvider extends BaseAIProvider {
  constructor() {
    super({ apiKey: 'local' });
    this.isAvailable = true;
  }

  async initialize(): Promise<void> {
    this.isAvailable = true;
  }

  isReady(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'Local';
  }

  getSupportedModels(): string[] {
    return ['local-fallback'];
  }

  async createCompletion(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Basic pattern matching for formula generation
    const response = this.generateLocalResponse(lastMessage);
    
    return {
      content: response,
      usage: {
        prompt_tokens: lastMessage.length / 4, // Rough estimate
        completion_tokens: response.length / 4,
        total_tokens: (lastMessage.length + response.length) / 4
      }
    };
  }

  private generateLocalResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    // Formula generation patterns
    if (lowerInput.includes('sum') && lowerInput.includes('column')) {
      const columnMatch = lowerInput.match(/column\s+([a-z])/i);
      const column = columnMatch ? columnMatch[1].toUpperCase() : 'A';
      return JSON.stringify({
        formula: `=SUM(${column}:${column})`,
        explanation: `Sums all values in column ${column}`,
        references: [`${column}:${column}`]
      });
    }

    if (lowerInput.includes('average') || lowerInput.includes('avg')) {
      return JSON.stringify({
        formula: '=AVERAGE(A:A)',
        explanation: 'Calculates the average of values in column A',
        references: ['A:A']
      });
    }

    if (lowerInput.includes('count')) {
      return JSON.stringify({
        formula: '=COUNT(A:A)',
        explanation: 'Counts numeric values in column A',
        references: ['A:A']
      });
    }

    if (lowerInput.includes('max') || lowerInput.includes('maximum')) {
      return JSON.stringify({
        formula: '=MAX(A:A)',
        explanation: 'Finds the maximum value in column A',
        references: ['A:A']
      });
    }

    if (lowerInput.includes('min') || lowerInput.includes('minimum')) {
      return JSON.stringify({
        formula: '=MIN(A:A)',
        explanation: 'Finds the minimum value in column A',
        references: ['A:A']
      });
    }

    // Command classification patterns
    if (lowerInput.includes('chart') || lowerInput.includes('graph')) {
      return JSON.stringify({
        type: 'chart',
        action: 'create',
        parameters: { chartType: 'auto' },
        confidence: 0.7
      });
    }

    if (lowerInput.includes('duplicate') || lowerInput.includes('duplicates')) {
      return JSON.stringify({
        type: 'operation',
        action: 'find_duplicates',
        parameters: { range: 'current' },
        confidence: 0.8
      });
    }

    if (lowerInput.includes('filter') || lowerInput.includes('where')) {
      return JSON.stringify({
        type: 'operation',
        action: 'filter_data',
        parameters: { condition: 'auto-detect' },
        confidence: 0.6
      });
    }

    if (lowerInput.includes('pivot') || lowerInput.includes('summarize')) {
      return JSON.stringify({
        type: 'analysis',
        action: 'pivot_table',
        parameters: { groupBy: 'auto', aggregate: 'sum' },
        confidence: 0.7
      });
    }

    // Formula explanation patterns
    if (lowerInput.startsWith('=') || lowerInput.includes('formula')) {
      if (lowerInput.includes('sum')) {
        return 'This formula adds up all the values in the specified range.';
      }
      if (lowerInput.includes('vlookup')) {
        return 'This formula searches for a value in the first column of a range and returns a value in the same row from another column.';
      }
      if (lowerInput.includes('if')) {
        return 'This formula checks a condition and returns one value if true, another if false.';
      }
      return 'This formula performs a calculation or operation on the specified cells.';
    }

    // Default responses
    return JSON.stringify({
      type: 'operation',
      action: 'analyze',
      parameters: { query: input },
      confidence: 0.4
    });
  }
}