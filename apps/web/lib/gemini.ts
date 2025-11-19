/**
 * Google Gemini 2.5 Flash & Pro Integration
 *
 * This module provides helper functions for interacting with Google's Gemini AI models.
 * Used for text generation, embeddings, and semantic search across the B2B+ platform.
 *
 * Models:
 * - gemini-2.5-flash: Fast, cost-effective model for high-volume operations
 * - gemini-2.5-pro: Advanced model for complex reasoning and calculations
 * - text-embedding-004: Latest embedding model for semantic search
 *
 * Model Selection Strategy:
 * - Use Flash for: Real-time operations, high-volume tasks, content generation
 * - Use Pro for: Pricing optimization, forecasting, financial calculations, complex analytics
 *
 * Cost Comparison:
 * - Flash: ~50% cheaper than OpenAI ($0.075-0.30/1M tokens)
 * - Pro: ~2x Flash cost, but superior accuracy for complex reasoning
 * - Embeddings: ~50% cheaper ($0.01/1M vs $0.02/1M tokens)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client lazily
const getGenAI = () => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
};

/**
 * Sanitize error messages to prevent API key exposure in logs
 * Removes API keys and sensitive tokens from error messages
 */
function sanitizeError(error: any): string {
  if (!error) return 'Unknown error';

  const errorStr = String(error);
  // Remove API key patterns
  return errorStr
    .replace(/AIzaSy[A-Za-z0-9_-]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[A-Za-z0-9_-]{40,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer [A-Za-z0-9_-]{40,}/g, '[REDACTED_TOKEN]');
}

/**
 * Get the Gemini 2.5 Flash model for text generation
 *
 * Use cases:
 * - Excel column mapping
 * - Email personalization
 * - Chatbot responses
 * - Content generation
 * - Quick Q&A
 * - Real-time operations
 */
export const getFlashModel = () => {
  return getGenAI().getGenerativeModel({
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
 * Get the Gemini 2.5 Pro model for complex reasoning
 *
 * Use cases:
 * - Pricing optimization and analysis
 * - Sales forecasting and predictions
 * - Customer insights and analytics
 * - Business opportunity detection
 * - Invoice processing and reconciliation
 * - Reorder predictions
 * - Complex financial calculations
 * - Multi-step reasoning tasks
 */
export const getProModel = () => {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.3,  // Lower temperature for more deterministic reasoning
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
  return getGenAI().getGenerativeModel({
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
  try {
    const model = getGenAI().getGenerativeModel({
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
  } catch (error: any) {
    console.error('Gemini API error:', sanitizeError(error));
    throw error;
  }
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
    console.error('Failed to parse JSON response:', sanitizeError(error));
    throw new Error(`Invalid JSON response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate text using Gemini 2.5 Pro for complex reasoning
 *
 * Use this for tasks requiring deep analysis, multi-step reasoning,
 * or high-accuracy calculations where precision is critical.
 *
 * @param prompt - The user prompt/question
 * @param options - Generation options
 * @returns Generated text response
 *
 * @example
 * ```typescript
 * const analysis = await generateTextPro(
 *   "Analyze pricing strategy considering market dynamics, competitor pricing, and demand elasticity",
 *   {
 *     temperature: 0.2,
 *     systemPrompt: "You are a pricing optimization expert"
 *   }
 * );
 * ```
 */
export async function generateTextPro(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<string> {
  try {
    const model = getGenAI().getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: options?.temperature ?? 0.3,  // Lower default for Pro
        topP: 0.95,
        topK: 40,
        maxOutputTokens: options?.maxTokens ?? 8192,
      }
    });

    // If system prompt is provided, use chat with history
    if (options?.systemPrompt) {
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: options.systemPrompt }],
          },
          {
            role: "model",
            parts: [{ text: "Understood. I'll apply deep reasoning and analysis to provide accurate, well-considered responses." }],
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
  } catch (error: any) {
    console.error('Gemini Pro API error:', sanitizeError(error));
    throw error;
  }
}

/**
 * Generate JSON response using Gemini 2.5 Pro for complex structured reasoning
 *
 * Use this for tasks requiring precise calculations, financial analysis,
 * forecasting, or complex decision-making that needs structured output.
 *
 * @param prompt - The user prompt/question
 * @param options - Generation options
 * @returns Parsed JSON object
 *
 * @example
 * ```typescript
 * const forecast = await generateJSONPro<ForecastResult>(
 *   "Predict product demand for next quarter based on historical data",
 *   {
 *     temperature: 0.2,
 *     systemPrompt: "You are a demand forecasting expert"
 *   }
 * );
 * ```
 */
export async function generateJSONPro<T = any>(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<T> {
  // Add JSON instruction to system prompt
  const systemPrompt = options?.systemPrompt
    ? `${options.systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON. Apply deep reasoning and analysis to ensure accuracy.`
    : 'You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON. Apply deep reasoning and analysis to ensure accuracy.';

  const response = await generateTextPro(prompt, {
    ...options,
    systemPrompt,
    temperature: options?.temperature ?? 0.2, // Even lower temperature for Pro JSON
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
    console.error('Failed to parse JSON response from Pro model:', sanitizeError(error));
    throw new Error(`Invalid JSON response from Gemini Pro: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * Process a PDF or image document with Gemini multimodal capabilities
 *
 * Gemini 2.5 Flash and Pro support multimodal input including PDFs and images.
 * This function extracts text and structured data from documents.
 *
 * @param fileBuffer - Buffer containing the file data
 * @param mimeType - MIME type of the file (e.g., 'application/pdf', 'image/jpeg')
 * @param prompt - Instructions for what to extract from the document
 * @param options - Generation options
 * @returns Extracted text or data
 *
 * @example
 * ```typescript
 * const invoiceData = await processDocument(
 *   pdfBuffer,
 *   'application/pdf',
 *   'Extract invoice number, date, vendor name, line items, and total amount',
 *   { usePro: true }
 * );
 * ```
 */
export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string,
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    usePro?: boolean; // Use Pro model for complex documents
  }
): Promise<string> {
  const modelName = options?.usePro ? "gemini-2.5-pro" : "gemini-2.5-flash";

  const model = getGenAI().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options?.temperature ?? (options?.usePro ? 0.3 : 0.7),
      topP: 0.95,
      topK: 40,
      maxOutputTokens: options?.maxTokens ?? 8192,
    }
  });

  // Convert buffer to base64
  const base64Data = fileBuffer.toString('base64');

  // Build the parts array with system prompt if provided
  const parts: any[] = [];

  if (options?.systemPrompt) {
    parts.push({ text: options.systemPrompt + '\n\n' + prompt });
  } else {
    parts.push({ text: prompt });
  }

  // Add the document as inline data
  parts.push({
    inlineData: {
      mimeType,
      data: base64Data
    }
  });

  const result = await model.generateContent(parts);
  const response = await result.response;
  return response.text();
}

/**
 * Process a PDF or image document and return structured JSON
 *
 * Similar to processDocument but ensures the response is valid JSON.
 * Ideal for extracting structured data from invoices, receipts, forms, etc.
 *
 * @param fileBuffer - Buffer containing the file data
 * @param mimeType - MIME type of the file
 * @param prompt - Instructions for what to extract (should specify JSON schema)
 * @param options - Generation options
 * @returns Parsed JSON object
 *
 * @example
 * ```typescript
 * interface InvoiceData {
 *   invoice_number: string;
 *   date: string;
 *   vendor_name: string;
 *   total: number;
 *   line_items: Array<{sku: string; description: string; quantity: number; price: number}>;
 * }
 *
 * const data = await processDocumentJSON<InvoiceData>(
 *   pdfBuffer,
 *   'application/pdf',
 *   'Extract invoice data and return as JSON with fields: invoice_number, date, vendor_name, total, line_items',
 *   { usePro: true }
 * );
 * ```
 */
export async function processDocumentJSON<T = any>(
  fileBuffer: Buffer,
  mimeType: string,
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    usePro?: boolean;
  }
): Promise<T> {
  // Add JSON instruction to system prompt
  const systemPrompt = options?.systemPrompt
    ? `${options.systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON.`
    : 'You must respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text. Just pure JSON.';

  const response = await processDocument(fileBuffer, mimeType, prompt, {
    ...options,
    systemPrompt,
    temperature: options?.temperature ?? (options?.usePro ? 0.2 : 0.3),
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
    console.error('Failed to parse JSON response from document processing:', cleanedResponse);
    throw new Error(`Invalid JSON response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze a base64-encoded image and return structured JSON
 *
 * @param base64Image - Base64 encoded image data (with or without data URI prefix)
 * @param prompt - Instructions for what to extract from the image
 * @param mimeType - MIME type of the image (default: 'image/jpeg')
 * @param options - Generation options
 * @returns Parsed JSON object
 *
 * @example
 * ```typescript
 * const analysis = await analyzeImageJSON<ProductAnalysis>(
 *   base64ImageData,
 *   'Analyze this product image and extract: product_type, material, color, features',
 *   'image/jpeg'
 * );
 * ```
 */
export async function analyzeImageJSON<T = any>(
  base64Image: string,
  prompt: string,
  mimeType: string = 'image/jpeg',
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<T> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: options?.maxTokens ?? 8192,
    }
  });

  // Build the parts array
  const parts: any[] = [];

  if (options?.systemPrompt) {
    parts.push({ text: options.systemPrompt + '\n\n' + prompt });
  } else {
    parts.push({ text: prompt });
  }

  // Add the image as inline data
  parts.push({
    inlineData: {
      mimeType,
      data: base64Image
    }
  });

  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  // Clean up response (remove markdown code blocks if present)
  let cleanedResponse = text.trim();

  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse JSON response from image analysis:', cleanedResponse);
    throw new Error(`Invalid JSON response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

export interface DocumentProcessingOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  usePro?: boolean;
}
