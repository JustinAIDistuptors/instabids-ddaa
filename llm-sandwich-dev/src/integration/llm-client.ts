/**
 * @file LLM Client
 * 
 * This file provides a client for interacting with large language models
 * for the LLM Sandwich Architecture. It serves as a core integration component
 * that both the guard layer and persistence layer will use to access LLM capabilities.
 */

import axios from 'axios';
import { setTimeout } from 'timers/promises';

/**
 * Available LLM providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OPENROUTER = 'openrouter',
  AZURE = 'azure',
}

/**
 * Configuration for the LLM client
 */
export interface LLMClientConfig {
  /** The LLM provider to use */
  provider: LLMProvider;
  /** Base URL for the API */
  baseUrl?: string;
  /** API key for authentication */
  apiKey: string;
  /** Default model to use */
  defaultModel: string;
  /** Default temperature setting (0.0-1.0) */
  defaultTemperature?: number;
  /** Default maximum tokens to generate */
  defaultMaxTokens?: number;
  /** Default system prompt to use */
  defaultSystemPrompt?: string;
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}

/**
 * Parameters for a completion request
 */
export interface CompletionParams {
  /** Model to use (overrides default) */
  model?: string;
  /** System prompt (overrides default) */
  systemPrompt?: string;
  /** User prompt/message */
  prompt: string;
  /** Temperature setting (overrides default) */
  temperature?: number;
  /** Maximum tokens to generate (overrides default) */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Function calling specifications */
  functions?: any[];
  /** Function to call */
  functionCall?: 'auto' | 'none' | { name: string };
}

/**
 * Represents a function that can be called by the LLM
 */
export interface LLMFunction {
  /** Name of the function */
  name: string;
  /** Description of what the function does */
  description: string;
  /** Parameters schema in JSON Schema format */
  parameters: Record<string, any>;
}

/**
 * Response from an LLM completion request
 */
export interface CompletionResponse {
  /** Generated text content */
  content: string;
  /** Function call if requested */
  functionCall?: {
    /** Name of the function called */
    name: string;
    /** Arguments to the function */
    arguments: Record<string, any>;
  };
  /** Usage information */
  usage?: {
    /** Prompt tokens used */
    promptTokens: number;
    /** Completion tokens used */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
  };
  /** Raw response from the provider */
  rawResponse?: any;
}

/**
 * Client for interacting with large language models
 */
export class LLMClient {
  private config: LLMClientConfig;
  private axiosInstance: any;

  /**
   * Create a new LLM client
   */
  constructor(config: LLMClientConfig) {
    // Set defaults
    this.config = {
      defaultTemperature: 0.7,
      defaultMaxTokens: 1000,
      debug: false,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: this.config.timeout,
      headers: this.getHeaders(),
    });

    // Log configuration if debug enabled
    if (this.config.debug) {
      console.log(`LLM Client initialized with provider: ${this.config.provider}`);
    }
  }

  /**
   * Get the base URL for the provider
   */
  private getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }

    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return 'https://api.openai.com/v1';
      case LLMProvider.ANTHROPIC:
        return 'https://api.anthropic.com/v1';
      case LLMProvider.OPENROUTER:
        return 'https://openrouter.ai/api/v1';
      case LLMProvider.AZURE:
        throw new Error('Azure OpenAI requires a custom baseUrl');
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * Get the headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.provider) {
      case LLMProvider.OPENAI:
      case LLMProvider.OPENROUTER:
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case LLMProvider.ANTHROPIC:
        headers['x-api-key'] = this.config.apiKey;
        break;
      case LLMProvider.AZURE:
        headers['api-key'] = this.config.apiKey;
        break;
    }

    return headers;
  }

  /**
   * Generate text completion
   */
  public async complete(params: CompletionParams): Promise<CompletionResponse> {
    // Start with defaults
    const model = params.model || this.config.defaultModel;
    const temperature = params.temperature ?? this.config.defaultTemperature;
    const maxTokens = params.maxTokens ?? this.config.defaultMaxTokens;
    const systemPrompt = params.systemPrompt || this.config.defaultSystemPrompt;

    let requestBody;
    let responseMapping;

    // Format request based on provider
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        requestBody = this.formatOpenAIRequest(model, params.prompt, systemPrompt, temperature, maxTokens, params.stopSequences, params.functions, params.functionCall);
        responseMapping = this.mapOpenAIResponse;
        break;
      case LLMProvider.ANTHROPIC:
        requestBody = this.formatAnthropicRequest(model, params.prompt, systemPrompt, temperature, maxTokens, params.stopSequences);
        responseMapping = this.mapAnthropicResponse;
        break;
      case LLMProvider.OPENROUTER:
        requestBody = this.formatOpenRouterRequest(model, params.prompt, systemPrompt, temperature, maxTokens, params.stopSequences, params.functions, params.functionCall);
        responseMapping = this.mapOpenRouterResponse;
        break;
      case LLMProvider.AZURE:
        requestBody = this.formatAzureRequest(model, params.prompt, systemPrompt, temperature, maxTokens, params.stopSequences, params.functions, params.functionCall);
        responseMapping = this.mapAzureResponse;
        break;
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }

    // Log request if debug enabled
    if (this.config.debug) {
      console.log(`LLM Request to ${this.config.provider}:`, JSON.stringify(requestBody, null, 2));
    }

    // Send request with retries
    return this.sendWithRetry(requestBody, responseMapping);
  }

  /**
   * Send request with retry logic
   */
  private async sendWithRetry(
    requestBody: any, 
    responseMapper: (response: any) => CompletionResponse
  ): Promise<CompletionResponse> {
    let lastError;
    
    for (let attempt = 1; attempt <= (this.config.maxRetries! + 1); attempt++) {
      try {
        const endpoint = this.getCompletionEndpoint();
        const response = await this.axiosInstance.post(endpoint, requestBody);
        
        // Log response if debug enabled
        if (this.config.debug) {
          console.log(`LLM Response (attempt ${attempt}):`, JSON.stringify(response.data, null, 2));
        }
        
        return responseMapper(response.data);
      } catch (error: any) {
        lastError = error;
        
        // Log error if debug enabled
        if (this.config.debug) {
          console.error(`LLM Error (attempt ${attempt}):`, error.response?.data || error.message);
        }
        
        // Check if we should retry
        if (attempt <= this.config.maxRetries!) {
          const retryDelay = this.config.retryDelay! * attempt;
          
          if (this.config.debug) {
            console.log(`Retrying in ${retryDelay}ms...`);
          }
          
          await setTimeout(retryDelay);
        } else {
          break;
        }
      }
    }
    
    // If we get here, all retries have failed
    throw lastError;
  }

  /**
   * Get the completion endpoint for the provider
   */
  private getCompletionEndpoint(): string {
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return '/chat/completions';
      case LLMProvider.ANTHROPIC:
        return '/complete';
      case LLMProvider.OPENROUTER:
        return '/chat/completions';
      case LLMProvider.AZURE:
        return '/chat/completions';
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * Format request for OpenAI
   */
  private formatOpenAIRequest(
    model: string,
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number,
    stopSequences?: string[],
    functions?: any[],
    functionCall?: 'auto' | 'none' | { name: string }
  ): any {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt,
    });
    
    const request: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    
    if (stopSequences && stopSequences.length > 0) {
      request.stop = stopSequences;
    }
    
    if (functions && functions.length > 0) {
      request.functions = functions;
      
      if (functionCall) {
        request.function_call = functionCall;
      }
    }
    
    return request;
  }

  /**
   * Format request for Anthropic
   */
  private formatAnthropicRequest(
    model: string,
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number,
    stopSequences?: string[]
  ): any {
    const request: any = {
      model,
      prompt: `${systemPrompt ? `\n\nHuman: ${systemPrompt}\n\nAssistant: I'll follow these instructions.\n\n` : ''}Human: ${prompt}\n\nAssistant:`,
      temperature,
      max_tokens_to_sample: maxTokens,
    };
    
    if (stopSequences && stopSequences.length > 0) {
      request.stop_sequences = stopSequences;
    }
    
    return request;
  }

  /**
   * Format request for OpenRouter (compatible with OpenAI format)
   */
  private formatOpenRouterRequest(
    model: string,
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number,
    stopSequences?: string[],
    functions?: any[],
    functionCall?: 'auto' | 'none' | { name: string }
  ): any {
    return this.formatOpenAIRequest(
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      stopSequences,
      functions,
      functionCall
    );
  }

  /**
   * Format request for Azure OpenAI
   */
  private formatAzureRequest(
    model: string,
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number,
    stopSequences?: string[],
    functions?: any[],
    functionCall?: 'auto' | 'none' | { name: string }
  ): any {
    return this.formatOpenAIRequest(
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      stopSequences,
      functions,
      functionCall
    );
  }

  /**
   * Map OpenAI response to standard format
   */
  private mapOpenAIResponse(response: any): CompletionResponse {
    const choice = response.choices[0];
    const result: CompletionResponse = {
      content: choice.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      rawResponse: response,
    };
    
    // Handle function calls
    if (choice.message?.function_call) {
      let args = {};
      try {
        args = JSON.parse(choice.message.function_call.arguments);
      } catch (e) {
        console.error('Error parsing function arguments:', e);
      }
      
      result.functionCall = {
        name: choice.message.function_call.name,
        arguments: args,
      };
    }
    
    return result;
  }

  /**
   * Map Anthropic response to standard format
   */
  private mapAnthropicResponse(response: any): CompletionResponse {
    return {
      content: response.completion || '',
      usage: {
        promptTokens: 0, // Anthropic doesn't provide token usage in this format
        completionTokens: 0,
        totalTokens: 0,
      },
      rawResponse: response,
    };
  }

  /**
   * Map OpenRouter response to standard format (compatible with OpenAI format)
   */
  private mapOpenRouterResponse(response: any): CompletionResponse {
    return this.mapOpenAIResponse(response);
  }

  /**
   * Map Azure OpenAI response to standard format (compatible with OpenAI format)
   */
  private mapAzureResponse(response: any): CompletionResponse {
    return this.mapOpenAIResponse(response);
  }
}

/**
 * Create a standard LLM client using environment variables
 */
export function createDefaultLLMClient(): LLMClient {
  const provider = process.env.LLM_PROVIDER as LLMProvider || LLMProvider.OPENAI;
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
  
  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set');
  }
  
  return new LLMClient({
    provider,
    apiKey,
    defaultModel: model,
    defaultSystemPrompt: "You are a helpful assistant that helps with database operations and architecture enforcement.",
    debug: process.env.LLM_DEBUG === 'true',
  });
}
