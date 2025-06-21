// Type declarations for optional Anthropic SDK
declare module '@anthropic-ai/sdk' {
  export class Anthropic {
    constructor(config: { apiKey?: string });
    messages: {
      create(params: {
        model: string;
        max_tokens: number;
        temperature: number;
        system?: string;
        messages: Array<{ role: string; content: string }>;
      }): Promise<{
        content: Array<{ type: string; text: string }>;
      }>;
    };
  }
}