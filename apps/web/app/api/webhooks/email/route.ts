/**
 * Email Webhook Handler
 * 
 * Receives incoming emails from email service provider (e.g., SendGrid, Mailgun)
 * and processes them with AI classification and routing.
 * 
 * Phase 5: Operational AI - Week 22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyEmail, EmailData } from '@/lib/ai/email-classification';
import { createLogger } from '@/lib/logging/logger';
import { verifyEmailWebhookToken, extractEmailWebhookHeaders } from '@/lib/webhooks/email-verify';
import { checkRateLimit, getClientIp } from '@/lib/webhooks/rate-limit';

const logger = createLogger('email-webhook');

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/webhooks/email
 * 
 * Webhook endpoint for incoming emails
 * 
 * Expected payload (SendGrid Inbound Parse format):
 * {
 *   from: string,
 *   to: string,
 *   cc?: string,
 *   subject: string,
 *   text: string,
 *   html?: string,
 *   attachments?: number,
 *   attachment-info?: object,
 *   headers: string,
 *   envelope: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`email-webhook-${clientIp}`, 500, 60000)) {
      logger.warn('Email webhook rate limit exceeded', { clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Verify webhook authentication
    const { authorization } = extractEmailWebhookHeaders(request);
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (!verifyEmailWebhookToken(authorization, webhookSecret)) {
      logger.warn('Unauthorized email webhook request - invalid or missing authentication', { clientIp });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let emailData: any;

    // Handle different content types
    if (contentType.includes('application/json')) {
      emailData = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      emailData = Object.fromEntries(formData);
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 400 }
      );
    }

    // Parse email data
    const email: EmailData = {
      from_address: emailData.from || emailData.sender || '',
      to_addresses: parseEmailAddresses(emailData.to || ''),
      cc_addresses: parseEmailAddresses(emailData.cc || ''),
      subject: emailData.subject || '(No Subject)',
      body_text: emailData.text || emailData.body || '',
      body_html: emailData.html,
      attachments: parseAttachments(emailData),
    };

    if (!email.from_address || !email.subject) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    // Generate unique email ID
    const emailId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Classify email with AI
    logger.debug(`Classifying email from ${email.from_address}`);
    const classification = await classifyEmail(email);

    logger.debug(`Classification: ${classification.classification} (${classification.confidence})`);

    // Store email in database using admin client (webhooks bypass RLS)
    const supabase = createAdminClient();

    const { data: processedEmail, error: insertError } = await supabase
      .from('processed_emails')
      .insert({
        email_id: emailId,
        message_id: emailData.headers?.['message-id'] || emailData['message-id'],
        thread_id: emailData.headers?.['thread-id'] || emailData['thread-id'],
        from_address: email.from_address,
        to_addresses: email.to_addresses,
        cc_addresses: email.cc_addresses,
        subject: email.subject,
        body_text: email.body_text,
        body_html: email.body_html,
        attachments: email.attachments || [],
        classification: classification.classification,
        classification_confidence: classification.confidence,
        classification_reasoning: classification.reasoning,
        sentiment: classification.sentiment,
        sentiment_score: classification.sentiment_score,
        urgency_level: classification.urgency_level,
        extracted_entities: classification.extracted_entities,
        processing_status: 'processing',
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Email Webhook] Database insert error:', insertError);
      throw new Error(`Failed to store email: ${insertError.message}`);
    }

    // Log classification action
    await supabase.from('email_actions_log').insert({
      email_id: processedEmail.id,
      action_type: 'classified',
      success: true,
      action_details: {
        classification: classification.classification,
        confidence: classification.confidence,
        urgency: classification.urgency_level,
      },
      performed_by_system: true,
    });

    // Trigger background processing (routing, auto-response, etc.)
    // In production, this would be a background job/queue
    processEmailInBackground(processedEmail.id, email, classification);

    return NextResponse.json({
      success: true,
      email_id: processedEmail.id,
      classification: classification.classification,
      urgency: classification.urgency_level,
    });

  } catch (error: any) {
    console.error('[Email Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse email addresses from string
 */
function parseEmailAddresses(addresses: string): string[] {
  if (!addresses) return [];
  
  // Handle comma or semicolon separated addresses
  return addresses
    .split(/[,;]/)
    .map(addr => {
      // Extract email from "Name <email@example.com>" format
      const match = addr.match(/<(.+?)>/);
      return match ? match[1].trim() : addr.trim();
    })
    .filter(addr => addr.length > 0);
}

/**
 * Parse attachments from email data
 */
function parseAttachments(emailData: any): Array<{
  filename: string;
  content_type: string;
  size: number;
}> {
  const attachments: Array<{
    filename: string;
    content_type: string;
    size: number;
  }> = [];

  // Handle SendGrid format
  if (emailData['attachment-info']) {
    try {
      const attachmentInfo = typeof emailData['attachment-info'] === 'string'
        ? JSON.parse(emailData['attachment-info'])
        : emailData['attachment-info'];

      for (const [filename, info] of Object.entries(attachmentInfo)) {
        attachments.push({
          filename,
          content_type: (info as any).type || 'application/octet-stream',
          size: (info as any).length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to parse attachment info:', error);
    }
  }

  // Handle other formats
  if (emailData.attachments && Array.isArray(emailData.attachments)) {
    for (const attachment of emailData.attachments) {
      attachments.push({
        filename: attachment.filename || attachment.name || 'unknown',
        content_type: attachment.contentType || attachment.type || 'application/octet-stream',
        size: attachment.size || 0,
      });
    }
  }

  return attachments;
}

/**
 * Process email in background (routing, auto-response, etc.)
 * In production, this would be a background job/queue
 */
async function processEmailInBackground(
  emailId: string,
  email: EmailData,
  classification: any
) {
  // This would typically be a background job
  // For now, we'll just trigger the routing API
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/emails/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_id: emailId,
        classification,
      }),
    });

    if (!response.ok) {
      console.error('[Email Webhook] Background processing failed:', await response.text());
    }
  } catch (error) {
    console.error('[Email Webhook] Background processing error:', error);
  }
}

/**
 * GET /api/webhooks/email
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'email-webhook',
    timestamp: new Date().toISOString(),
  });
}

