/**
 * Parallel AI Execution Utilities
 * 
 * Task 2.3: Implement Parallel AI Calls
 * - Execute multiple AI operations in parallel using Promise.all
 * - Optimize customer insights, opportunity detection, and forecast generation
 * - Reduce total execution time by running independent operations concurrently
 */

import { generateTextPro, generateText, generateJSON } from '@/lib/ai/providers/unified';

/**
 * Execute multiple AI text generation calls in parallel
 */
export async function generateTextsInParallel(
  prompts: Array<{ prompt: string; usePro?: boolean }>,
  options?: { temperature?: number }
): Promise<string[]> {
  const promises = prompts.map(({ prompt, usePro }) =>
    usePro
      ? generateTextPro(prompt, options)
      : generateText(prompt, options)
  );

  return Promise.all(promises);
}

/**
 * Execute multiple AI JSON generation calls in parallel
 */
export async function generateJSONsInParallel<T = any>(
  prompts: Array<{ prompt: string; schema?: any }>,
  options?: { temperature?: number }
): Promise<T[]> {
  const promises = prompts.map(({ prompt }) =>
    generateJSON<T>(prompt, options)
  );

  return Promise.all(promises);
}

/**
 * Generate customer insights in parallel
 * - Purchase patterns
 * - Product recommendations
 * - Churn risk assessment
 * - Upsell opportunities
 */
export async function generateCustomerInsightsParallel(
  customerData: {
    recentOrders: any[];
    topProducts: any[];
    totalSpend: number;
    accountStatus: string;
  }
): Promise<{
  purchasePatterns: string;
  recommendations: string;
  churnRisk: string;
  upsellOpportunities: string;
}> {
  const prompts = [
    {
      prompt: `Analyze purchase patterns for customer with ${customerData.recentOrders.length} recent orders and $${customerData.totalSpend} total spend. Provide insights.`,
      usePro: false,
    },
    {
      prompt: `Based on top products: ${JSON.stringify(customerData.topProducts)}, recommend 3 complementary products.`,
      usePro: false,
    },
    {
      prompt: `Assess churn risk for customer with account status: ${customerData.accountStatus} and recent activity: ${customerData.recentOrders.length} orders.`,
      usePro: true,
    },
    {
      prompt: `Identify upsell opportunities based on purchase history: ${JSON.stringify(customerData.recentOrders.slice(0, 3))}.`,
      usePro: false,
    },
  ];

  const [purchasePatterns, recommendations, churnRisk, upsellOpportunities] =
    await generateTextsInParallel(prompts);

  return {
    purchasePatterns,
    recommendations,
    churnRisk,
    upsellOpportunities,
  };
}

/**
 * Detect multiple opportunity types in parallel
 * - Stopped buying
 * - Cross-sell
 * - Upsell
 */
export async function detectOpportunitiesParallel(
  customerData: any,
  productData: any[]
): Promise<{
  stoppedBuying: any[];
  crossSell: any[];
  upsell: any[];
}> {
  const prompts = [
    {
      prompt: `Analyze customer purchase history and identify products they stopped buying: ${JSON.stringify(customerData)}`,
    },
    {
      prompt: `Identify cross-sell opportunities based on current purchases: ${JSON.stringify(productData)}`,
    },
    {
      prompt: `Identify upsell opportunities for higher-value products: ${JSON.stringify(productData)}`,
    },
  ];

  const [stoppedBuying, crossSell, upsell] = await generateJSONsInParallel(prompts);

  return {
    stoppedBuying: stoppedBuying || [],
    crossSell: crossSell || [],
    upsell: upsell || [],
  };
}

/**
 * Generate pricing recommendations for multiple products in parallel
 */
export async function generatePricingRecommendationsParallel(
  products: Array<{
    productId: string;
    customerId: string;
    currentPrice: number;
    historicalData: any;
  }>
): Promise<
  Array<{
    productId: string;
    suggestedPrice: number;
    winProbability: number;
    reasoning: string;
  }>
> {
  const promises = products.map(async (product) => {
    const prompt = `Generate pricing recommendation for product ${product.productId} with current price $${product.currentPrice}. Historical data: ${JSON.stringify(product.historicalData)}. Return JSON with suggestedPrice, winProbability, and reasoning.`;

    const result = await generateJSON<{
      suggestedPrice: number;
      winProbability: number;
      reasoning: string;
    }>(prompt);

    return {
      productId: product.productId,
      ...result,
    };
  });

  return Promise.all(promises);
}

/**
 * Process multiple chatbot actions in parallel
 * Useful when a single user query requires multiple data fetches
 */
export async function executeChatbotActionsParallel(
  actions: Array<{
    type: string;
    params: any;
    executor: (params: any) => Promise<any>;
  }>
): Promise<any[]> {
  const promises = actions.map(({ executor, params }) => executor(params));
  return Promise.all(promises);
}

/**
 * Generate AI responses for multiple customers in parallel
 * Useful for batch operations like email campaigns
 */
export async function generateBatchResponsesParallel(
  customers: Array<{
    customerId: string;
    context: any;
    prompt: string;
  }>,
  maxConcurrency: number = 5
): Promise<
  Array<{
    customerId: string;
    response: string;
    error?: string;
  }>
> {
  const results: Array<{
    customerId: string;
    response: string;
    error?: string;
  }> = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < customers.length; i += maxConcurrency) {
    const batch = customers.slice(i, i + maxConcurrency);

    const batchPromises = batch.map(async (customer) => {
      try {
        const response = await generateText(customer.prompt);
        return {
          customerId: customer.customerId,
          response,
        };
      } catch (error: any) {
        return {
          customerId: customer.customerId,
          response: '',
          error: error.message,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Analyze multiple documents in parallel
 * Useful for batch invoice processing
 */
export async function analyzeDocumentsParallel(
  documents: Array<{
    documentId: string;
    content: Buffer;
    mimeType: string;
  }>,
  maxConcurrency: number = 3
): Promise<
  Array<{
    documentId: string;
    extractedData: any;
    error?: string;
  }>
> {
  const results: Array<{
    documentId: string;
    extractedData: any;
    error?: string;
  }> = [];

  // Process in smaller batches for document processing
  for (let i = 0; i < documents.length; i += maxConcurrency) {
    const batch = documents.slice(i, i + maxConcurrency);

    const batchPromises = batch.map(async (doc) => {
      try {
        // Simulate document processing
        const extractedData = await generateJSON(
          `Extract data from document ${doc.documentId}`
        );
        return {
          documentId: doc.documentId,
          extractedData,
        };
      } catch (error: any) {
        return {
          documentId: doc.documentId,
          extractedData: null,
          error: error.message,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Execute with timeout and fallback
 * Prevents slow AI calls from blocking the entire operation
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute with retry logic
 * Retries failed AI calls with exponential backoff
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

