/**
 * Phase 2: AI Backend Logic - Pricing Analysis
 *
 * AI-powered pricing analysis engine that analyzes market data,
 * sales velocity, and competition to generate pricing recommendations.
 *
 * Uses Gemini 2.5 Pro for complex multi-variable optimization and
 * deep reasoning about pricing strategies.
 */

import { createClient } from '@/lib/supabase/server';
import { generateJSONPro } from '@/lib/gemini';

/**
 * Product sales data for analysis
 */
export interface ProductSalesData {
  productId: string;
  productName: string;
  currentPrice: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderQuantity: number;
  salesVelocity: number; // Units per day
  lastMonthSales: number;
  previousMonthSales: number;
  salesTrend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Pricing recommendation result
 */
export interface PricingRecommendation {
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChangePercent: number;
  marketAveragePrice: number | null;
  competitorMinPrice: number | null;
  competitorMaxPrice: number | null;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  salesVelocityChangePercent: number;
  recommendationReason: string;
  confidenceScore: number; // 0-1
}

/**
 * Analyze product sales data
 */
export async function analyzeProductSales(
  productId: string,
  daysToAnalyze: number = 90
): Promise<ProductSalesData | null> {
  const supabase = await createClient();

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return null;
  }

  // Calculate date ranges
  const now = new Date();
  const startDate = new Date(now.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000);
  const lastMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const previousMonthEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all sales for this product
  const { data: allSales, error: salesError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      price,
      orders!inner(
        created_at,
        status
      )
    `)
    .eq('product_id', productId)
    .in('orders.status', ['delivered', 'shipped'])
    .gte('orders.created_at', startDate.toISOString());

  if (salesError || !allSales || allSales.length === 0) {
    return null;
  }

  // Calculate total sales and revenue
  const totalSales = allSales.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = allSales.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const averageOrderQuantity = totalSales / allSales.length;

  // Calculate sales velocity (units per day)
  const salesVelocity = totalSales / daysToAnalyze;

  // Calculate last month sales
  const lastMonthSales = allSales
    .filter(item => new Date(item.orders.created_at) >= lastMonthStart)
    .reduce((sum, item) => sum + item.quantity, 0);

  // Calculate previous month sales
  const previousMonthSales = allSales
    .filter(item => {
      const date = new Date(item.orders.created_at);
      return date >= previousMonthStart && date < previousMonthEnd;
    })
    .reduce((sum, item) => sum + item.quantity, 0);

  // Determine sales trend
  let salesTrend: 'increasing' | 'stable' | 'decreasing';
  if (previousMonthSales === 0) {
    salesTrend = 'stable';
  } else {
    const changePercent = ((lastMonthSales - previousMonthSales) / previousMonthSales) * 100;
    if (changePercent > 10) {
      salesTrend = 'increasing';
    } else if (changePercent < -10) {
      salesTrend = 'decreasing';
    } else {
      salesTrend = 'stable';
    }
  }

  return {
    productId: product.id,
    productName: product.name,
    currentPrice: product.price,
    totalSales,
    totalRevenue,
    averageOrderQuantity,
    salesVelocity,
    lastMonthSales,
    previousMonthSales,
    salesTrend,
  };
}

/**
 * Get market pricing data (simulated - in production, this would query external APIs)
 */
async function getMarketPricingData(
  productName: string,
  currentPrice: number
): Promise<{
  marketAverage: number | null;
  competitorMin: number | null;
  competitorMax: number | null;
}> {
  // In production, this would query external pricing APIs or web scraping
  // For now, we'll simulate market data based on current price
  
  // Simulate market variance of ±15%
  const variance = 0.15;
  const marketAverage = currentPrice * (1 + (Math.random() * variance * 2 - variance));
  const competitorMin = currentPrice * (1 - variance);
  const competitorMax = currentPrice * (1 + variance);

  return {
    marketAverage: Math.round(marketAverage * 100) / 100,
    competitorMin: Math.round(competitorMin * 100) / 100,
    competitorMax: Math.round(competitorMax * 100) / 100,
  };
}

/**
 * Generate pricing recommendation using AI
 */
export async function generatePricingRecommendation(
  salesData: ProductSalesData
): Promise<PricingRecommendation> {
  // Get market pricing data
  const marketData = await getMarketPricingData(
    salesData.productName,
    salesData.currentPrice
  );

  // Calculate sales velocity change
  const salesVelocityChangePercent = salesData.previousMonthSales === 0
    ? 0
    : ((salesData.lastMonthSales - salesData.previousMonthSales) / salesData.previousMonthSales) * 100;

  const prompt = `Analyze this product's pricing and provide a recommendation:

Product: ${salesData.productName}
Current Price: $${salesData.currentPrice}
Sales Trend: ${salesData.salesTrend}
Sales Velocity Change: ${salesVelocityChangePercent.toFixed(1)}%
Last Month Sales: ${salesData.lastMonthSales} units
Previous Month Sales: ${salesData.previousMonthSales} units
Average Order Quantity: ${salesData.averageOrderQuantity.toFixed(1)} units

Market Data:
- Market Average Price: $${marketData.marketAverage}
- Competitor Min Price: $${marketData.competitorMin}
- Competitor Max Price: $${marketData.competitorMax}

Based on this data, recommend:
1. Should we increase, decrease, or maintain the price?
2. What should the new price be?
3. What is the expected impact on sales?
4. How confident are you in this recommendation (0-1)?

Pricing Strategy Guidelines:
- If sales are increasing and price is below market average, consider increasing price
- If sales are decreasing and price is above market average, consider decreasing price
- If sales are stable, maintain competitive positioning
- Avoid drastic price changes (>20%) unless strongly justified
- Consider profit margins and market positioning

Respond with JSON:
{
  "recommendedPrice": number,
  "reasoning": "detailed explanation of recommendation",
  "confidenceScore": number (0-1),
  "expectedImpact": "brief description of expected sales impact"
}`;

  const recommendation = await generateJSONPro<{
    recommendedPrice: number;
    reasoning: string;
    confidenceScore: number;
    expectedImpact: string;
  }>(prompt, {
    temperature: 0.2,  // Lower temperature for financial calculations
    maxTokens: 1000,
    systemPrompt: 'You are a B2B pricing optimization expert. Apply deep analytical reasoning to pricing strategies, considering all market factors and business constraints.'
  });

  // Calculate price change percentage
  const priceChangePercent = ((recommendation.recommendedPrice - salesData.currentPrice) / salesData.currentPrice) * 100;

  return {
    productId: salesData.productId,
    productName: salesData.productName,
    currentPrice: salesData.currentPrice,
    recommendedPrice: Math.round(recommendation.recommendedPrice * 100) / 100,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
    marketAveragePrice: marketData.marketAverage,
    competitorMinPrice: marketData.competitorMin,
    competitorMaxPrice: marketData.competitorMax,
    demandTrend: salesData.salesTrend,
    salesVelocityChangePercent: Math.round(salesVelocityChangePercent * 100) / 100,
    recommendationReason: `${recommendation.reasoning}\n\nExpected Impact: ${recommendation.expectedImpact}`,
    confidenceScore: Math.min(1, Math.max(0, recommendation.confidenceScore)),
  };
}

/**
 * Generate pricing recommendations for multiple products
 */
export async function generateBulkPricingRecommendations(
  productIds: string[],
  minSales: number = 10
): Promise<PricingRecommendation[]> {
  const recommendations: PricingRecommendation[] = [];

  for (const productId of productIds) {
    try {
      const salesData = await analyzeProductSales(productId);

      if (!salesData || salesData.totalSales < minSales) {
        continue; // Skip products with insufficient sales data
      }

      const recommendation = await generatePricingRecommendation(salesData);
      recommendations.push(recommendation);

    } catch (error) {
      console.error(`Failed to generate pricing recommendation for product ${productId}:`, error);
      // Continue with other products
    }
  }

  // Sort by absolute price change percentage (largest changes first)
  recommendations.sort((a, b) => 
    Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent)
  );

  return recommendations;
}

/**
 * Save pricing recommendation to database
 */
export async function savePricingRecommendation(
  recommendation: PricingRecommendation
): Promise<string> {
  const supabase = await createClient();

  // Check if recommendation already exists for this product
  const { data: existing } = await supabase
    .from('pricing_recommendations')
    .select('id')
    .eq('product_id', recommendation.productId)
    .eq('status', 'pending')
    .single();

  if (existing) {
    // Update existing recommendation
    const { error } = await supabase
      .from('pricing_recommendations')
      .update({
        current_price: recommendation.currentPrice,
        recommended_price: recommendation.recommendedPrice,
        price_change_percent: recommendation.priceChangePercent,
        market_average_price: recommendation.marketAveragePrice,
        competitor_min_price: recommendation.competitorMinPrice,
        competitor_max_price: recommendation.competitorMaxPrice,
        demand_trend: recommendation.demandTrend,
        sales_velocity_change_percent: recommendation.salesVelocityChangePercent,
        recommendation_reason: recommendation.recommendationReason,
        confidence_score: recommendation.confidenceScore,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error('Failed to update pricing recommendation');
    }

    return existing.id;
  } else {
    // Create new recommendation
    const { data, error } = await supabase
      .from('pricing_recommendations')
      .insert({
        product_id: recommendation.productId,
        current_price: recommendation.currentPrice,
        recommended_price: recommendation.recommendedPrice,
        price_change_percent: recommendation.priceChangePercent,
        market_average_price: recommendation.marketAveragePrice,
        competitor_min_price: recommendation.competitorMinPrice,
        competitor_max_price: recommendation.competitorMaxPrice,
        demand_trend: recommendation.demandTrend,
        sales_velocity_change_percent: recommendation.salesVelocityChangePercent,
        recommendation_reason: recommendation.recommendationReason,
        confidence_score: recommendation.confidenceScore,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create pricing recommendation');
    }

    return data.id;
  }
}

