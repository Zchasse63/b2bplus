/**
 * SendGrid Email Helper Library
 *
 * Provides functions for sending emails via SendGrid with full tracking support.
 * Used for voice-triggered email automation, regional campaigns, and personalized emails.
 */

import sgMail from '@sendgrid/mail';
import { getEnv } from './env';

const env = getEnv();

// Initialize SendGrid with API key
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables');
}

/**
 * Email configuration from environment
 * All values must be provided via environment variables - no fallbacks
 */
export const EMAIL_CONFIG = {
  fromEmail: env.SENDGRID_FROM_EMAIL || '',
  fromName: env.SENDGRID_FROM_NAME || '',
  replyTo: env.SENDGRID_REPLY_TO_EMAIL || '',
  testEmail: env.TEST_USER_EMAIL || 'test@example.com',
};

/**
 * Send a single email via SendGrid
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  customArgs?: Record<string, string>;
  categories?: string[];
  from?: {
    email: string;
    name: string;
  };
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const {
    to,
    subject,
    html,
    text,
    customArgs = {},
    categories = [],
    from,
    replyTo,
  } = options;

  const msg = {
    to,
    from: from || {
      email: EMAIL_CONFIG.fromEmail,
      name: EMAIL_CONFIG.fromName,
    },
    replyTo: replyTo || EMAIL_CONFIG.replyTo,
    subject,
    html,
    text: text || stripHtml(html), // Auto-generate text version if not provided
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: true,
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open-track%',
      },
      subscriptionTracking: {
        enable: false, // We'll handle unsubscribes manually
      },
    },
    customArgs,
    categories,
  };

  try {
    const [response] = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: response.headers['x-message-id'],
      statusCode: response.statusCode,
      to,
      subject,
    };
  } catch (error: any) {
    console.error('SendGrid send error:', error);
    
    if (error.response) {
      console.error('SendGrid error body:', error.response.body);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send bulk emails via SendGrid
 * Sends multiple emails with personalization
 */
export interface BulkEmailRecipient {
  to: string;
  subject: string;
  html: string;
  text?: string;
  customArgs?: Record<string, string>;
}

export async function sendBulkEmails(
  recipients: BulkEmailRecipient[],
  options?: {
    categories?: string[];
    from?: { email: string; name: string };
    replyTo?: string;
  }
) {
  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        ...recipient,
        categories: options?.categories,
        from: options?.from,
        replyTo: options?.replyTo,
      });
      results.push(result);
    } catch (error: any) {
      errors.push({
        to: recipient.to,
        error: error.message,
      });
    }
  }

  return {
    success: errors.length === 0,
    sent: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Validate email address using SendGrid validation
 * Note: This requires SendGrid Email Validation API (separate product)
 * For now, we'll use a simple regex validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Strip HTML tags from content to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Create tracking pixel HTML for email opens
 * Note: SendGrid handles this automatically, but this can be used for custom tracking
 */
export function createTrackingPixel(recipientId: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/track/open?id=${recipientId}" width="1" height="1" style="display:none" alt="" />`;
}

/**
 * Wrap URLs in email with click tracking
 * Note: SendGrid handles this automatically, but this can be used for custom tracking
 */
export function wrapLinksWithTracking(
  html: string,
  recipientId: string,
  baseUrl: string
): string {
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  
  return html.replace(linkRegex, (match, url) => {
    // Skip if already a tracking link
    if (url.includes('/api/track/')) {
      return match;
    }
    
    // Create tracking URL
    const trackingUrl = `${baseUrl}/api/track/click?id=${recipientId}&url=${encodeURIComponent(url)}`;
    
    return match.replace(url, trackingUrl);
  });
}

/**
 * Add UTM parameters to links for analytics
 */
export function addUtmParameters(
  html: string,
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }
): string {
  const { source = 'email', medium = 'campaign', campaign, content } = utmParams;
  
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  
  return html.replace(linkRegex, (match, url) => {
    // Skip external links and already-parameterized UTM links
    if (!url.startsWith('http') || url.includes('utm_source')) {
      return match;
    }
    
    const separator = url.includes('?') ? '&' : '?';
    const utmString = [
      `utm_source=${encodeURIComponent(source)}`,
      `utm_medium=${encodeURIComponent(medium)}`,
      campaign && `utm_campaign=${encodeURIComponent(campaign)}`,
      content && `utm_content=${encodeURIComponent(content)}`,
    ]
      .filter(Boolean)
      .join('&');
    
    return match.replace(url, `${url}${separator}${utmString}`);
  });
}

/**
 * Create email template with proper formatting
 */
export function createEmailTemplate(options: {
  body: string;
  preheader?: string;
  footer?: string;
  unsubscribeUrl?: string;
}): string {
  const { body, preheader, footer, unsubscribeUrl } = options;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      padding: 20px;
      text-align: center;
      background-color: #0066cc;
      color: #ffffff;
    }
    .email-body {
      padding: 30px 20px;
    }
    .email-footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      background-color: #f9f9f9;
      border-top: 1px solid #eeeeee;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 0;
      background-color: #0066cc;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
    }
    .button:hover {
      background-color: #0052a3;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    .preheader {
      display: none;
      font-size: 1px;
      color: #ffffff;
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
  
  <div class="email-container">
    <div class="email-header">
      <h2 style="margin: 0;">${EMAIL_CONFIG.fromName}</h2>
    </div>
    
    <div class="email-body">
      ${body}
    </div>
    
    <div class="email-footer">
      ${footer || `
        <p style="margin: 0 0 10px 0;"><strong>${EMAIL_CONFIG.fromName}</strong></p>
        <p style="margin: 0 0 10px 0;">${EMAIL_CONFIG.fromEmail}</p>
      `}
      ${unsubscribeUrl ? `<p style="margin: 10px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe</a></p>` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send lead notification to sales team
 * Phase 2: AI Backend Logic - Lead Notifications
 */
export interface LeadNotificationData {
  leadId: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadScore: number;
  leadCategory: 'hot' | 'warm' | 'cold';
  industry: string | null;
  painPoints: string[];
  nextSteps: string[];
  notes: string;
  conversationSummary?: string;
}

export async function sendLeadNotification(data: LeadNotificationData) {
  const {
    leadId,
    companyName,
    contactName,
    email,
    phone,
    leadScore,
    leadCategory,
    industry,
    painPoints,
    nextSteps,
    notes,
    conversationSummary,
  } = data;

  // Determine urgency based on lead category
  const urgencyEmoji = leadCategory === 'hot' ? '🔥' : leadCategory === 'warm' ? '⚡' : '📋';
  const urgencyLabel = leadCategory === 'hot' ? 'HOT LEAD' : leadCategory === 'warm' ? 'WARM LEAD' : 'NEW LEAD';
  const urgencyColor = leadCategory === 'hot' ? '#ef4444' : leadCategory === 'warm' ? '#f59e0b' : '#3b82f6';

  const subject = `${urgencyEmoji} ${urgencyLabel}: ${companyName || contactName || 'New Lead'} (Score: ${leadScore})`;

  const html = createEmailTemplate({
    body: `
      <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: white;">${urgencyEmoji} ${urgencyLabel}</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px; color: white;">Lead Score: ${leadScore}/100</p>
      </div>

      <h2>Contact Information</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Company:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${companyName || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Contact Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${contactName || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${email || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Industry:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${industry || 'Not provided'}</td>
        </tr>
      </table>

      ${painPoints.length > 0 ? `
        <h2>Pain Points</h2>
        <ul>
          ${painPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
      ` : ''}

      ${nextSteps.length > 0 ? `
        <h2>Recommended Next Steps</h2>
        <ol>
          ${nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      ` : ''}

      ${conversationSummary ? `
        <h2>Conversation Summary</h2>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
          <p style="margin: 0; white-space: pre-wrap;">${conversationSummary}</p>
        </div>
      ` : ''}

      <h2>AI Notes</h2>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <p style="margin: 0; white-space: pre-wrap;">${notes}</p>
      </div>

      <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Take Action Now</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/leads/${leadId}"
           style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Lead in CRM
        </a>
      </div>
    `,
  });

  // Send to sales team (configure recipients in environment)
  const salesTeamEmails = process.env.SALES_TEAM_EMAILS?.split(',') || [EMAIL_CONFIG.testEmail];

  const results = [];
  for (const recipient of salesTeamEmails) {
    try {
      const result = await sendEmail({
        to: recipient.trim(),
        subject,
        html,
        customArgs: {
          lead_id: leadId,
          lead_category: leadCategory,
          lead_score: leadScore.toString(),
        },
        categories: ['lead_notification', leadCategory],
      });
      results.push(result);
    } catch (error) {
      console.error(`Failed to send lead notification to ${recipient}:`, error);
    }
  }

  return {
    success: results.length > 0,
    sentTo: results.map(r => r.to),
    messageIds: results.map(r => r.messageId),
  };
}

/**
 * Send reorder notification email with product recommendations
 */
export interface ReorderProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
  predicted_quantity: number;
  confidence_level: number;
  predicted_reorder_date: string;
}

export async function sendReorderNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  products: ReorderProduct[]
) {
  const subject = `Time to Reorder: ${products.length} Product${products.length > 1 ? 's' : ''} Running Low`;

  // Build product cards HTML
  const productCards = products
    .map(
      (product) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #ffffff;">
      <div style="display: flex; gap: 16px; align-items: start;">
        ${
          product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" />`
            : ''
        }
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">${product.name}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">SKU: ${product.sku}</p>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <span style="display: inline-block; padding: 4px 8px; background-color: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 12px; font-weight: 500;">
              Qty: ${product.predicted_quantity}
            </span>
            <span style="display: inline-block; padding: 4px 8px; background-color: ${
              product.confidence_level >= 0.8 ? '#d1fae5' : '#fef3c7'
            }; color: ${
        product.confidence_level >= 0.8 ? '#065f46' : '#92400e'
      }; border-radius: 4px; font-size: 12px; font-weight: 500;">
              ${Math.round(product.confidence_level * 100)}% confidence
            </span>
          </div>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Predicted reorder date: ${new Date(product.predicted_reorder_date).toLocaleDateString()}
          </p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #111827;">$${product.price.toFixed(2)}</p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">per unit</p>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  const html = createEmailTemplate({
    preheader: `${products.length} product${products.length > 1 ? 's' : ''} ready to reorder`,
    body: `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; color: #111827;">
          Time to Reorder!
        </h1>
        <p style="margin: 0; font-size: 16px; color: #6b7280;">
          Hi ${recipientName}, based on your purchase history, we predict you'll need these items soon.
        </p>
      </div>

      ${productCards}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/notifications" class="button" style="display: inline-block; padding: 14px 28px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          View All Recommendations
        </a>
      </div>

      <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0066cc;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827;">Why am I receiving this?</p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Our AI analyzes your purchase patterns to predict when you'll need to reorder.
          This helps you avoid running out of essential items and ensures timely delivery.
        </p>
      </div>
    `,
    footer: `
      <p style="margin: 0 0 10px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications" style="color: #0066cc;">
          Manage notification preferences
        </a>
      </p>
    `,
  });

  return await sendEmail({
    to: recipientEmail,
    subject,
    html,
    customArgs: {
      notification_type: 'reorder_reminder',
      product_count: products.length.toString(),
    },
    categories: ['reorder_notification', 'automated'],
  });
}

/**
 * Test SendGrid connection
 */
export async function testSendGridConnection(): Promise<boolean> {
  try {
    // Try to send a test email
    const result = await sendEmail({
      to: EMAIL_CONFIG.testEmail,
      subject: 'SendGrid Connection Test',
      html: createEmailTemplate({
        body: `
          <h2>SendGrid Connection Successful! ✅</h2>
          <p>This is a test email to verify that SendGrid is properly configured.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>From: ${EMAIL_CONFIG.fromEmail}</li>
            <li>From Name: ${EMAIL_CONFIG.fromName}</li>
            <li>Reply-To: ${EMAIL_CONFIG.replyTo}</li>
          </ul>
          <p>If you received this email, everything is working correctly!</p>
        `,
      }),
      customArgs: {
        test: 'true',
        type: 'connection_test',
      },
      categories: ['test', 'connection'],
    });

    console.log('SendGrid test email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('SendGrid connection test failed:', error);
    return false;
  }
}
