/**
 * E2E Test: Reorder Predictions with AI
 * 
 * Tests AI-powered reorder prediction system with REAL Gemini API calls:
 * - Generate reorder predictions based on historical data
 * - AI analysis of purchase patterns
 * - Confidence score calculation
 * - Email notification sending
 * - Prediction accuracy tracking
 */

import { test, expect } from '@/e2e/fixtures/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Reorder Predictions with AI', () => {
  test.beforeAll(async () => {
    // Ensure test data exists
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (!orders || orders.length === 0) {
      throw new Error('No test orders found. Run seed-test-data.ts first.');
    }
  });

  test('should generate reorder predictions with AI analysis', async ({ adminPage: page }) => {
    // Login as admin
    // Already logged in via fixture
    
    // Navigate to reorder predictions
    await page.goto('/admin/predictions/reorder');
    await expect(page).toHaveURL('/admin/predictions/reorder');
    
    // Record start time to measure AI processing
    const startTime = Date.now();
    
    // Click generate predictions button
    await page.click('button:has-text("Generate Predictions")');
    
    // Wait for AI processing to complete
    await expect(page.locator('text=Predictions generated successfully')).toBeVisible({ timeout: 30000 });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Verify AI processing took reasonable time (>10 seconds for real AI analysis)
    expect(processingTime).toBeGreaterThan(10000);
    console.log(`✓ AI reorder prediction took ${processingTime}ms (confirms real Gemini call)`);
    
    // Verify predictions appear in the UI
    const predictionCards = await page.locator('[data-testid="prediction-card"]').count();
    expect(predictionCards).toBeGreaterThan(0);
    
    console.log(`✓ Generated ${predictionCards} reorder predictions`);
    
    // Verify predictions in database
    const { data: predictions } = await supabase
      .from('reorder_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    expect(predictions).toBeTruthy();
    expect(predictions?.length).toBeGreaterThan(0);

    // Verify prediction structure
    const firstPrediction = predictions?.[0];
    expect(firstPrediction?.customer_id).toBeTruthy();
    expect(firstPrediction?.product_id).toBeTruthy();
    expect(firstPrediction?.predicted_order_date).toBeTruthy();
    expect(firstPrediction?.confidence_score).toBeGreaterThan(0);
    expect(firstPrediction?.confidence_score).toBeLessThanOrEqual(1);
    expect(firstPrediction?.reasoning).toBeTruthy(); // AI-generated reasoning
    
    console.log('✓ Prediction data structure validated');
    console.log(`  - Customer: ${firstPrediction.customer_id}`);
    console.log(`  - Confidence: ${(firstPrediction.confidence_score * 100).toFixed(1)}%`);
    console.log(`  - Reasoning: ${firstPrediction.reasoning?.substring(0, 100)}...`);
  });

  test('should analyze purchase patterns with AI', async ({ adminPage: page }) => {
    // Get a customer with order history
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
    
    // Call pattern analysis API
    const response = await page.request.post('/api/admin/predictions/analyze-patterns', {
      data: {
        customerId: customer.id
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify AI analysis results
    expect(result.patterns).toBeTruthy();
    expect(result.patterns.orderFrequency).toBeTruthy();
    expect(result.patterns.averageOrderValue).toBeGreaterThan(0);
    expect(result.patterns.topProducts).toBeTruthy();
    expect(result.patterns.seasonality).toBeTruthy();
    
    console.log('✓ Purchase pattern analysis completed');
    console.log(`  - Order Frequency: ${result.patterns.orderFrequency}`);
    console.log(`  - Avg Order Value: $${result.patterns.averageOrderValue.toFixed(2)}`);
    console.log(`  - Top Products: ${result.patterns.topProducts.length}`);
    console.log(`  - Seasonality Detected: ${result.patterns.seasonality.detected ? 'Yes' : 'No'}`);
    
    // Verify AI insights
    expect(result.insights).toBeTruthy();
    expect(result.insights.length).toBeGreaterThan(0);
    
    console.log(`✓ Generated ${result.insights.length} AI insights`);
    result.insights.forEach((insight: string, i: number) => {
      console.log(`  ${i + 1}. ${insight}`);
    });
  });

  test('should calculate confidence scores for predictions', async ({ adminPage: page }) => {
    // Get recent predictions
    const { data: predictions } = await supabase
      .from('reorder_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!predictions || predictions.length === 0) {
      test.skip();
      return;
    }
    
    // Verify confidence scores are reasonable
    predictions.forEach(prediction => {
      expect(prediction.confidence_score).toBeGreaterThan(0);
      expect(prediction.confidence_score).toBeLessThanOrEqual(1);
      
      // High confidence predictions should have reasoning
      if (prediction.confidence_score > 0.7) {
        expect(prediction.reasoning).toBeTruthy();
        expect(prediction.reasoning.length).toBeGreaterThan(50);
      }
    });
    
    console.log('✓ Confidence scores validated');
    console.log('  - Predictions by confidence:');
    
    const highConfidence = predictions.filter(p => p.confidence_score >= 0.7).length;
    const mediumConfidence = predictions.filter(p => p.confidence_score >= 0.4 && p.confidence_score < 0.7).length;
    const lowConfidence = predictions.filter(p => p.confidence_score < 0.4).length;
    
    console.log(`    High (≥70%): ${highConfidence}`);
    console.log(`    Medium (40-70%): ${mediumConfidence}`);
    console.log(`    Low (<40%): ${lowConfidence}`);
  });

  test('should send reorder notification emails', async ({ adminPage: page }) => {
    // Get a high-confidence prediction
    const { data: prediction } = await supabase
      .from('reorder_predictions')
      .select(`
        *,
        customer:profiles(*),
        product:products(*)
      `)
      .gte('confidence_score', 0.7)
      .limit(1)
      .single();
    
    if (!prediction) {
      test.skip();
      return;
    }
    
    // Send notification email
    const response = await page.request.post('/api/admin/predictions/send-notification', {
      data: {
        predictionId: prediction.id
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify email was sent
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy(); // SendGrid message ID
    
    console.log('✓ Reorder notification email sent');
    console.log(`  - To: ${prediction.customer.email}`);
    console.log(`  - Product: ${prediction.product.name}`);
    console.log(`  - Message ID: ${result.messageId}`);
    
    // Verify prediction was marked as notified
    const { data: updatedPrediction } = await supabase
      .from('reorder_predictions')
      .select('*')
      .eq('id', prediction.id)
      .single();
    
    expect(updatedPrediction.notification_sent).toBe(true);
    expect(updatedPrediction.notification_sent_at).toBeTruthy();
  });

  test('should track prediction accuracy', async ({ adminPage: page }) => {
    // Get predictions that should have been fulfilled by now
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago
    
    const { data: predictions } = await supabase
      .from('reorder_predictions')
      .select('*')
      .lt('predicted_order_date', cutoffDate.toISOString())
      .limit(10);
    
    if (!predictions || predictions.length === 0) {
      test.skip();
      return;
    }
    
    // Check accuracy for each prediction
    let accurate = 0;
    let inaccurate = 0;
    
    for (const prediction of predictions) {
      // Check if customer actually ordered the product
      const { data: actualOrders } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(product_id)
        `)
        .eq('organization_id', prediction.customer_id)
        .gte('created_at', prediction.predicted_order_date)
        .lte('created_at', new Date(new Date(prediction.predicted_order_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()); // Within 2 weeks
      
      const didOrder = actualOrders?.some(order => 
        order.order_items?.some((item: any) => item.product_id === prediction.product_id)
      );
      
      if (didOrder) {
        accurate++;
      } else {
        inaccurate++;
      }
      
      // Update prediction accuracy
      await supabase
        .from('reorder_predictions')
        .update({
          actual_ordered: didOrder,
          accuracy_checked_at: new Date().toISOString()
        })
        .eq('id', prediction.id);
    }
    
    const accuracyRate = accurate / (accurate + inaccurate);
    
    console.log('✓ Prediction accuracy tracked');
    console.log(`  - Accurate: ${accurate}`);
    console.log(`  - Inaccurate: ${inaccurate}`);
    console.log(`  - Accuracy Rate: ${(accuracyRate * 100).toFixed(1)}%`);
    
    // Verify reasonable accuracy (>40% for AI predictions)
    expect(accuracyRate).toBeGreaterThan(0.4);
  });

  test('should filter predictions by confidence threshold', async ({ adminPage: page }) => {
    // Login as admin
    // Already logged in via fixture
    
    // Navigate to reorder predictions
    await page.goto('/admin/predictions/reorder');
    
    // Filter by high confidence
    await page.click('[data-testid="confidence-filter"]');
    await page.click('text=High Confidence (≥70%)');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="prediction-card"]', { timeout: 5000 });
    
    // Verify all displayed predictions meet threshold
    const predictionCards = await page.locator('[data-testid="prediction-card"]').all();
    
    for (const card of predictionCards) {
      const confidenceText = await card.locator('[data-testid="confidence-score"]').textContent();
      const confidence = parseFloat(confidenceText?.replace('%', '') || '0') / 100;
      
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    }
    
    console.log(`✓ Filtered to ${predictionCards.length} high-confidence predictions`);
  });
});

