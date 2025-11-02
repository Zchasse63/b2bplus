/**
 * SendGrid Email Helper Library
 * 
 * Provides functions for sending emails via SendGrid with full tracking support.
 * Used for voice-triggered email automation, regional campaigns, and personalized emails.
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found in environment variables');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Email configuration from environment
 */
export const EMAIL_CONFIG = {
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'Sales@valuesource.co',
  fromName: process.env.SENDGRID_FROM_NAME || 'Metro Bag',
  replyTo: process.env.SENDGRID_REPLY_TO_EMAIL || 'Zach@metrobagllc.com',
  testEmail: process.env.TEST_EMAIL || 'Zchasse89@gmail.com',
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
