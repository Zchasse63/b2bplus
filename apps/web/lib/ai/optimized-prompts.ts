/**
 * Optimized AI Prompts
 * 
 * Task 2.4: Reduce AI Token Usage
 * - Optimize prompts and context windows
 * - Limit order history to last 5 orders
 * - Use summaries instead of full data
 * - Reduce unnecessary context
 */

/**
 * Summarize order data to reduce tokens
 */
export function summarizeOrders(orders: any[]): string {
  if (orders.length === 0) return 'No recent orders';

  // Limit to last 5 orders
  const recentOrders = orders.slice(0, 5);

  return recentOrders
    .map((order, index) => {
      const itemCount = order.items?.length || 0;
      const total = order.total || 0;
      const status = order.status || 'unknown';
      const date = order.submitted_at
        ? new Date(order.submitted_at).toLocaleDateString()
        : 'unknown';

      return `${index + 1}. ${date}: ${itemCount} items, $${total}, ${status}`;
    })
    .join('\n');
}

/**
 * Summarize product data to reduce tokens
 */
export function summarizeProducts(products: any[]): string {
  if (products.length === 0) return 'No products';

  // Limit to top 10 products
  const topProducts = products.slice(0, 10);

  return topProducts
    .map((product, index) => {
      const name = product.name || 'Unknown';
      const price = product.price || 0;
      const category = product.category || 'General';

      return `${index + 1}. ${name} ($${price}) - ${category}`;
    })
    .join('\n');
}

/**
 * Summarize customer context for AI
 */
export function summarizeCustomerContext(context: {
  userId: string;
  organizationName: string;
  role: string;
  recentOrders: any[];
  topProducts: any[];
  totalSpend: number;
  cartItems: any[];
  cartTotal: number;
  creditLimit: number;
  creditAvailable: number;
  accountStatus: string;
}): string {
  return `Customer: ${context.organizationName} (${context.role})
Total Spend: $${context.totalSpend}
Credit: $${context.creditAvailable} available of $${context.creditLimit}
Account Status: ${context.accountStatus}

Recent Orders (last 5):
${summarizeOrders(context.recentOrders)}

Top Products:
${summarizeProducts(context.topProducts)}

Current Cart: ${context.cartItems.length} items, $${context.cartTotal}`;
}

/**
 * Optimized chatbot system prompt
 */
export const CHATBOT_SYSTEM_PROMPT = `You are a helpful B2B sales assistant. Be concise and professional.

Key capabilities:
- Check order status
- Search products
- View cart
- Track shipments
- Answer product questions

Keep responses under 150 words. Use bullet points for lists.`;

/**
 * Optimized opportunity detection prompt
 */
export function createOpportunityPrompt(
  customerData: any,
  opportunityType: 'stopped_buying' | 'cross_sell' | 'upsell'
): string {
  const summaries = {
    stopped_buying: `Customer stopped buying product. Last purchase: ${customerData.lastPurchaseDate}. Previous frequency: ${customerData.avgFrequencyDays} days. Revenue impact: $${customerData.totalRevenue}. Provide brief reason (max 50 words).`,
    
    cross_sell: `Customer buys ${customerData.category} products. Suggest 1-2 complementary products from other categories. Keep brief (max 40 words).`,
    
    upsell: `Customer buys ${customerData.productName} at $${customerData.currentPrice}. Higher-tier option: ${customerData.premiumProduct} at $${customerData.premiumPrice}. Suggest upsell reason (max 40 words).`,
  };

  return summaries[opportunityType];
}

/**
 * Optimized pricing recommendation prompt
 */
export function createPricingPrompt(data: {
  currentPrice: number;
  customerHistory: any[];
  competitorPrice?: number;
  targetMargin?: number;
}): string {
  const historySum = data.customerHistory.length > 0
    ? `Bought ${data.customerHistory.length}x at avg $${(data.customerHistory.reduce((sum, h) => sum + h.price, 0) / data.customerHistory.length).toFixed(2)}`
    : 'No history';

  const competitor = data.competitorPrice
    ? `Competitor: $${data.competitorPrice}`
    : '';

  return `Current: $${data.currentPrice}. ${historySum}. ${competitor}. Target margin: ${data.targetMargin || 30}%. Suggest optimal price with win probability. Keep brief (max 60 words).`;
}

/**
 * Optimized invoice extraction prompt
 */
export const INVOICE_EXTRACTION_PROMPT = `Extract invoice data. Return JSON only:
{
  "invoice_number": "string",
  "vendor_name": "string",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": number,
  "line_items": [{"product_name": "string", "quantity": number, "unit_price": number}]
}

Omit optional fields if missing. Be precise.`;

/**
 * Optimized product search prompt
 */
export function createProductSearchPrompt(
  query: string,
  availableProducts: any[]
): string {
  // Limit to 20 products for context
  const limitedProducts = availableProducts.slice(0, 20);
  
  const productList = limitedProducts
    .map((p, i) => `${i + 1}. ${p.name} - ${p.category} - $${p.price}`)
    .join('\n');

  return `Query: "${query}"

Available products:
${productList}

Return top 3 matches with brief reason (max 100 words total).`;
}

/**
 * Optimized forecast generation prompt
 */
export function createForecastPrompt(data: {
  historicalSales: number[];
  seasonality?: string;
  trends?: string;
}): string {
  const last3Months = data.historicalSales.slice(-3);
  const avg = last3Months.reduce((a, b) => a + b, 0) / last3Months.length;

  return `Last 3 months avg: $${avg.toFixed(0)}. ${data.seasonality || ''}. ${data.trends || ''}. Forecast next month with confidence level. Keep brief (max 50 words).`;
}

/**
 * Optimized lead qualification prompt
 */
export function createLeadQualificationPrompt(lead: {
  company: string;
  industry?: string;
  employees?: number;
  revenue?: number;
  needs?: string;
}): string {
  return `Company: ${lead.company}. ${lead.industry ? `Industry: ${lead.industry}.` : ''} ${lead.employees ? `Size: ${lead.employees} employees.` : ''} Needs: ${lead.needs || 'Not specified'}. Score lead quality (1-10) with brief reason (max 40 words).`;
}

/**
 * Token estimation helper
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;

  return text.substring(0, maxChars - 3) + '...';
}

/**
 * Optimize context by removing unnecessary data
 */
export function optimizeContext(context: any): any {
  // Remove null/undefined values
  const cleaned = Object.entries(context).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // Limit arrays
  if (cleaned.recentOrders && Array.isArray(cleaned.recentOrders)) {
    cleaned.recentOrders = cleaned.recentOrders.slice(0, 5);
  }

  if (cleaned.topProducts && Array.isArray(cleaned.topProducts)) {
    cleaned.topProducts = cleaned.topProducts.slice(0, 10);
  }

  if (cleaned.cartItems && Array.isArray(cleaned.cartItems)) {
    cleaned.cartItems = cleaned.cartItems.slice(0, 20);
  }

  return cleaned;
}

/**
 * Create concise error message for AI
 */
export function createErrorPrompt(error: string): string {
  return `Error occurred: ${error.substring(0, 100)}. Provide helpful response (max 50 words).`;
}

/**
 * Batch prompts to reduce API calls
 */
export function batchPrompts(
  prompts: string[],
  maxBatchSize: number = 5
): string[][] {
  const batches: string[][] = [];
  
  for (let i = 0; i < prompts.length; i += maxBatchSize) {
    batches.push(prompts.slice(i, i + maxBatchSize));
  }

  return batches;
}

