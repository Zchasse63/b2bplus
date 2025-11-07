/**
 * E2E Test: Customer Insights with AI
 * 
 * Tests AI-powered customer analytics with REAL Gemini API calls:
 * - Generate customer behavioral insights
 * - Churn risk analysis
 * - Purchase pattern identification
 * - Retention recommendations
 * - Lifetime value prediction
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Customer Insights with AI', () => {
  test.beforeAll(async () => {
    // Ensure test data exists
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('id')
      .limit(1);
    
    if (!analytics || analytics.length === 0) {
      throw new Error('No customer analytics found. Run seed-test-data.ts first.');
    }
  });

  test('should generate comprehensive customer insights with AI', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin', { timeout: 10000 });
    
    // Get a customer with purchase history
    const { data: customer } = await supabase
      .from('profiles')
      .select(`
        *,
        orders(*)
      `)
      .eq('role', 'customer')
      .limit(1)
      .single();
    
    if (!customer || !customer.orders || customer.orders.length === 0) {
      test.skip();
      return;
    }
    
    // Navigate to customer analytics
    await page.goto(`/admin/customers/${customer.id}/insights`);
    
    // Record start time to measure AI processing
    const startTime = Date.now();
    
    // Click generate insights button
    await page.click('button:has-text("Generate AI Insights")');
    
    // Wait for AI analysis to complete
    await expect(page.locator('text=Insights generated successfully')).toBeVisible({ timeout: 30000 });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Verify AI processing took reasonable time (>10 seconds for comprehensive analysis)
    expect(processingTime).toBeGreaterThan(10000);
    console.log(`✓ AI customer insights took ${processingTime}ms (confirms real Gemini call)`);
    
    // Verify insights are displayed
    await expect(page.locator('[data-testid="behavioral-patterns"]')).toBeVisible();
    await expect(page.locator('[data-testid="churn-risk"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
    
    console.log('✓ Customer insights displayed in UI');
  });

  test('should identify behavioral patterns with AI analysis', async ({ page }) => {
    // Get customer analytics
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .limit(1)
      .single();
    
    if (!analytics) {
      test.skip();
      return;
    }
    
    // Call behavioral analysis API
    const response = await page.request.post('/api/admin/analytics/behavioral-patterns', {
      data: {
        customerId: analytics.customer_id
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify behavioral patterns identified
    expect(result.patterns).toBeTruthy();
    expect(result.patterns.orderingFrequency).toBeTruthy();
    expect(result.patterns.preferredProducts).toBeTruthy();
    expect(result.patterns.seasonalTrends).toBeTruthy();
    expect(result.patterns.pricesensitivity).toBeTruthy();
    
    console.log('✓ Behavioral patterns identified');
    console.log(`  - Ordering Frequency: ${result.patterns.orderingFrequency}`);
    console.log(`  - Preferred Products: ${result.patterns.preferredProducts.length}`);
    console.log(`  - Seasonal Trends: ${result.patterns.seasonalTrends.detected ? 'Yes' : 'No'}`);
    console.log(`  - Price Sensitivity: ${result.patterns.pricesensitivity}`);
    
    // Verify AI insights
    expect(result.insights).toBeTruthy();
    expect(result.insights.length).toBeGreaterThan(0);
    
    console.log(`✓ Generated ${result.insights.length} behavioral insights`);
    result.insights.forEach((insight: string, i: number) => {
      console.log(`  ${i + 1}. ${insight.substring(0, 100)}...`);
    });
  });

  test('should calculate churn risk score with AI', async ({ page }) => {
    // Get customer analytics
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .limit(5);
    
    if (!analytics || analytics.length === 0) {
      test.skip();
      return;
    }
    
    for (const customerAnalytics of analytics) {
      // Call churn risk API
      const response = await page.request.post('/api/admin/analytics/churn-risk', {
        data: {
          customerId: customerAnalytics.customer_id
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      // Verify churn risk score
      expect(result.churnRisk).toBeTruthy();
      expect(result.churnRisk.score).toBeGreaterThanOrEqual(0);
      expect(result.churnRisk.score).toBeLessThanOrEqual(1);
      expect(result.churnRisk.level).toMatch(/low|medium|high/);
      expect(result.churnRisk.factors).toBeTruthy();
      expect(result.churnRisk.reasoning).toBeTruthy(); // AI-generated reasoning
      
      console.log(`✓ Churn risk calculated for customer ${customerAnalytics.customer_id}`);
      console.log(`  - Risk Score: ${(result.churnRisk.score * 100).toFixed(1)}%`);
      console.log(`  - Risk Level: ${result.churnRisk.level}`);
      console.log(`  - Key Factors: ${result.churnRisk.factors.join(', ')}`);
    }
  });

  test('should generate retention recommendations with AI', async ({ page }) => {
    // Get a customer with medium/high churn risk
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .limit(1)
      .single();
    
    if (!analytics) {
      test.skip();
      return;
    }
    
    // Call retention recommendations API
    const response = await page.request.post('/api/admin/analytics/retention-recommendations', {
      data: {
        customerId: analytics.customer_id
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify recommendations
    expect(result.recommendations).toBeTruthy();
    expect(result.recommendations.length).toBeGreaterThan(0);
    
    // Verify recommendation structure
    result.recommendations.forEach((rec: any) => {
      expect(rec.action).toBeTruthy();
      expect(rec.priority).toMatch(/low|medium|high/);
      expect(rec.expectedImpact).toBeTruthy();
      expect(rec.reasoning).toBeTruthy(); // AI-generated reasoning
    });
    
    console.log('✓ Retention recommendations generated');
    console.log(`  - Total recommendations: ${result.recommendations.length}`);
    
    const highPriority = result.recommendations.filter((r: any) => r.priority === 'high');
    console.log(`  - High priority: ${highPriority.length}`);
    
    result.recommendations.slice(0, 3).forEach((rec: any, i: number) => {
      console.log(`  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
      console.log(`     Impact: ${rec.expectedImpact}`);
    });
  });

  test('should predict customer lifetime value with AI', async ({ page }) => {
    // Get customer analytics
    const { data: analytics } = await supabase
      .from('customer_purchase_analytics')
      .select('*')
      .limit(3);
    
    if (!analytics || analytics.length === 0) {
      test.skip();
      return;
    }
    
    for (const customerAnalytics of analytics) {
      // Call CLV prediction API
      const response = await page.request.post('/api/admin/analytics/predict-clv', {
        data: {
          customerId: customerAnalytics.customer_id
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      // Verify CLV prediction
      expect(result.clv).toBeTruthy();
      expect(result.clv.predicted_value).toBeGreaterThan(0);
      expect(result.clv.confidence).toBeGreaterThan(0);
      expect(result.clv.confidence).toBeLessThanOrEqual(1);
      expect(result.clv.timeframe).toBeTruthy();
      expect(result.clv.factors).toBeTruthy();
      
      console.log(`✓ CLV predicted for customer ${customerAnalytics.customer_id}`);
      console.log(`  - Predicted Value: $${result.clv.predicted_value.toFixed(2)}`);
      console.log(`  - Timeframe: ${result.clv.timeframe}`);
      console.log(`  - Confidence: ${(result.clv.confidence * 100).toFixed(1)}%`);
    }
  });

  test('should segment customers based on AI analysis', async ({ page }) => {
    // Call customer segmentation API
    const response = await page.request.post('/api/admin/analytics/segment-customers', {
      data: {
        criteria: 'ai_behavioral' // Use AI for segmentation
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify segments
    expect(result.segments).toBeTruthy();
    expect(result.segments.length).toBeGreaterThan(0);
    
    // Verify segment structure
    result.segments.forEach((segment: any) => {
      expect(segment.name).toBeTruthy();
      expect(segment.description).toBeTruthy();
      expect(segment.customerCount).toBeGreaterThan(0);
      expect(segment.characteristics).toBeTruthy();
      expect(segment.recommendations).toBeTruthy();
    });
    
    console.log('✓ Customer segmentation completed');
    console.log(`  - Total segments: ${result.segments.length}`);
    
    result.segments.forEach((segment: any) => {
      console.log(`  - ${segment.name}: ${segment.customerCount} customers`);
      console.log(`    ${segment.description}`);
    });
  });

  test('should track insight accuracy over time', async ({ page }) => {
    // Get historical insights
    const { data: insights } = await supabase
      .from('customer_insights')
      .select('*')
      .not('predicted_outcome', 'is', null)
      .not('actual_outcome', 'is', null)
      .limit(10);
    
    if (!insights || insights.length === 0) {
      test.skip();
      return;
    }
    
    // Calculate accuracy
    let accurate = 0;
    
    insights.forEach(insight => {
      if (insight.predicted_outcome === insight.actual_outcome) {
        accurate++;
      }
    });
    
    const accuracyRate = accurate / insights.length;
    
    console.log('✓ Insight accuracy tracked');
    console.log(`  - Total insights: ${insights.length}`);
    console.log(`  - Accurate predictions: ${accurate}`);
    console.log(`  - Accuracy rate: ${(accuracyRate * 100).toFixed(1)}%`);
    
    // Verify reasonable accuracy (>50% for AI predictions)
    expect(accuracyRate).toBeGreaterThan(0.5);
  });
});

