/**
 * OpenRouter LLM Client for the LLM Sandwich Architecture
 * 
 * This module provides a wrapper around the OpenRouter API to interact with
 * large language models. It handles token management, context tracking,
 * and retry logic.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  includeUsage?: boolean;
}

export interface LLMCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
  }>;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelUsed: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * LLM Client for making requests to OpenRouter API
 */
export class LLMClient {
  private apiKey: string;
  private defaultModel: string;
  private fallbackModel: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-opus-20240229';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3-sonnet-20240229';

    if (!this.apiKey) {
      throw new Error('Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env file.');
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://instabids.com', // Replace with actual domain
        'X-Title': 'InstaBids LLM Sandwich Architecture',
      },
    });
  }

  /**
   * Make a completion request to the LLM
   */
  async complete(
    request: LLMCompletionRequest,
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    
    const requestConfig: AxiosRequestConfig = {
      data: {
        model,
        messages: request.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences,
      }
    };

    // Add system prompt if provided and not already in messages
    if (options.systemPrompt && !request.messages.some(m => m.role === 'system')) {
      requestConfig.data.messages.unshift({
        role: 'system',
        content: options.systemPrompt
      });
    }

    return this.makeRequestWithRetry('/chat/completions', requestConfig, options);
  }

  /**
   * Make a request to OpenRouter with retry logic
   */
  private async makeRequestWithRetry(
    endpoint: string,
    config: AxiosRequestConfig,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    let lastError: any;
    let useFallback = false;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Use fallback model on retry
        if (useFallback && !options.model) {
          console.log(`Using fallback model: ${this.fallbackModel}`);
          config.data.model = this.fallbackModel;
        }

        const response = await this.axiosInstance.post(endpoint, config.data);
        
        const completion = response.data.choices[0]?.message?.content || '';
        
        // Extract token usage if requested
        let usage = undefined;
        if (options.includeUsage && response.data.usage) {
          usage = {
            promptTokens: response.data.usage.prompt_tokens,
            completionTokens: response.data.usage.completion_tokens,
            totalTokens: response.data.usage.total_tokens
          };
        }

        return {
          content: completion,
          usage,
          modelUsed: response.data.model
        };
      } catch (error: any) {
        lastError = error;
        console.error(`LLM request failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
        
        // If model is overloaded or unavailable, try fallback
        if (error.response?.status === 503 || error.response?.status === 429) {
          useFallback = true;
        }
        
        // Wait before retrying
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    // If all attempts failed, throw the last error
    throw new Error(`Failed to get completion after ${MAX_RETRIES} attempts: ${lastError.message}`);
  }
}

/**
 * Singleton instance of the LLM client
 */
export const llmClient = new LLMClient();
