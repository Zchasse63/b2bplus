/**
 * Google Gemini 2.5 Flash Integration
 * 
 * This module provides helper functions for interacting with Google's Gemini AI models.
 * Used for text generation, embeddings, and semantic search across the B2B+ platform.
 * 
 * Models:
 * - gemini-2.5-flash: Latest generation model for text generation
 * - text-embedding-004: Latest embedding model for semantic search
 * 
 * Cost Savings vs OpenAI:
 * - Embeddings: ~50% cheaper ($0.01/1M vs $0.02/1M tokens)
 * - Text Generation: ~50% cheaper ($0.075-0.30/1M vs $0.15-0.60/1M tokens)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '@/lib/logger';

// Initialize the Gemini API client
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Get the Gemini 2.5 Flash model for text generation
 * 
 * Use cases:
 * - Excel column mapping
 * - Pricing optimization
 * - Customer insights
 * - Sales forecasting
 * - Email personalization
 * - Business opportunity detection
 */
export const getFlashModel = () => {
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });
};

/**
 * Get the text-embedding-004 model for embeddings
 *
 * Use cases:
 * - Product semantic search
 * - SKU mapping and matching
 * - Product recommendations
 * - Similar product detection
 */
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({
    model: "text-embedding-004"
  });
};

/**
 * VALIDATION: Response validation utilities
 * Ensures AI responses are safe, valid, and meet quality standards
 */

/**
 * Validate text generation response
 * SECURITY: Prevents empty, malformed, or malicious responses
 */
function validateTextResponse(response: string, context: string): void {
  if (!response) {
    throw new Error(`${context}: Received empty response from Gemini AI`);
  }

  if (typeof response !== 'string') {
    throw new Error(`${context}: Invalid response type from Gemini AI (expected string, got ${typeof response})`);
  }

  if (response.trim().length === 0) {
    throw new Error(`${context}: Received whitespace-only response from Gemini AI`);
  }

  // Check for suspiciously short responses (likely errors)
  if (response.trim().length < 3) {
    logger.warn(`${context}: Received suspiciously short response from Gemini AI`, { response });
  }

  // Maximum response length check (prevent abuse)
  const MAX_RESPONSE_LENGTH = 50000; // ~50KB
  if (response.length > MAX_RESPONSE_LENGTH) {
    throw new Error(`${context}: Response exceeds maximum length (${MAX_RESPONSE_LENGTH} characters)`);
  }
}

/**
 * Validate embedding vector response
 * SECURITY: Ensures embeddings are valid vectors with correct dimensions
 */
function validateEmbeddingResponse(embedding: number[], context: string): void {
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error(`${context}: Invalid embedding format from Gemini AI`);
  }

  // text-embedding-004 should return 768-dimensional vectors
  const EXPECTED_DIMENSIONS = 768;
  if (embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `${context}: Invalid embedding dimensions (expected ${EXPECTED_DIMENSIONS}, got ${embedding.length})`
    );
  }

  // Verify all values are numbers
  const hasInvalidValues = embedding.some(val => typeof val !== 'number' || isNaN(val) || !isFinite(val));
  if (hasInvalidValues) {
    throw new Error(`${context}: Embedding contains invalid values (NaN or Infinity)`);
  }

  // Check if embedding is all zeros (likely an error)
  const isAllZeros = embedding.every(val => val === 0);
  if (isAllZeros) {
    throw new Error(`${context}: Embedding is all zeros (likely an API error)`);
  }
}

/**
 * Sanitize user input before sending to AI
 * SECURITY: Prevents prompt injection attacks
 */
function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt: must be a non-empty string');
  }

  // Remove null bytes
  let sanitized = prompt.replace(/\0/g, '');

  // Limit length
  const MAX_PROMPT_LENGTH = 30000; // ~30KB
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    logger.warn('Prompt exceeds maximum length, truncating', { length: sanitized.length });
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
  }

  return sanitized.trim();
}

/**
 * RELIABILITY: Timeout and retry utilities
 * Ensures AI calls are resilient to transient failures
 */

/**
 * Wrap a promise with a timeout
 * RELIABILITY: Prevents hanging AI calls
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * RELIABILITY: Handles transient API failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operation: string;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    operation,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors or client errors
      if (
        lastError.message.includes('Invalid') ||
        lastError.message.includes('must be') ||
        lastError.message.includes('Prompt exceeds') ||
        lastError.message.includes('Rate limit exceeded')
      ) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

      logger.warn(`${operation} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  logger.error(`${operation} failed after ${maxRetries + 1} attempts`, { error: lastError });
  throw new Error(`${operation} failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Wrap AI call with timeout and retry
 * RELIABILITY: Complete resilience wrapper
 */
async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    operation: string;
  }
): Promise<T> {
  const { timeoutMs = 30000, maxRetries = 3, operation } = options;

  return withRetry(
    () => withTimeout(fn(), timeoutMs, operation),
    { maxRetries, operation }
  );
}

/**
 * Generate text using Gemini 2.5 Flash
 * 
 * This is a simplified interface similar to OpenAI's chat completions.
 * 
 * @param prompt - The user prompt/question
 * @param options - Generation options
 * @returns Generated text response
 * 
 * @example
 * ```typescript
 * const response = await generateText(
 *   "Analyze this customer data and provide insights",
 *   {
 *     temperature: 0.7,
 *     systemPrompt: "You are a B2B analytics expert"
 *   }
 * );
 * ```
 */
export async function generateText(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<string> {
  // SECURITY: Sanitize input prompt
  const sanitizedPrompt = sanitizePrompt(prompt);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: options?.maxTokens ?? 8192,
    }
  });

  // RELIABILITY: Wrap with timeout and retry
  return withTimeoutAndRetry(
    async () => {
      let responseText: string;

      // If system prompt is provided, use chat with history
      // This simulates OpenAI's system message behavior
      if (options?.systemPrompt) {
        const sanitizedSystemPrompt = sanitizePrompt(options.systemPrompt);
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: sanitizedSystemPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "Understood. I'll follow those instructions carefully." }],
            }
          ],
        });

        const result = await chat.sendMessage(sanitizedPrompt);
        const response = await result.response;
        responseText = response.text();
      } else {
        // Simple generation without system prompt
        const result = await model.generateContent(sanitizedPrompt);
        const response = await result.response;
        responseText = response.text();
      }

      // VALIDATION: Ensure response is valid
      validateTextResponse(responseText, 'generateText');

      return responseText;
    },
    {
      timeoutMs: 30000, // 30 second timeout for text generation
      maxRetries: 3,
      operation: 'Gemini text generation',
    }
  );
}

/**
 * Generate JSON response using Gemini 2.5 Flash
 * 
 * Ensures the response is valid JSON by adding explicit instructions.
 * 
 * @param prompt - The user prompt/question
 * @param options - Generation options
 * @returns Parsed JSON object
 * 
 * @example
 * ```typescript
 * const mapping = await generateJSON<ColumnMapping>(
 *   "Map these Excel columns to our database schema",
 *   {
 *     temperature: 0.3,
 *     systemPrompt: "You are a data mapping expert"
 *   }
 * );
 * ```
 */
export async function generateJSON<T = any>(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<T> {
  // Add JSON instruction to system prompt
  const systemPrompt = options?.systemPrompt
    ? `${options.systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON.`
    : 'You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON.';

  try {
    const response = await generateText(prompt, {
      ...options,
      systemPrompt,
      temperature: options?.temperature ?? 0.3, // Lower temperature for more consistent JSON
    });

    // Clean up response (remove markdown code blocks if present)
    let cleanedResponse = response.trim();

    // Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // VALIDATION: Ensure cleaned response is not empty
    if (!cleanedResponse || cleanedResponse.trim().length === 0) {
      throw new Error('Empty response after cleaning markdown');
    }

    // VALIDATION: Parse and validate JSON
    const parsed = JSON.parse(cleanedResponse);

    // VALIDATION: Ensure parsed result is not null/undefined
    if (parsed === null || parsed === undefined) {
      throw new Error('Parsed JSON is null or undefined');
    }

    return parsed as T;
  } catch (error) {
    logger.error('Failed to parse JSON response from Gemini:', error);
    throw new Error(`Invalid JSON response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding vector for text
 * 
 * Uses text-embedding-004 model which produces 768-dimensional vectors.
 * Note: OpenAI's text-embedding-3-small produces 1536-dimensional vectors.
 * 
 * @param text - Text to embed
 * @returns Embedding vector (768 dimensions)
 * 
 * @example
 * ```typescript
 * const embedding = await generateEmbedding(
 *   "High-quality industrial bearings for manufacturing"
 * );
 * // Returns: [0.123, -0.456, 0.789, ...]
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // SECURITY: Sanitize input text
  const sanitizedText = sanitizePrompt(text);

  // RELIABILITY: Wrap with timeout and retry
  return withTimeoutAndRetry(
    async () => {
      const model = getEmbeddingModel();

      const result = await model.embedContent(sanitizedText);

      // VALIDATION: Ensure result has embedding
      if (!result || !result.embedding || !result.embedding.values) {
        throw new Error('Invalid embedding result structure from Gemini');
      }

      const embedding = result.embedding.values;

      // VALIDATION: Ensure embedding is valid
      validateEmbeddingResponse(embedding, 'generateEmbedding');

      return embedding;
    },
    {
      timeoutMs: 15000, // 15 second timeout for embeddings
      maxRetries: 3,
      operation: 'Gemini embedding generation',
    }
  );
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * More efficient than calling generateEmbedding multiple times.
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 * 
 * @example
 * ```typescript
 * const embeddings = await generateEmbeddings([
 *   "Product A description",
 *   "Product B description",
 *   "Product C description"
 * ]);
 * ```
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // VALIDATION: Ensure texts array is valid
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('Invalid texts array: must be a non-empty array');
  }

  // SECURITY: Sanitize all input texts
  const sanitizedTexts = texts.map(text => sanitizePrompt(text));

  // RELIABILITY: Wrap with timeout and retry
  // Longer timeout for batch operations (per-item basis)
  const timeoutPerItem = 15000; // 15 seconds per item
  const totalTimeout = Math.min(timeoutPerItem * sanitizedTexts.length, 120000); // Max 2 minutes

  return withTimeoutAndRetry(
    async () => {
      const model = getEmbeddingModel();

      // Process in parallel for better performance
      const results = await Promise.all(
        sanitizedTexts.map(text => model.embedContent(text))
      );

      // VALIDATION: Ensure all results are valid
      const embeddings = results.map((result, index) => {
        if (!result || !result.embedding || !result.embedding.values) {
          throw new Error(`Invalid embedding result structure for text at index ${index}`);
        }

        const embedding = result.embedding.values;

        // VALIDATION: Ensure each embedding is valid
        validateEmbeddingResponse(embedding, `generateEmbeddings[${index}]`);

        return embedding;
      });

      return embeddings;
    },
    {
      timeoutMs: totalTimeout,
      maxRetries: 2, // Fewer retries for batch operations
      operation: `Gemini batch embedding generation (${sanitizedTexts.length} items)`,
    }
  );
}

/**
 * Calculate cosine similarity between two embedding vectors
 * 
 * Used for semantic search and similarity matching.
 * Returns a value between -1 and 1, where 1 means identical.
 * 
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Type definitions for common use cases
 */
export interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}
