/**
 * Base AI Provider Interface
 * Unified interface for all AI providers (Anthropic, OpenAI, DeepSeek, etc.)
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  protected isAvailable: boolean = false;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract isReady(): boolean;
  abstract getProviderName(): string;
  abstract getSupportedModels(): string[];

  abstract createCompletion(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse>;

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.getProviderName()}`);
    }
  }

  getDefaultModel(): string {
    const models = this.getSupportedModels();
    return models.length > 0 ? models[0] : '';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.createCompletion([
        { role: 'user', content: 'Hello' }
      ], { maxTokens: 10 });
      return response.content.length > 0;
    } catch (error) {
      console.warn(`${this.getProviderName()} connection test failed:`, error);
      return false;
    }
  }
}