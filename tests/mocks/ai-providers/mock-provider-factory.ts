/**
 * Mock AI Provider Factory
 * Creates mock implementations of AI providers for testing
 */

import { BaseAIProvider } from '../../../src/ai/providers/base-provider';

interface MockAIBehavior {
  shouldFail?: boolean;
  responseDelay?: number;
  responseContent?: string;
  errorMessage?: string;
  tokenUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class MockAIProvider extends BaseAIProvider {
  private behavior: MockAIBehavior;
  private providerType: string;
  private _isReady: boolean = true;

  constructor(type: string, config: any, behavior: MockAIBehavior = {}) {
    super(config);
    this.providerType = type;
    this.behavior = behavior;
  }

  async initialize(): Promise<void> {
    this.isAvailable = true;
  }

  isReady(): boolean {
    return this._isReady;
  }

  getProviderName(): string {
    return `Mock ${this.providerType.charAt(0).toUpperCase() + this.providerType.slice(1)}`;
  }

  getSupportedModels(): string[] {
    const modelMap: Record<string, string[]> = {
      anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
      openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
      deepseek: ['deepseek-chat', 'deepseek-v3', 'deepseek-coder-v2'],
      gemini: ['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      local: ['local-fallback']
    };
    return modelMap[this.providerType] || ['mock-model'];
  }

  async createCompletion(
    messages: any[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<any> {
    // Simulate delay if specified
    if (this.behavior.responseDelay) {
      await new Promise(resolve => setTimeout(resolve, this.behavior.responseDelay));
    }

    // Simulate failure if specified
    if (this.behavior.shouldFail) {
      throw new Error(this.behavior.errorMessage || 'Mock provider error');
    }

    // Generate response based on input
    let responseContent = this.behavior.responseContent;

    if (!responseContent) {
      responseContent = this.generateMockResponse(messages, options);
    }

    return {
      content: responseContent,
      usage: this.behavior.tokenUsage || {
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      }
    };
  }

  setBehavior(behavior: MockAIBehavior): void {
    this.behavior = { ...this.behavior, ...behavior };
  }

  setReady(ready: boolean): void {
    this._isReady = ready;
  }

  private generateMockResponse(messages: any[], options?: any): string {
    const lastMessage = messages[messages.length - 1];

    // Pattern matching for specific test scenarios
    if (lastMessage.content.toLowerCase().includes('formula')) {
      return JSON.stringify({
        type: 'formula',
        action: 'create',
        parameters: { formula: '=SUM(A:A)' },
        confidence: 0.95
      });
    }

    if (lastMessage.content.toLowerCase().includes('explain')) {
      return 'This formula calculates the sum of all values in column A.';
    }

    if (lastMessage.content.toLowerCase().includes('hello')) {
      return 'Hello! How can I help you with Excel today?';
    }

    // Default response
    return `Mock response to: ${lastMessage.content}`;
  }
}

class MockProviderFactory {
  private providers: Map<string, MockAIProvider> = new Map();
  private defaultBehaviors: Map<string, MockAIBehavior> = new Map();

  constructor() {
    this.setupDefaultBehaviors();
  }

  createMockProvider(type: string, behavior?: MockAIBehavior): MockAIProvider {
    const config: any = {
      apiKey: `mock-${type}-key`,
      model: this.getDefaultModel(type)
    };

    const finalBehavior = {
      ...this.defaultBehaviors.get(type),
      ...behavior
    };

    const provider = new MockAIProvider(type, config, finalBehavior);
    const key = `${type}-${Date.now()}`;
    this.providers.set(key, provider);

    return provider;
  }

  createWorkingProvider(type: string): MockAIProvider {
    return this.createMockProvider(type, { shouldFail: false });
  }

  createFailingProvider(type: string, errorMessage?: string): MockAIProvider {
    return this.createMockProvider(type, {
      shouldFail: true,
      errorMessage: errorMessage || `${type} provider unavailable`
    });
  }

  createSlowProvider(type: string, delay: number = 5000): MockAIProvider {
    return this.createMockProvider(type, {
      responseDelay: delay,
      shouldFail: false
    });
  }

  createFormulaProvider(type: string): MockAIProvider {
    return this.createMockProvider(type, {
      responseContent: JSON.stringify({
        formula: '=VLOOKUP(A2,B:D,2,FALSE)',
        explanation: 'Lookup value from A2 in column B and return corresponding value from column D',
        references: ['A2', 'B:D']
      })
    });
  }

  createExplanationProvider(type: string): MockAIProvider {
    return this.createMockProvider(type, {
      responseContent: 'This VLOOKUP formula searches for the value in cell A2 within the range B:D and returns the corresponding value from the second column of that range.'
    });
  }

  setBehaviorForAll(behavior: MockAIBehavior): void {
    this.providers.forEach(provider => {
      provider.setBehavior(behavior);
    });
  }

  setProviderReady(type: string, ready: boolean): void {
    this.providers.forEach(provider => {
      if (provider.getProviderName().toLowerCase().includes(type)) {
        provider.setReady(ready);
      }
    });
  }

  resetAll(): void {
    this.providers.clear();
    this.setupDefaultBehaviors();
  }

  getProvider(type: string): MockAIProvider | undefined {
    return Array.from(this.providers.values())
      .find(p => p.getProviderName().toLowerCase().includes(type));
  }

  private setupDefaultBehaviors(): void {
    this.defaultBehaviors.set('anthropic', {
      shouldFail: false,
      responseDelay: 100,
      tokenUsage: { prompt_tokens: 40, completion_tokens: 60, total_tokens: 100 }
    });

    this.defaultBehaviors.set('openai', {
      shouldFail: false,
      responseDelay: 150,
      tokenUsage: { prompt_tokens: 45, completion_tokens: 55, total_tokens: 100 }
    });

    this.defaultBehaviors.set('deepseek', {
      shouldFail: false,
      responseDelay: 80,
      tokenUsage: { prompt_tokens: 35, completion_tokens: 65, total_tokens: 100 }
    });

    this.defaultBehaviors.set('gemini', {
      shouldFail: false,
      responseDelay: 120,
      tokenUsage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 }
    });

    this.defaultBehaviors.set('local', {
      shouldFail: false,
      responseDelay: 10,
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
  }

  private getDefaultModel(type: string): string {
    const modelMap: Record<string, string> = {
      anthropic: 'claude-3-haiku-20240307',
      openai: 'gpt-4o-mini',
      deepseek: 'deepseek-chat',
      gemini: 'gemini-2.5-pro',
      local: 'local-fallback'
    };
    return modelMap[type];
  }
}

export { MockProviderFactory, MockAIProvider };