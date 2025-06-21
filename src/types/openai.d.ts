// Type declarations for optional OpenAI SDK
declare module 'openai' {
  export default class OpenAI {
    constructor(config: { apiKey: string; baseURL?: string });
    chat: {
      completions: {
        create(params: {
          model: string;
          messages: Array<{ role: string; content: string }>;
          max_tokens: number;
          temperature: number;
        }): Promise<{
          choices: Array<{
            message: { content: string };
          }>;
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        }>;
      };
    };
  }
}