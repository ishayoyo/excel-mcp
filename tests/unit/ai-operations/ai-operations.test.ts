/**
 * Unit Tests for AI Operations Handler
 * Tests AI-powered functionality with mocked providers
 */

import { AIOperationsHandler } from '../../../src/handlers/ai-operations';
import { MockProviderFactory } from '../../mocks/ai-providers/mock-provider-factory';
import { AIManager } from '../../../src/ai/ai-manager';
import path from 'path';

// Mock the AI Manager to use our mock providers
jest.mock('../../../src/ai/ai-manager');

describe('AIOperationsHandler', () => {
  let handler: AIOperationsHandler;
  let mockFactory: MockProviderFactory;
  let sampleCSVPath: string;

  beforeAll(() => {
    mockFactory = new MockProviderFactory();
    sampleCSVPath = path.resolve('tests/data/csv/sample_sales.csv');
  });

  beforeEach(() => {
    handler = new AIOperationsHandler();
    mockFactory.resetAll();

    // Setup default working mock providers
    const mockAIManager = {
      getAvailableProviders: jest.fn().mockReturnValue([
        { type: 'deepseek', name: 'DeepSeek', ready: true, models: ['deepseek-chat'] },
        { type: 'gemini', name: 'Google Gemini', ready: true, models: ['gemini-2.5-pro'] },
        { type: 'local', name: 'Local', ready: true, models: ['local-fallback'] }
      ]),
      getActiveProvider: jest.fn().mockReturnValue({ type: 'deepseek', name: 'DeepSeek' }),
      createCompletion: jest.fn(),
      testAllProviders: jest.fn().mockResolvedValue([
        { type: 'deepseek', name: 'DeepSeek', working: true },
        { type: 'gemini', name: 'Google Gemini', working: true },
        { type: 'local', name: 'Local', working: true }
      ])
    };

    // Replace the NLP processor's AI manager with our mock
    (handler as any).nlpProcessor.aiManager = mockAIManager;
  });

  describe('evaluateFormula', () => {
    test('should evaluate simple SUM formula', async () => {
      const result = await handler.evaluateFormula({
        formula: '=SUM(A1:A3)',
        context: {
          'A1': 10,
          'A2': 20,
          'A3': 30
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBe(60);
      expect(response.formula).toBe('=SUM(A1:A3)');
    });

    test('should evaluate VLOOKUP formula', async () => {
      const result = await handler.evaluateFormula({
        formula: '=VLOOKUP("John", A1:B3, 2, FALSE)',
        context: {
          'A1:B3': [
            ['John', 100],
            ['Jane', 200],
            ['Bob', 300]
          ]
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBe(100);
    });

    test('should handle formula parsing errors', async () => {
      const result = await handler.evaluateFormula({
        formula: '=INVALID_FUNCTION(A1)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('should evaluate complex nested formula', async () => {
      const result = await handler.evaluateFormula({
        formula: '=IF(A1>10, SUM(B1:B3), AVERAGE(B1:B3))',
        context: {
          'A1': 15,
          'B1': 5,
          'B2': 10,
          'B3': 15
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result).toBe(30); // SUM because A1 > 10
    });
  });

  describe('parseNaturalLanguage', () => {
    test('should parse simple sum request', async () => {
      const mockCompletion = {
        content: JSON.stringify({
          type: 'formula',
          action: 'create',
          parameters: { formula: '=SUM(A:A)' },
          confidence: 0.95
        })
      };

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue(mockCompletion);

      const result = await handler.parseNaturalLanguage({
        query: 'sum all values in column A',
        provider: 'deepseek'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result.type).toBe('formula');
      expect(response.result.parameters.formula).toBe('=SUM(A:A)');
    });

    test('should parse with file context', async () => {
      const mockCompletion = {
        content: JSON.stringify({
          type: 'formula',
          action: 'create',
          parameters: { formula: '=SUM(Revenue:Revenue)' },
          confidence: 0.9
        })
      };

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue(mockCompletion);

      const result = await handler.parseNaturalLanguage({
        query: 'sum all revenue',
        filePath: sampleCSVPath,
        provider: 'deepseek'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.result.type).toBe('formula');
    });

    test('should handle AI provider failures with fallback', async () => {
      // First call fails, second succeeds (fallback)
      (handler as any).nlpProcessor.aiManager.createCompletion
        .mockRejectedValueOnce(new Error('Provider failed'))
        .mockResolvedValueOnce({
          content: JSON.stringify({
            type: 'operation',
            action: 'unknown',
            parameters: { query: 'test query' },
            confidence: 0.3
          })
        });

      const result = await handler.parseNaturalLanguage({
        query: 'test query'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      // Should fall back to local processing
    });

    test('should handle different query types', async () => {
      const testCases = [
        {
          query: 'find duplicates',
          expectedType: 'operation',
          expectedAction: 'find_duplicates'
        },
        {
          query: 'create a chart',
          expectedType: 'chart',
          expectedAction: 'create'
        },
        {
          query: 'average of column B',
          expectedType: 'formula',
          expectedAction: 'create'
        }
      ];

      for (const testCase of testCases) {
        const mockCompletion = {
          content: JSON.stringify({
            type: testCase.expectedType,
            action: testCase.expectedAction,
            parameters: {},
            confidence: 0.8
          })
        };

        (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue(mockCompletion);

        const result = await handler.parseNaturalLanguage({
          query: testCase.query
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.result.type).toBe(testCase.expectedType);
      }
    });
  });

  describe('explainFormula', () => {
    test('should explain simple formula', async () => {
      const mockExplanation = 'This SUM formula adds up all values in column A from row 1 to row 10.';

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue({
        content: mockExplanation
      });

      const result = await handler.explainFormula({
        formula: '=SUM(A1:A10)',
        provider: 'deepseek'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.explanation).toBe(mockExplanation);
      expect(response.formula).toBe('=SUM(A1:A10)');
    });

    test('should explain complex VLOOKUP formula', async () => {
      const mockExplanation = 'This VLOOKUP formula searches for a value in cell A2 within the range B:D and returns the corresponding value from the second column.';

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue({
        content: mockExplanation
      });

      const result = await handler.explainFormula({
        formula: '=VLOOKUP(A2,B:D,2,FALSE)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.explanation).toContain('VLOOKUP');
      expect(response.explanation).toContain('searches');
    });

    test('should fall back to local explanation when AI fails', async () => {
      (handler as any).nlpProcessor.aiManager.createCompletion.mockRejectedValue(
        new Error('AI provider unavailable')
      );

      const result = await handler.explainFormula({
        formula: '=SUM(A1:A10)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.explanation).toContain('adds up');
    });
  });

  describe('getAIProviderStatus', () => {
    test('should return provider status information', async () => {
      const result = await handler.getAIProviderStatus({});

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.availableProviders).toBeDefined();
      expect(response.activeProvider).toBeDefined();
      expect(response.healthStatus).toBeDefined();

      expect(response.availableProviders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'deepseek',
            name: 'DeepSeek',
            ready: true
          })
        ])
      );
    });

    test('should handle errors gracefully', async () => {
      // Mock an error in getting provider status
      (handler as any).nlpProcessor.getAvailableProviders = jest.fn(() => {
        throw new Error('Provider status error');
      });

      const result = await handler.getAIProviderStatus({});

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('smartDataAnalysis', () => {
    test('should analyze data and provide suggestions', async () => {
      const mockSuggestions = [
        {
          formula: '=SUM(Revenue:Revenue)',
          explanation: 'Calculate total revenue',
          references: ['Revenue']
        },
        {
          formula: '=AVERAGE(Price:Price)',
          explanation: 'Calculate average price',
          references: ['Price']
        }
      ];

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue({
        content: JSON.stringify(mockSuggestions)
      });

      const result = await handler.smartDataAnalysis({
        filePath: sampleCSVPath
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.context).toBeDefined();
      expect(response.context.headers).toContain('Revenue');
      expect(response.aiSuggestions).toBeDefined();
    });

    test('should handle empty files', async () => {
      const emptyFile = await global.testDataManager.generateInvalidData('empty.csv', 'empty');

      const result = await handler.smartDataAnalysis({
        filePath: emptyFile
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('empty');
    });

    test('should work with Excel files and specific sheets', async () => {
      const excelPath = path.resolve('tests/data/excel/sample_workbook.xlsx');

      const result = await handler.smartDataAnalysis({
        filePath: excelPath,
        sheet: 'Financial'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.context.headers).toContain('Account');
    });
  });

  describe('Provider Selection', () => {
    test('should respect preferred provider parameter', async () => {
      const mockCompletion = {
        content: 'Response from preferred provider'
      };

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue(mockCompletion);

      const result = await handler.parseNaturalLanguage({
        query: 'test query',
        provider: 'gemini'
      });

      expect((handler as any).nlpProcessor.aiManager.createCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          preferredProvider: 'gemini'
        })
      );
    });

    test('should work without specifying provider', async () => {
      const mockCompletion = {
        content: JSON.stringify({
          type: 'operation',
          action: 'test',
          parameters: {},
          confidence: 0.8
        })
      };

      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue(mockCompletion);

      const result = await handler.parseNaturalLanguage({
        query: 'test query'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed AI responses', async () => {
      (handler as any).nlpProcessor.aiManager.createCompletion.mockResolvedValue({
        content: 'INVALID JSON RESPONSE'
      });

      const result = await handler.parseNaturalLanguage({
        query: 'test query'
      });

      const response = JSON.parse(result.content[0].text);
      // Should fall back to local processing
      expect(response.success).toBe(true);
    });

    test('should handle network timeouts', async () => {
      (handler as any).nlpProcessor.aiManager.createCompletion.mockRejectedValue(
        new Error('Request timeout')
      );

      const result = await handler.explainFormula({
        formula: '=SUM(A1:A10)'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      // Should use fallback explanation
    });

    test('should validate formula syntax before evaluation', async () => {
      const result = await handler.evaluateFormula({
        formula: '=INVALID('
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});