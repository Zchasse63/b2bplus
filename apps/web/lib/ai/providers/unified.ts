/**
 * Unified AI Provider
 *
 * This module provides AI functions using Vercel AI SDK + Grok (xAI).
 * All Gemini dependencies have been removed.
 */

import { generateText as aiGenerateText, generateObject, streamText } from 'ai';
import { z } from 'zod';
import { grokModels, defaultModel, defaultSettings } from './xai';

/**
 * Generate text using Grok
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const result = await aiGenerateText({
    model: defaultModel,
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? defaultSettings.fast.temperature,
    maxTokens: options?.maxTokens ?? defaultSettings.fast.maxTokens,
  });

  return result.text;
}

/**
 * Generate structured JSON output using Grok
 * Uses Zod schema for type-safe structured output
 */
export async function generateJSON<T>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    schema?: z.ZodType<T>;
  }
): Promise<T> {
  // If schema provided, use generateObject for type safety
  if (options?.schema) {
    const result = await generateObject({
      model: defaultModel,
      schema: options.schema,
      prompt: options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt,
      temperature: options?.temperature ?? defaultSettings.structured.temperature,
    });
    return result.object;
  }

  // Fallback to text generation with JSON instruction
  const result = await aiGenerateText({
    model: defaultModel,
    prompt: `${options?.systemPrompt || ''}\n\nRespond with valid JSON only. No markdown, no code blocks.\n\n${prompt}`,
    temperature: options?.temperature ?? defaultSettings.structured.temperature,
  });

  return JSON.parse(result.text);
}

/**
 * Generate text with reasoning model (complex tasks)
 */
export async function generateTextPro(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const result = await aiGenerateText({
    model: grokModels.reasoning, // Use reasoning model
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? defaultSettings.reasoning.temperature,
    maxTokens: options?.maxTokens ?? defaultSettings.reasoning.maxTokens,
  });

  return result.text;
}

/**
 * Generate structured JSON with reasoning model
 */
export async function generateJSONPro<T>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    schema?: z.ZodType<T>;
  }
): Promise<T> {
  if (options?.schema) {
    const result = await generateObject({
      model: grokModels.reasoning,
      schema: options.schema,
      prompt: options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt,
      temperature: options?.temperature ?? defaultSettings.structured.temperature,
    });
    return result.object;
  }

  const result = await aiGenerateText({
    model: grokModels.reasoning,
    prompt: `${options?.systemPrompt || ''}\n\nRespond with valid JSON only. No markdown, no code blocks.\n\n${prompt}`,
    temperature: options?.temperature ?? defaultSettings.structured.temperature,
  });

  return JSON.parse(result.text);
}

/**
 * Stream text generation for real-time responses
 */
export async function streamTextResponse(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    useReasoning?: boolean;
  }
) {
  const model = options?.useReasoning ? grokModels.reasoning : defaultModel;

  return streamText({
    model,
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? defaultSettings.fast.temperature,
    maxTokens: options?.maxTokens ?? defaultSettings.fast.maxTokens,
  });
}

/**
 * Generate structured object with Zod schema validation
 */
export async function generateStructuredObject<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: {
    temperature?: number;
    systemPrompt?: string;
    useReasoning?: boolean;
  }
): Promise<T> {
  const model = options?.useReasoning ? grokModels.reasoning : defaultModel;

  const result = await generateObject({
    model,
    schema,
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? defaultSettings.structured.temperature,
  });

  return result.object;
}

/**
 * Placeholder for embeddings (not available in xAI yet)
 * TODO: Implement when xAI supports embeddings or use alternative
 */
export async function generateEmbedding(_text: string): Promise<number[]> {
  throw new Error('Embeddings not yet supported. Consider using Supabase pgvector or alternative embedding service.');
}

export async function generateEmbeddings(_texts: string[]): Promise<number[][]> {
  throw new Error('Embeddings not yet supported. Consider using Supabase pgvector or alternative embedding service.');
}

export function cosineSimilarity(_a: number[], _b: number[]): number {
  throw new Error('Embeddings not yet supported. Consider using Supabase pgvector or alternative embedding service.');
}

/**
 * Placeholder for image analysis (not available in xAI yet)
 * TODO: Implement when xAI supports vision
 */
export async function analyzeImageJSON<T>(
  _imageUrl: string,
  _prompt: string,
  _options?: {
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<T> {
  throw new Error('Image analysis not yet supported in xAI. Consider using alternative vision service.');
}

/**
 * Placeholder for document processing (not available in xAI yet)
 * TODO: Implement when xAI supports document processing
 */
export async function processDocumentJSON<T>(
  _document: string | Buffer,
  _prompt: string,
  _options?: {
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<T> {
  throw new Error('Document processing not yet supported in xAI. Consider using alternative document processing service.');
}
