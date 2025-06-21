/**
 * Google Gemini Provider
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './base-provider';

type GeminiSDK = any;

export class GeminiProvider extends BaseAIProvider {
  private client: GeminiSDK | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    this.config.model = config.model || 'gemini-2.5-pro';
    this.config.maxTokens = config.maxTokens || 1000;
    this.config.temperature = config.temperature || 0;
    this.config.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1';
  }

  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      
      // Dynamic import to handle optional dependency
      const geminiModule = await import('@google/generative-ai').catch(() => null);
      if (!geminiModule) {
        throw new Error('Google Generative AI SDK not installed');
      }

      const { GoogleGenerativeAI } = geminiModule;
      this.client = new GoogleGenerativeAI(this.config.apiKey);

      this.isAvailable = true;
    } catch (error) {
      console.warn('Failed to initialize Gemini provider:', error);
      this.isAvailable = false;
    }
  }

  isReady(): boolean {
    return this.isAvailable && this.client !== null;
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  getSupportedModels(): string[] {
    return [
      'gemini-2.5-pro',             // 🚀 Latest Gemini 2.5 Pro (83.0% GPQA, 79.6% MMMU)
      'gemini-2.5-pro-preview',     // Preview version (05-06)
      'gemini-2.0-flash',           // Fast Gemini 2.0
      'gemini-1.5-pro',             // Gemini 1.5 Pro
      'gemini-1.5-flash',           // Fast Gemini 1.5
      'gemini-pro',                 // Standard Gemini Pro
      'gemini-pro-vision'           // Multimodal Gemini Pro
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
      throw new Error('Gemini provider not ready');
    }

    const model = options?.model || this.config.model!;
    const maxTokens = options?.maxTokens || this.config.maxTokens!;
    const temperature = options?.temperature || this.config.temperature!;

    try {
      const generativeModel = this.client.getGenerativeModel({
        model: model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
        },
      });

      // Convert messages to Gemini format
      let prompt = '';
      if (options?.systemPrompt) {
        prompt += `System: ${options.systemPrompt}\n\n`;
      }

      for (const message of messages) {
        if (message.role === 'system') {
          prompt += `System: ${message.content}\n\n`;
        } else if (message.role === 'user') {
          prompt += `User: ${message.content}\n\n`;
        } else if (message.role === 'assistant') {
          prompt += `Assistant: ${message.content}\n\n`;
        }
      }

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          prompt_tokens: prompt.length / 4, // Rough estimate
          completion_tokens: text.length / 4,
          total_tokens: (prompt.length + text.length) / 4
        }
      };
    } catch (error) {
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}