import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Chatbot Widget
 */
export class ChatbotWidget {
  readonly page: Page;
  readonly widgetButton: Locator;
  readonly chatWindow: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.widgetButton = page.locator('[data-testid="chatbot-widget-button"]');
    this.chatWindow = page.locator('[data-testid="chatbot-window"]');
    this.messageInput = page.locator('[data-testid="chatbot-message-input"]');
    this.sendButton = page.locator('[data-testid="chatbot-send-button"]');
    this.messages = page.locator('[data-testid="chatbot-message"]');
    this.closeButton = page.locator('[data-testid="chatbot-close-button"]');
  }

  /**
   * Open the chatbot widget
   */
  async open() {
    await this.widgetButton.click();
    await this.chatWindow.waitFor({ state: 'visible' });
  }

  /**
   * Close the chatbot widget
   */
  async close() {
    await this.closeButton.click();
    await this.chatWindow.waitFor({ state: 'hidden' });
  }

  /**
   * Send a message
   */
  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * Wait for AI response
   */
  async waitForResponse(timeout: number = 10000) {
    // Wait for new message to appear
    const initialCount = await this.messages.count();
    await this.page.waitForFunction(
      (count) => {
        const messages = document.querySelectorAll('[data-testid="chatbot-message"]');
        return messages.length > count;
      },
      initialCount,
      { timeout }
    );
  }

  /**
   * Get all messages
   */
  async getMessages(): Promise<string[]> {
    const messageElements = await this.messages.all();
    return Promise.all(messageElements.map((el) => el.textContent() || ''));
  }

  /**
   * Get the last message
   */
  async getLastMessage(): Promise<string> {
    const messages = await this.getMessages();
    return messages[messages.length - 1] || '';
  }

  /**
   * Check if chatbot is visible
   */
  async isVisible(): Promise<boolean> {
    return this.chatWindow.isVisible();
  }
}
