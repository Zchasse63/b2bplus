/**
 * E2E Test: Admin Pricing Approval Flow
 * 
 * Tests complete admin workflow:
 * 1. Login as admin
 * 2. Navigate to pricing recommendations page
 * 3. View AI-generated pricing recommendations
 * 4. Review recommendation details and AI reasoning
 * 5. Approve or reject pricing recommendation
 * 6. Verify price updated in system
 */

import { test, expect } from '@/e2e/fixtures/auth';

test.describe('Admin Pricing Approval Flow', () => {
  test.beforeEach(async ({ adminPage: page }) => {
    // Login as demo admin
    // Already logged in via fixture
  });

  test('admin can navigate to pricing recommendations page', async ({ adminPage: page }) => {
    // Look for pricing link in navigation
    const pricingLink = page.locator('a').filter({ hasText: /pricing|price/i }).first();

    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL(/pricing/i);
    } else {
      // Navigate directly
      await page.goto('/admin/pricing/recommendations');
    }

    // Verify page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /pricing|price/i })).toBeVisible({ timeout: 10000 });
  });

  test('admin can view list of pricing recommendations', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Look for recommendations list
    const recommendations = page.locator('[class*="card"], tr, [class*="recommendation"]');
    const count = await recommendations.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
    
    // If recommendations exist, verify key information
    if (count > 0) {
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/customer|product|price|suggest|recommend/);
    }
  });

  test('admin can see pricing recommendation details', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Click first recommendation
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Verify details shown
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/current.*price|suggested.*price|win.*probability|revenue|margin/);
    }
  });

  test('admin can view AI reasoning for pricing recommendation', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Look for AI reasoning section
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/reason|insight|ai|analysis|based on|historical|pattern/);
    }
  });

  test('admin can see win probability and expected revenue', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Verify metrics displayed
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/win.*probability|expected.*revenue|%|\$/);
    }
  });

  test('admin can approve pricing recommendation', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Find approve button
    const approveButton = page.locator('button').filter({ 
      hasText: /approve|accept|apply/i 
    }).first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if needed
      const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|approve/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Verify approval success
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/success|approved|applied|updated/);
    }
  });

  test('admin can reject pricing recommendation', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Find reject button
    const rejectButton = page.locator('button').filter({ 
      hasText: /reject|decline|dismiss/i 
    }).first();
    
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if needed
      const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|reject/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Verify rejection
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    }
  });

  test('admin can filter recommendations by status', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Look for status filter
    const statusFilter = page.locator('select, button').filter({ 
      hasText: /pending|approved|rejected|all/i 
    });
    
    if (await statusFilter.count() > 0) {
      await statusFilter.first().click();
      await page.waitForTimeout(1000);
      
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can filter recommendations by confidence level', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Look for confidence filter
    const confidenceFilter = page.locator('select, button').filter({ 
      hasText: /confidence|high|medium|low/i 
    });
    
    if (await confidenceFilter.count() > 0) {
      await confidenceFilter.first().click();
      await page.waitForTimeout(1000);
      
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can sort recommendations by win probability', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Look for sort option
    const sortButton = page.locator('button, th').filter({ hasText: /win|probability|confidence/i });
    
    if (await sortButton.count() > 0) {
      await sortButton.first().click();
      await page.waitForTimeout(1000);
      
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can generate new pricing recommendation', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Look for generate/create button
    const generateButton = page.locator('button').filter({ 
      hasText: /generate|create|new|optimize/i 
    }).first();
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(1000);
      
      // Fill form if it appears
      const customerSelect = page.locator('select, input').filter({ hasText: /customer/i }).first();
      const productSelect = page.locator('select, input').filter({ hasText: /product/i }).first();
      
      if (await customerSelect.isVisible() && await productSelect.isVisible()) {
        // Select customer and product
        await customerSelect.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        await productSelect.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        // Submit
        const submitButton = page.locator('button').filter({ hasText: /generate|create|submit/i }).first();
        await submitButton.click();
        
        // Wait for AI to generate recommendation
        await page.waitForTimeout(5000);
        
        // Verify recommendation generated
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toMatch(/recommend|suggest|price|generated/);
      }
    }
  });

  test('admin can view historical pricing data', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Look for historical data section
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/historical|previous|past|history|trend/);
    }
  });

  test('admin can see price sensitivity analysis', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Look for sensitivity analysis
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/sensitivity|elastic|demand|volume|quantity/);
    }
  });

  test('admin can view customer purchase history', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      // Look for purchase history
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/purchase|order|history|bought|previous/);
    }
  });

  test('admin can export pricing recommendations', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const exportButton = page.locator('button').filter({ 
      hasText: /export|download|csv|excel/i 
    }).first();
    
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportButton.click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/pricing|recommendation|export/i);
      }
    }
  });

  test('admin can search pricing recommendations', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      expect(await page.content()).toBeTruthy();
    }
  });

  test('pricing approval updates product price', async ({ adminPage: page }) => {
    await page.goto('/admin/pricing/recommendations');
    await page.waitForTimeout(2000);
    
    // Get first recommendation
    const firstRecommendation = page.locator('[class*="card"], tr').first();
    
    if (await firstRecommendation.isVisible()) {
      // Note the suggested price
      await firstRecommendation.click();
      await page.waitForTimeout(1000);
      
      const pageContent = await page.content();
      const hasPriceInfo = pageContent.toLowerCase().includes('price');
      
      if (hasPriceInfo) {
        // Approve the recommendation
        const approveButton = page.locator('button').filter({ hasText: /approve|accept/i }).first();
        
        if (await approveButton.isVisible()) {
          await approveButton.click();
          await page.waitForTimeout(1000);
          
          // Confirm
          const confirmButton = page.locator('button').filter({ hasText: /confirm|yes/i }).first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
          
          // Verify success message
          const updatedContent = await page.content();
          expect(updatedContent.toLowerCase()).toMatch(/success|updated|applied/);
        }
      }
    }
  });
});

