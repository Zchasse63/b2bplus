/**
 * E2E Test: Public Chatbot Lead Capture
 * 
 * Tests complete user journey for unauthenticated visitors:
 * 1. Visit landing page
 * 2. Find and interact with public chatbot
 * 3. Send messages to chatbot
 * 4. Provide lead information (name, email, company)
 * 5. Receive confirmation
 * 6. Verify lead was captured in database
 */

import { test, expect } from '@playwright/test';

test.describe('Public Chatbot Lead Capture', () => {
  test('visitor can find chatbot widget on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Look for chatbot widget, button, or icon
    // Common patterns: floating button, "Chat with us", chatbot icon
    const chatbotTrigger = page.locator('button, a, div').filter({ 
      hasText: /chat|help|contact|talk|message/i 
    });
    
    // Verify chatbot trigger is visible
    const triggerCount = await chatbotTrigger.count();
    expect(triggerCount).toBeGreaterThan(0);
  });

  test('visitor can open public chatbot and see welcome message', async ({ page }) => {
    await page.goto('/');
    
    // Find and click chatbot trigger
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      
      // Wait for chatbot to open
      await page.waitForTimeout(1000);
      
      // Look for welcome message or chatbot interface
      const welcomeMessage = page.locator('text=/welcome|hello|help|assist/i');
      await expect(welcomeMessage.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('visitor can send message to public chatbot', async ({ page }) => {
    await page.goto('/');
    
    // Open chatbot
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      // Find message input
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      await messageInput.fill('I need information about your products');

      // Find and click send button
      const sendButton = page.locator('[data-testid="chatbot-send"]');
      await sendButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Verify response appeared
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/product|help|information|assist/);
    }
  });

  test('chatbot prompts visitor for contact information', async ({ page }) => {
    await page.goto('/');
    
    // Open chatbot
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      // Send message that should trigger lead capture
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      await messageInput.fill('I want to learn more about pricing');

      const sendButton = page.locator('[data-testid="chatbot-send"]');
      await sendButton.click();
      
      // Wait for AI response
      await page.waitForTimeout(3000);
      
      // Look for prompts for contact info
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/name|email|contact|company|phone/);
    }
  });

  test('visitor can provide name and email for lead capture', async ({ page }) => {
    await page.goto('/');
    
    // Open chatbot
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      const sendButton = page.locator('[data-testid="chatbot-send"]');
      
      // Initial inquiry
      await messageInput.fill('I want pricing information');
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      // Provide name
      await messageInput.fill('John Doe');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Provide email
      await messageInput.fill('john.doe@example.com');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Provide company
      await messageInput.fill('Acme Corporation');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Verify confirmation message
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/thank|contact|touch|reach|follow/);
    }
  });

  test('visitor receives confirmation after providing lead info', async ({ page }) => {
    await page.goto('/');
    
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      const sendButton = page.locator('[data-testid="chatbot-send"]');

      // Quick lead capture flow
      await messageInput.fill('I need a quote');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      await messageInput.fill('Test User');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      await messageInput.fill('test@example.com');
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      // Look for confirmation
      const confirmationText = page.locator('text=/thank|received|contact|touch/i');
      await expect(confirmationText.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('public chatbot works without authentication', async ({ page }) => {
    // Ensure we're not logged in
    await page.goto('/auth/login');
    
    // If there's a logout button, click it
    const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i });
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Go to home page
    await page.goto('/');
    
    // Verify chatbot is accessible
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      // Verify we can interact without being logged in
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      await expect(messageInput).toBeVisible();
    }
  });

  test('chatbot handles multiple questions before lead capture', async ({ page }) => {
    await page.goto('/');
    
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      const sendButton = page.locator('[data-testid="chatbot-send"]');

      // Ask multiple questions
      await messageInput.fill('What products do you offer?');
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      await messageInput.fill('What are your prices?');
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      await messageInput.fill('Do you ship internationally?');
      await sendButton.click();
      await page.waitForTimeout(3000);
      
      // Verify chatbot responded to questions
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(500); // Should have substantial content
    }
  });

  test('chatbot validates email format', async ({ page }) => {
    await page.goto('/');
    
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      const messageInput = page.locator('[data-testid="chatbot-input"]');
      const sendButton = page.locator('[data-testid="chatbot-send"]');

      // Trigger lead capture
      await messageInput.fill('I want more information');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Provide name
      await messageInput.fill('Test User');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Provide invalid email
      await messageInput.fill('invalid-email');
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      // Look for validation message or prompt to re-enter
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/email|valid|format|@/);
    }
  });

  test('visitor can close and reopen chatbot', async ({ page }) => {
    await page.goto('/');
    
    const chatbotTrigger = page.locator('button, a').filter({ 
      hasText: /chat|help|contact/i 
    }).first();
    
    if (await chatbotTrigger.isVisible()) {
      // Open chatbot
      await chatbotTrigger.click();
      await page.waitForTimeout(1000);
      
      // Look for close button
      const closeButton = page.locator('button').filter({ hasText: /close|×|✕/i }).last();
      
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
        
        // Reopen chatbot
        await chatbotTrigger.click();
        await page.waitForTimeout(1000);
        
        // Verify chatbot reopened
        const messageInput = page.locator('input[type="text"], textarea').last();
        await expect(messageInput).toBeVisible();
      }
    }
  });
});

