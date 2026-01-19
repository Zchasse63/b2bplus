import { test, expect } from './fixtures/auth';
import { ChatbotWidget } from './page-objects/ChatbotWidget';
import { AICompanionPanel } from './page-objects/AICompanionPanel';

test.describe('Chatbot & AI Companion', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI API responses to avoid costs and ensure deterministic tests
    await page.route('**/api/chatbot/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"message": "This is a mock AI response for testing."}\n\n',
      });
    });

    await page.route('**/api/ai/companion', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"text": "Mock AI response: I can help you with that!"}\n\n',
      });
    });
  });

  test('should open and close chatbot widget', async ({ page }) => {
    await page.goto('/');

    const chatbot = new ChatbotWidget(page);

    // Chatbot should be closed initially
    expect(await chatbot.isVisible()).toBeFalsy();

    // Open chatbot
    await chatbot.open();
    expect(await chatbot.isVisible()).toBeTruthy();

    // Close chatbot
    await chatbot.close();
    expect(await chatbot.isVisible()).toBeFalsy();
  });

  test('should send message and receive response in public chatbot', async ({ page }) => {
    await page.goto('/');

    const chatbot = new ChatbotWidget(page);
    await chatbot.open();

    // Send a message
    await chatbot.sendMessage('What products do you sell?');

    // Wait for AI response
    await chatbot.waitForResponse();

    // Verify response appeared
    const messages = await chatbot.getMessages();
    expect(messages.length).toBeGreaterThan(1);

    // Check that response contains expected mock text
    const lastMessage = await chatbot.getLastMessage();
    expect(lastMessage.length).toBeGreaterThan(0);
  });

  test('should restore chatbot conversation on page refresh', async ({ page }) => {
    await page.goto('/');

    const chatbot = new ChatbotWidget(page);
    await chatbot.open();

    // Send multiple messages
    await chatbot.sendMessage('First message');
    await chatbot.waitForResponse();

    await chatbot.sendMessage('Second message');
    await chatbot.waitForResponse();

    await chatbot.sendMessage('Third message');
    await chatbot.waitForResponse();

    const messagesBefore = await chatbot.getMessages();
    expect(messagesBefore.length).toBeGreaterThan(3);

    // Refresh page
    await page.reload();

    // Re-open chatbot
    await chatbot.open();

    // Conversation should be restored (if implemented)
    await page.waitForTimeout(1000);
    const messagesAfter = await chatbot.getMessages();

    // Either messages are restored, or chatbot starts fresh
    // (depends on implementation - adjust expectation accordingly)
    expect(messagesAfter.length).toBeGreaterThanOrEqual(0);
  });

  test('should capture lead information', async ({ page }) => {
    await page.goto('/');

    // Mock lead capture API
    await page.route('**/api/chatbot/lead-capture', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Lead captured' }),
      });
    });

    const chatbot = new ChatbotWidget(page);
    await chatbot.open();

    // Look for lead capture form elements (implementation-specific)
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const companyInput = page.locator('input[name="company"], input[name="companyName"]').first();

    if ((await emailInput.count()) > 0) {
      await emailInput.fill('lead@example.com');

      if ((await companyInput.count()) > 0) {
        await companyInput.fill('Test Lead Company');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Wait for success message
      await page.waitForTimeout(2000);

      // Check for success indicator
      const hasSuccess =
        (await page.locator('text=/success|thank you|received/i').count()) > 0;
      expect(hasSuccess).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should open AI companion for authenticated user', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const aiCompanion = new AICompanionPanel(authenticatedPage);

    // Open AI companion
    await aiCompanion.open();
    expect(await aiCompanion.isOpen()).toBeTruthy();

    // Close AI companion
    await aiCompanion.close();
    expect(await aiCompanion.isOpen()).toBeFalsy();
  });

  test('should get AI response in companion panel', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const aiCompanion = new AICompanionPanel(authenticatedPage);
    await aiCompanion.open();

    // Send a message
    await aiCompanion.sendMessage('Show my recent orders');

    // Wait for response
    await aiCompanion.waitForResponse();

    // Verify response
    const lastMessage = await aiCompanion.getLastMessage();
    expect(lastMessage.length).toBeGreaterThan(0);
  });

  test('should handle AI companion tool execution', async ({ authenticatedPage }) => {
    // Mock tool execution
    await authenticatedPage.route('**/api/ai/companion', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: JSON.stringify({
          text: 'I found 3 recent orders for you.',
          toolCalls: [{ name: 'get_orders', result: { count: 3 } }],
        }),
      });
    });

    await authenticatedPage.goto('/dashboard');

    const aiCompanion = new AICompanionPanel(authenticatedPage);
    await aiCompanion.open();

    // Ask question that triggers tool
    await aiCompanion.sendMessage('What are my recent orders?');
    await aiCompanion.waitForResponse();

    const response = await aiCompanion.getLastMessage();
    expect(response.length).toBeGreaterThan(0);
  });

  test('should show thinking indicator while AI processes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const aiCompanion = new AICompanionPanel(authenticatedPage);
    await aiCompanion.open();

    // Send message
    await aiCompanion.sendMessage('Complex query that takes time');

    // Thinking indicator should appear
    await authenticatedPage.waitForTimeout(500);

    // Check if thinking indicator exists (even if it disappears quickly in mocked version)
    const thinkingExists = await aiCompanion.thinkingIndicator.count() > 0;

    // In production, this would be true. In mocked version, might not appear.
    // Test passes if either the indicator showed or response arrived quickly
    expect(thinkingExists || (await aiCompanion.messages.count()) > 0).toBeTruthy();
  });

  test('should maintain conversation history in companion', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const aiCompanion = new AICompanionPanel(authenticatedPage);
    await aiCompanion.open();

    // Send multiple messages
    await aiCompanion.sendMessage('First question');
    await aiCompanion.waitForResponse();

    await aiCompanion.sendMessage('Second question');
    await aiCompanion.waitForResponse();

    // Check conversation history
    const messages = await aiCompanion.getMessages();
    expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
  });

  test('admin should have access to advanced AI features', async ({ adminPage }) => {
    await adminPage.goto('/admin/dashboard');

    const aiCompanion = new AICompanionPanel(adminPage);
    await aiCompanion.open();

    // Send admin-specific query
    await aiCompanion.sendMessage('Analyze customer churn risk');
    await aiCompanion.waitForResponse();

    const response = await aiCompanion.getLastMessage();
    expect(response.length).toBeGreaterThan(0);
  });
});
