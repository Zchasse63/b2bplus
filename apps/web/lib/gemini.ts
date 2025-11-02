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
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: options?.maxTokens ?? 8192,
    }
  });

  // If system prompt is provided, use chat with history
  // This simulates OpenAI's system message behavior
  if (options?.systemPrompt) {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: options.systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I'll follow those instructions carefully." }],
        }
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  }

  // Simple generation without system prompt
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
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

  try {
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleanedResponse);
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
  const model = getEmbeddingModel();
  
  const result = await model.embedContent(text);
  
  // Gemini returns embedding in result.embedding.values
  return result.embedding.values;
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
  const model = getEmbeddingModel();
  
  // Process in parallel for better performance
  const results = await Promise.all(
    texts.map(text => model.embedContent(text))
  );
  
  return results.map(result => result.embedding.values);
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
