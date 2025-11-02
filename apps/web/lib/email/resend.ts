// Resend email service
// Note: Install resend package with: pnpm add resend

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class ResendEmailService {
  private apiKey: string;
  private defaultFrom: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'noreply@b2bplus.com';
    
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not set in environment variables');
    }
  }

  async send(options: EmailOptions): Promise<EmailResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Resend API key not configured');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: options.from || this.defaultFrom,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          cc: options.cc,
          bcc: options.bcc
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return {
        success: true,
        messageId: data.id
      };

    } catch (error) {
      console.error('Error sending email via Resend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendBulk(emails: EmailOptions[]): Promise<EmailResponse[]> {
    const results: EmailResponse[] = [];
    
    // Send in batches of 100 (Resend limit)
    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(email => this.send(email))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async sendTemplate(
    templateName: string,
    to: string | string[],
    variables: Record<string, any>
  ): Promise<EmailResponse> {
    // This is a placeholder for template rendering
    // In a real implementation, you would fetch the template from database
    // and replace variables with actual values
    
    try {
      // For now, return error as templates need to be implemented
      return {
        success: false,
        error: 'Template sending not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
export const resendEmail = new ResendEmailService();

// Helper function to render template with variables
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });
  
  return rendered;
}

// Helper function to send transactional email
export async function sendTransactionalEmail(
  type: 'order_confirmation' | 'order_shipped' | 'invoice_generated' | 'welcome',
  to: string,
  data: Record<string, any>
): Promise<EmailResponse> {
  const templates = {
    order_confirmation: {
      subject: `Order Confirmation - Order #${data.order_number}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Your order #${data.order_number} has been received and is being processed.</p>
        <p><strong>Order Total:</strong> $${data.order_total}</p>
        <p>We'll send you another email when your order ships.</p>
      `
    },
    order_shipped: {
      subject: `Your Order Has Shipped - Order #${data.order_number}`,
      html: `
        <h1>Your order is on the way!</h1>
        <p>Order #${data.order_number} has been shipped.</p>
        ${data.tracking_number ? `<p><strong>Tracking Number:</strong> ${data.tracking_number}</p>` : ''}
        <p>You should receive your order within 3-5 business days.</p>
      `
    },
    invoice_generated: {
      subject: `Invoice #${data.invoice_number} - Payment Due`,
      html: `
        <h1>Invoice Generated</h1>
        <p>Invoice #${data.invoice_number} has been generated for your order.</p>
        <p><strong>Amount Due:</strong> $${data.amount_due}</p>
        <p><strong>Due Date:</strong> ${data.due_date}</p>
        ${data.payment_link ? `<p><a href="${data.payment_link}">Pay Now</a></p>` : ''}
      `
    },
    welcome: {
      subject: 'Welcome to B2B+!',
      html: `
        <h1>Welcome to B2B+!</h1>
        <p>Thank you for creating an account, ${data.name}. We're excited to have you as a customer.</p>
        <p>You can now browse our catalog and place orders online.</p>
        <p><a href="${data.login_url}">Log in to your account</a></p>
      `
    }
  };

  const template = templates[type];
  if (!template) {
    return {
      success: false,
      error: `Unknown email type: ${type}`
    };
  }

  return resendEmail.send({
    to,
    subject: template.subject,
    html: template.html
  });
}
