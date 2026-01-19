import { Page, Locator } from '@playwright/test';

/**
 * Page Object for AI Companion Panel (authenticated users)
 */
export class AICompanionPanel {
  readonly page: Page;
  readonly panelToggle: Locator;
  readonly panel: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly thinkingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panelToggle = page.locator('[data-testid="ai-companion-toggle"]');
    this.panel = page.locator('[data-testid="ai-companion-panel"]');
    this.messageInput = page.locator('[data-testid="ai-companion-input"]');
    this.sendButton = page.locator('[data-testid="ai-companion-send"]');
    this.messages = page.locator('[data-testid="ai-companion-message"]');
    this.thinkingIndicator = page.locator('[data-testid="ai-thinking"]');
  }

  /**
   * Open the AI companion panel
   */
  async open() {
    if (!(await this.isOpen())) {
      await this.panelToggle.click();
      await this.panel.waitFor({ state: 'visible' });
    }
  }

  /**
   * Close the AI companion panel
   */
  async close() {
    if (await this.isOpen()) {
      await this.panelToggle.click();
      await this.panel.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Send a message to AI companion
   */
  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * Wait for AI to finish thinking
   */
  async waitForThinking(timeout: number = 30000) {
    // Wait for thinking indicator to appear
    await this.thinkingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Wait for thinking indicator to disappear
    await this.thinkingIndicator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for new message response
   */
  async waitForResponse(timeout: number = 30000) {
    const initialCount = await this.messages.count();
    await this.page.waitForFunction(
      (count) => {
        const messages = document.querySelectorAll('[data-testid="ai-companion-message"]');
        return messages.length > count;
      },
      initialCount,
      { timeout }
    );
  }

  /**
   * Get all messages in the conversation
   */
  async getMessages(): Promise<Array<{ role: string; content: string }>> {
    const messageElements = await this.messages.all();
    const messages = [];

    for (const el of messageElements) {
      const role = await el.getAttribute('data-role');
      const content = await el.textContent();
      messages.push({ role: role || 'unknown', content: content || '' });
    }

    return messages;
  }

  /**
   * Get the last message
   */
  async getLastMessage(): Promise<string> {
    const messages = await this.getMessages();
    return messages[messages.length - 1]?.content || '';
  }

  /**
   * Check if panel is open
   */
  async isOpen(): Promise<boolean> {
    return this.panel.isVisible();
  }

  /**
   * Send message and wait for response
   */
  async ask(question: string, timeout: number = 30000): Promise<string> {
    await this.sendMessage(question);
    await this.waitForResponse(timeout);
    return this.getLastMessage();
  }
}
