/**
 * AI Provider Manager
 * Manages multiple AI providers with fallback support
 */

import { BaseAIProvider, AIMessage, AIResponse, AIProviderConfig } from './providers/base-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { DeepSeekProvider } from './providers/deepseek-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { LocalProvider } from './providers/local-provider';

export type ProviderType = 'anthropic' | 'openai' | 'deepseek' | 'gemini' | 'local';

export interface AIManagerConfig {
  providers: Array<{
    type: ProviderType;
    config: AIProviderConfig;
    priority?: number;
  }>;
  fallbackToLocal?: boolean;
  enableProviderSwitching?: boolean;
}

export class AIManager {
  private providers: Map<ProviderType, BaseAIProvider> = new Map();
  private activeProvider: BaseAIProvider | null = null;
  private config: AIManagerConfig;
  private localProvider: LocalProvider;

  constructor(config: AIManagerConfig) {
    this.config = {
      fallbackToLocal: true,
      enableProviderSwitching: true,
      ...config
    };
    
    this.localProvider = new LocalProvider();
  }

  async initialize(): Promise<void> {
    // console.log('🤖 Initializing AI providers...');
    
    // Initialize local provider first
    await this.localProvider.initialize();
    this.providers.set('local', this.localProvider);

    // Sort providers by priority (higher first)
    const sortedProviders = this.config.providers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const providerConfig of sortedProviders) {
      try {
        const provider = this.createProvider(providerConfig.type, providerConfig.config);
        await provider.initialize();
        
        if (provider.isReady()) {
          this.providers.set(providerConfig.type, provider);
          
          // Set as active if we don't have one yet
          if (!this.activeProvider) {
            this.activeProvider = provider;
            // console.log(`✅ Active AI provider: ${provider.getProviderName()}`);
          } else {
            // console.log(`✅ Backup AI provider: ${provider.getProviderName()}`);
          }
        }
      } catch (error) {
        // console.warn(`❌ Failed to initialize ${providerConfig.type}:`, error);
      }
    }

    // Fallback to local if no external providers work
    if (!this.activeProvider && this.config.fallbackToLocal) {
      this.activeProvider = this.localProvider;
      // console.log('⚠️ Using local fallback provider');
    }

    if (!this.activeProvider) {
      throw new Error('No AI providers available');
    }
  }

  private createProvider(type: ProviderType, config: AIProviderConfig): BaseAIProvider {
    switch (type) {
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'deepseek':
        return new DeepSeekProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'local':
        return new LocalProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  async createCompletion(
    messages: AIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      preferredProvider?: ProviderType;
    }
  ): Promise<AIResponse> {
    let provider = this.activeProvider;

    // Use preferred provider if specified and available
    if (options?.preferredProvider && this.providers.has(options.preferredProvider)) {
      const preferredProvider = this.providers.get(options.preferredProvider)!;
      if (preferredProvider.isReady()) {
        provider = preferredProvider;
      }
    }

    if (!provider) {
      throw new Error('No AI provider available');
    }

    try {
      const response = await provider.createCompletion(messages, options);
      return {
        ...response,
        provider: provider.getProviderName()
      } as AIResponse & { provider: string };
    } catch (error) {
      // console.warn(`Provider ${provider.getProviderName()} failed:`, error);

      // Try fallback providers if enabled
      if (this.config.enableProviderSwitching) {
        return this.tryFallbackProviders(messages, options, provider);
      }

      throw error;
    }
  }

  private async tryFallbackProviders(
    messages: AIMessage[],
    options: any,
    failedProvider: BaseAIProvider
  ): Promise<AIResponse> {
    for (const [type, provider] of this.providers.entries()) {
      if (provider === failedProvider || !provider.isReady()) {
        continue;
      }

      try {
        // console.log(`🔄 Trying fallback provider: ${provider.getProviderName()}`);
        const response = await provider.createCompletion(messages, options);
        
        // Update active provider if this one works
        this.activeProvider = provider;
        
        return {
          ...response,
          provider: provider.getProviderName()
        } as AIResponse & { provider: string };
      } catch (error) {
        // console.warn(`Fallback provider ${provider.getProviderName()} also failed:`, error);
      }
    }

    throw new Error('All AI providers failed');
  }

  getAvailableProviders(): Array<{ type: ProviderType; name: string; ready: boolean; models: string[] }> {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      name: provider.getProviderName(),
      ready: provider.isReady(),
      models: provider.getSupportedModels()
    }));
  }

  getActiveProvider(): { type: ProviderType; name: string } | null {
    if (!this.activeProvider) return null;
    
    const type = Array.from(this.providers.entries())
      .find(([, provider]) => provider === this.activeProvider)?.[0];
    
    return type ? { type, name: this.activeProvider.getProviderName() } : null;
  }

  async switchProvider(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider || !provider.isReady()) {
      return false;
    }

    this.activeProvider = provider;
    // console.log(`🔄 Switched to provider: ${provider.getProviderName()}`);
    return true;
  }

  async testAllProviders(): Promise<Array<{ type: ProviderType; name: string; working: boolean }>> {
    const results = [];
    
    for (const [type, provider] of this.providers.entries()) {
      const working = await provider.testConnection();
      results.push({
        type,
        name: provider.getProviderName(),
        working
      });
    }
    
    return results;
  }
}

// Configuration helper
export function createAIManagerConfig(): AIManagerConfig {
  const providers: AIManagerConfig['providers'] = [];

  // Check environment variables for API keys
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      type: 'anthropic',
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
      },
      priority: 3
    });
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      type: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        baseURL: process.env.OPENAI_BASE_URL
      },
      priority: 2
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      type: 'deepseek',
      config: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v3',
        baseURL: process.env.DEEPSEEK_BASE_URL
      },
      priority: 1
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      type: 'gemini',
      config: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        baseURL: process.env.GEMINI_BASE_URL
      },
      priority: 2
    });
  }

  return {
    providers,
    fallbackToLocal: true,
    enableProviderSwitching: true
  };
}