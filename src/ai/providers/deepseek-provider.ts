/**
 * DeepSeek Provider
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './base-provider';

type DeepSeekSDK = any;

export class DeepSeekProvider extends BaseAIProvider {
  private client: DeepSeekSDK | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    this.config.model = config.model || 'deepseek-chat';
    this.config.maxTokens = config.maxTokens || 1000;
    this.config.temperature = config.temperature || 0;
    this.config.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
  }

  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      
      // DeepSeek uses OpenAI-compatible API, so we can use the OpenAI SDK
      const openaiModule = await import('openai').catch(() => null);
      if (!openaiModule) {
        throw new Error('OpenAI SDK not installed (required for DeepSeek)');
      }

      const { default: OpenAI } = openaiModule;
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL
      });

      this.isAvailable = true;
    } catch (error) {
      console.warn('Failed to initialize DeepSeek provider:', error);
      this.isAvailable = false;
    }
  }

  isReady(): boolean {
    return this.isAvailable && this.client !== null;
  }

  getProviderName(): string {
    return 'DeepSeek';
  }

  getSupportedModels(): string[] {
    return [
      'deepseek-chat',            // Standard chat model
      'deepseek-v3',              // Latest and most capable
      'deepseek-coder-v2',        // Enhanced coding model
      'deepseek-coder',           // Original coding model
      'deepseek-math',            // Math reasoning specialist
      'deepseek-reasoner'         // Advanced reasoning model
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
      throw new Error('DeepSeek provider not ready');
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
        temperature,
        stream: false
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from DeepSeek');
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
      throw new Error(`DeepSeek API error: ${error}`);
    }
  }
}