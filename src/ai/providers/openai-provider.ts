/**
 * OpenAI GPT Provider
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './base-provider';

type OpenAISDK = any;

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAISDK | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    this.config.model = config.model || 'gpt-4.1';
    this.config.maxTokens = config.maxTokens || 1000;
    this.config.temperature = config.temperature || 0;
    this.config.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      
      // Dynamic import to handle optional dependency
      const openaiModule = await import('openai').catch(() => null);
      if (!openaiModule) {
        throw new Error('OpenAI SDK not installed');
      }

      const { default: OpenAI } = openaiModule;
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL
      });

      this.isAvailable = true;
    } catch (error) {
      console.warn('Failed to initialize OpenAI provider:', error);
      this.isAvailable = false;
    }
  }

  isReady(): boolean {
    return this.isAvailable && this.client !== null;
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  getSupportedModels(): string[] {
    return [
      'o3',                       // 🚀 Latest OpenAI o3 (83.3% GPQA, 88.9% AIME)
      'gpt-4.1',                  // 🚀 Enhanced GPT-4.1
      'gpt-4o',                   // GPT-4o
      'gpt-4o-2024-11-20',        // GPT-4o with specific date
      'gpt-4o-mini',              // Fast, cost-effective
      'gpt-4-turbo',              // GPT-4 Turbo
      'gpt-4',                    // Standard GPT-4
      'o1-preview',               // Reasoning model
      'o1-mini',                  // Compact reasoning model
      'gpt-3.5-turbo',           // Legacy but fast
      'gpt-3.5-turbo-16k'        // Legacy with larger context
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
      throw new Error('OpenAI provider not ready');
    }

    const model = options?.model || this.config.model!;
    const maxTokens = options?.maxTokens || this.config.maxTokens!;
    const temperature = options?.temperature || this.config.temperature!;

    // Convert messages format
    const requestMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system prompt if provided
    if (options?.systemPrompt) {
      requestMessages.unshift({
        role: 'system',
        content: options.systemPrompt
      });
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: requestMessages,
        max_tokens: maxTokens,
        temperature
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }
}