/**
 * Unified AI Provider with Feature Flag
 *
 * This module provides drop-in replacements for existing Gemini functions
 * that use Vercel AI SDK + Grok internally when USE_GROK is enabled.
 *
 * Migration strategy:
 * 1. Set USE_GROK=false to use existing Gemini (fallback)
 * 2. Set USE_GROK=true to use new Grok implementation
 * 3. Once migrated, remove feature flag and Gemini code
 */

import { generateText as aiGenerateText, generateObject, streamText } from 'ai';
import { z } from 'zod';
import { grokModels, defaultModel, defaultSettings } from './xai';

// Feature flag to control rollout
const USE_GROK = process.env.USE_GROK !== 'false'; // Default to true now

/**
 * Drop-in replacement for existing generateText
 * Falls back to Gemini if USE_GROK is false
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  if (!USE_GROK) {
    // Use existing Gemini implementation
    const { generateText: geminiGenerateText } = await import('../../gemini');
    return geminiGenerateText(prompt, options);
  }

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
 * Drop-in replacement for existing generateJSON
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
  if (!USE_GROK) {
    // Use existing Gemini implementation
    const { generateJSON: geminiGenerateJSON } = await import('../../gemini');
    return geminiGenerateJSON<T>(prompt, options);
  }

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
 * Drop-in replacement for generateTextPro (complex reasoning)
 */
export async function generateTextPro(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  if (!USE_GROK) {
    const { generateTextPro: geminiGenerateTextPro } = await import('../../gemini');
    return geminiGenerateTextPro(prompt, options);
  }

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
 * Drop-in replacement for generateJSONPro
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
  if (!USE_GROK) {
    const { generateJSONPro: geminiGenerateJSONPro } = await import('../../gemini');
    return geminiGenerateJSONPro<T>(prompt, options);
  }

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

// Re-export for embeddings (still use Gemini for now as xAI doesn't have embeddings)
export { generateEmbedding, generateEmbeddings, cosineSimilarity } from '../../gemini';
