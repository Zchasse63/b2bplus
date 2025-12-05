/**
 * xAI (Grok) Provider Configuration
 *
 * This module configures the xAI provider for use with Vercel AI SDK.
 * Grok 4.1 Fast models provide excellent performance at competitive pricing.
 *
 * Models:
 * - grok-4.1-fast: Fast model for simple operations ($0.15/1M input, $0.50/1M output)
 * - grok-4.1-fast-reasoning: Reasoning model for complex analysis ($0.30/1M input, $0.50/1M output)
 *
 * Both models support 2M context window.
 */

import { createXai } from '@ai-sdk/xai';

// Initialize xAI provider
// API key is read from XAI_API_KEY environment variable
export const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

/**
 * Grok model configurations
 *
 * Usage guidelines:
 * - fast: Use for 90% of operations (search, cart, CRUD, navigation)
 * - reasoning: Use for complex analysis (document parsing, analytics, insights)
 */
export const grokModels = {
  /**
   * Grok 4.1 Fast - Simple operations, low latency, cost-effective
   *
   * Use cases:
   * - Product search
   * - Cart operations
   * - Order status
   * - Navigation
   * - Simple Q&A
   * - Real-time operations
   */
  fast: xai('grok-4.1-fast'),

  /**
   * Grok 4.1 Fast Reasoning - Complex analysis requiring multi-step thinking
   *
   * Use cases:
   * - Document parsing (CSV, Excel, PDF)
   * - Field mapping and schema detection
   * - Customer insights and churn prediction
   * - Price list parsing with regional pricing
   * - Error detection and correction suggestions
   * - Complex report generation
   * - Invoice processing
   * - Sales forecasting
   */
  reasoning: xai('grok-4.1-fast-reasoning'),
};

/**
 * Default model for most operations
 * Use grokModels.reasoning explicitly when complex analysis is needed
 */
export const defaultModel = grokModels.fast;

/**
 * Model selection helper
 *
 * @param requiresReasoning - Whether the task requires complex reasoning
 * @returns The appropriate model
 */
export function selectModel(requiresReasoning: boolean = false) {
  return requiresReasoning ? grokModels.reasoning : grokModels.fast;
}

/**
 * Default generation settings
 */
export const defaultSettings = {
  fast: {
    temperature: 0.7,
    maxTokens: 8192,
  },
  reasoning: {
    temperature: 0.3, // Lower for more deterministic output
    maxTokens: 8192,
  },
  structured: {
    temperature: 0.1, // Very low for consistent structured output
    maxTokens: 8192,
  },
};
