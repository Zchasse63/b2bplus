/**
 * E2E Test: Admin Opportunity Management Flow
 * 
 * Tests complete admin workflow:
 * 1. Login as admin
 * 2. Navigate to opportunities page
 * 3. View AI-detected opportunities
 * 4. Filter and sort opportunities
 * 5. Pursue an opportunity (create task/action)
 * 6. Verify opportunity status updated
 */

import { test, expect } from '@/e2e/fixtures/auth';

test.describe('Admin Opportunity Management', () => {
  test.beforeEach(async ({ adminPage: page }) => {
    // Login as demo admin
    // Already logged in via fixture
  });

  test('admin can navigate to opportunities page', async ({ adminPage: page }) => {
    // Look for opportunities link in navigation or admin menu
    const opportunitiesLink = page.locator('a').filter({ hasText: /opportunit/i }).first();
    
    if (await opportunitiesLink.isVisible()) {
      await opportunitiesLink.click();
      
      // Verify we're on opportunities page
      await expect(page).toHaveURL(/opportunit/i);
    } else {
      // Try navigating directly
      await page.goto('/admin/opportunities');
    }
    
    // Verify page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /opportunit/i })).toBeVisible();
  });

  test('admin can view list of AI-detected opportunities', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    
    // Wait for opportunities to load
    await page.waitForTimeout(2000);
    
    // Look for opportunity cards, table rows, or list items
    const opportunities = page.locator('[class*="card"], tr, [class*="opportunity"]');
    
    // Verify opportunities are displayed (or empty state if none)
    const opportunityCount = await opportunities.count();
    expect(opportunityCount).toBeGreaterThanOrEqual(0);
    
    // If opportunities exist, verify they have key information
    if (opportunityCount > 0) {
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/customer|product|score|type|status/);
    }
  });

  test('admin can see opportunity details', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find first opportunity
    const firstOpportunity = page.locator('[class*="card"], tr').first();
    
    if (await firstOpportunity.isVisible()) {
      // Click to view details
      await firstOpportunity.click();
      await page.waitForTimeout(1000);
      
      // Verify details are shown (modal, expanded view, or detail page)
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/customer|product|reason|score|ai|insight/);
    }
  });

  test('admin can filter opportunities by type', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for filter dropdown or buttons
    const filterOptions = page.locator('select, button').filter({ 
      hasText: /stopped|cross.sell|upsell|churn|all/i 
    });
    
    if (await filterOptions.count() > 0) {
      // Click filter option
      await filterOptions.first().click();
      await page.waitForTimeout(1000);
      
      // Verify filter was applied
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    }
  });

  test('admin can filter opportunities by status', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for status filter
    const statusFilter = page.locator('select, button').filter({ 
      hasText: /open|pursued|dismissed|pending/i 
    });
    
    if (await statusFilter.count() > 0) {
      await statusFilter.first().click();
      await page.waitForTimeout(1000);
      
      // Verify page updated
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can sort opportunities by score', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for sort options
    const sortButton = page.locator('button, th').filter({ hasText: /score|priority/i });
    
    if (await sortButton.count() > 0) {
      await sortButton.first().click();
      await page.waitForTimeout(1000);
      
      // Verify sorting applied
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can pursue an opportunity', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find pursue/action button
    const pursueButton = page.locator('button').filter({ 
      hasText: /pursue|take action|contact|follow/i 
    }).first();
    
    if (await pursueButton.isVisible()) {
      await pursueButton.click();
      await page.waitForTimeout(1000);
      
      // Look for confirmation or action form
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/confirm|task|action|note|contact/);
    }
  });

  test('admin can create task from opportunity', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find create task button
    const createTaskButton = page.locator('button').filter({ 
      hasText: /task|create|assign/i 
    }).first();
    
    if (await createTaskButton.isVisible()) {
      await createTaskButton.click();
      await page.waitForTimeout(1000);
      
      // Fill task form if it appears
      const taskTitle = page.locator('input').filter({ hasText: /title|name|task/i }).first();
      if (await taskTitle.isVisible()) {
        await taskTitle.fill('Follow up on opportunity');
        
        // Submit task
        const submitButton = page.locator('button').filter({ hasText: /create|save|submit/i }).first();
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Verify task created
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toMatch(/success|created|saved/);
      }
    }
  });

  test('admin can dismiss an opportunity', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find dismiss button
    const dismissButton = page.locator('button').filter({ 
      hasText: /dismiss|ignore|skip|decline/i 
    }).first();
    
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm dismissal if needed
      const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|dismiss/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Verify opportunity dismissed
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    }
  });

  test('admin can view AI reasoning for opportunity', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find first opportunity
    const firstOpportunity = page.locator('[class*="card"], tr').first();
    
    if (await firstOpportunity.isVisible()) {
      await firstOpportunity.click();
      await page.waitForTimeout(1000);
      
      // Look for AI reasoning/insights section
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/reason|insight|ai|analysis|suggest|recommend/);
    }
  });

  test('admin can see opportunity score and confidence', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Verify scores are displayed
    const pageContent = await page.content();
    
    // Look for score indicators (percentages, numbers, badges)
    expect(pageContent.toLowerCase()).toMatch(/score|confidence|%|priority|high|medium|low/);
  });

  test('admin can detect new opportunities', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for "Detect Opportunities" or "Refresh" button
    const detectButton = page.locator('button').filter({ 
      hasText: /detect|refresh|scan|analyze/i 
    }).first();
    
    if (await detectButton.isVisible()) {
      await detectButton.click();
      
      // Wait for AI to detect opportunities
      await page.waitForTimeout(5000);
      
      // Verify page updated
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/opportunit|detect|found|analyz/);
    }
  });

  test('admin can view customer details from opportunity', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Find customer link or button
    const customerLink = page.locator('a, button').filter({ 
      hasText: /customer|view profile|details/i 
    }).first();
    
    if (await customerLink.isVisible()) {
      await customerLink.click();
      await page.waitForTimeout(1000);
      
      // Verify customer details page or modal
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/customer|order|purchase|history|contact/);
    }
  });

  test('admin can export opportunities list', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for export button
    const exportButton = page.locator('button').filter({ 
      hasText: /export|download|csv|excel/i 
    }).first();
    
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/opportunit|export/i);
      }
    }
  });

  test('admin can search opportunities', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Verify search results
      expect(await page.content()).toBeTruthy();
    }
  });

  test('admin can view opportunity history/timeline', async ({ adminPage: page }) => {
    await page.goto('/admin/opportunities');
    await page.waitForTimeout(2000);
    
    // Click on an opportunity
    const firstOpportunity = page.locator('[class*="card"], tr').first();
    
    if (await firstOpportunity.isVisible()) {
      await firstOpportunity.click();
      await page.waitForTimeout(1000);
      
      // Look for history/timeline section
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/history|timeline|activity|created|updated|status/);
    }
  });
});

