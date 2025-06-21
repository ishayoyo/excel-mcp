/**
 * Anthropic Claude Provider
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './base-provider';

type AnthropicSDK = any;

export class AnthropicProvider extends BaseAIProvider {
  private client: AnthropicSDK | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    this.config.model = config.model || 'claude-sonnet-4';
    this.config.maxTokens = config.maxTokens || 1000;
    this.config.temperature = config.temperature || 0;
  }

  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      
      // Dynamic import to handle optional dependency
      const anthropicModule = await import('@anthropic-ai/sdk').catch(() => null);
      if (!anthropicModule) {
        throw new Error('Anthropic SDK not installed');
      }

      const { Anthropic } = anthropicModule;
      const clientConfig: any = {
        apiKey: this.config.apiKey
      };
      
      if (this.config.baseURL) {
        clientConfig.baseURL = this.config.baseURL;
      }
      
      this.client = new Anthropic(clientConfig);

      this.isAvailable = true;
    } catch (error) {
      console.warn('Failed to initialize Anthropic provider:', error);
      this.isAvailable = false;
    }
  }

  isReady(): boolean {
    return this.isAvailable && this.client !== null;
  }

  getProviderName(): string {
    return 'Anthropic';
  }

  getSupportedModels(): string[] {
    return [
      'claude-opus-4',               // 🚀 Latest Claude Opus 4 (79.4% SWE-bench)
      'claude-sonnet-4',             // 🚀 Latest Claude Sonnet 4 (80.2% SWE-bench)
      'claude-sonnet-3.7',           // Enhanced Claude Sonnet 3.7
      'claude-3-5-sonnet-20241022',  // Claude 3.5 Sonnet v2
      'claude-3-5-haiku-20241022',   // Claude 3.5 Haiku
      'claude-3-opus-20240229',      // Claude 3 Opus (legacy)
      'claude-3-sonnet-20240229',    // Claude 3 Sonnet (legacy)
      'claude-3-haiku-20240307'      // Claude 3 Haiku (legacy)
    ];
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
    if (!this.isReady()) {
      throw new Error('Anthropic provider not ready');
    }

    const model = options?.model || this.config.model!;
    const maxTokens = options?.maxTokens || this.config.maxTokens!;
    const temperature = options?.temperature || this.config.temperature!;

    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const requestMessages = userMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: options?.systemPrompt || systemMessage?.content,
        messages: requestMessages
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      return {
        content: content.text,
        usage: response.usage ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${error}`);
    }
  }
}