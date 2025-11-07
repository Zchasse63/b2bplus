/**
 * SendGrid Webhook Handler
 *
 * Receives real-time events from SendGrid for email tracking:
 * - delivered: Email was successfully delivered
 * - open: Email was opened
 * - click: Link in email was clicked
 * - bounce: Email bounced
 * - spamreport: Email was marked as spam
 * - unsubscribe: Recipient unsubscribed
 *
 * SECURITY SETUP:
 * 1. In SendGrid dashboard, go to Settings > Mail Settings > Event Webhook
 * 2. Enable "Signed Event Webhook Requests"
 * 3. Copy the "Verification Key" (base64-encoded public key)
 * 4. Add to .env as: SENDGRID_WEBHOOK_VERIFICATION_KEY=<verification-key>
 * 5. This webhook will reject requests without valid signatures
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { logger, logSecurityEvent } from '@/lib/logger';

// Use service role key for webhook (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify SendGrid webhook signature
 * SECURITY: This prevents unauthorized webhook requests
 */
function verifySignature(request: NextRequest, payload: string): boolean {
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (!verificationKey) {
    logSecurityEvent('SENDGRID_WEBHOOK_VERIFICATION_KEY not configured', 'high', {
      environment: process.env.NODE_ENV,
    });
    // In development, you might want to skip verification
    // In production, this should always be required
    return process.env.NODE_ENV === 'development';
  }

  const signature = request.headers.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = request.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

  if (!signature || !timestamp) {
    logSecurityEvent('Missing signature or timestamp headers in webhook request', 'medium', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
    });
    return false;
  }

  // Verify timestamp is recent (within 10 minutes)
  const timestampMs = parseInt(timestamp) * 1000;
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  if (Math.abs(now - timestampMs) > maxAge) {
    logSecurityEvent('Webhook timestamp too old or in future', 'medium', {
      timestamp: timestampMs,
      now,
      difference: Math.abs(now - timestampMs),
    });
    return false;
  }

  // Compute expected signature using ECDSA
  const signedPayload = timestamp + payload;

  try {
    const verifier = crypto.createVerify('sha256WithRSAEncryption');
    verifier.update(signedPayload);

    // SendGrid uses ECDSA P-256 for signing
    // The verification key is a base64-encoded public key
    const publicKey = Buffer.from(verificationKey, 'base64').toString('utf8');
    const isValid = verifier.verify(publicKey, signature, 'base64');

    if (!isValid) {
      logSecurityEvent('Invalid webhook signature', 'high');
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get raw body for signature verification
    const rawBody = await request.text();

    // SECURITY: Verify webhook signature before processing
    if (!verifySignature(request, rawBody)) {
      logSecurityEvent('Webhook signature verification failed', 'critical', {
        url: request.url,
      });
      return NextResponse.json(
        { error: 'Unauthorized: Invalid signature' },
        { status: 401 }
      );
    }

    const events = JSON.parse(rawBody);
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    logger.info(`Received ${events.length} SendGrid webhook events`);

    for (const event of events) {
      try {
        await processEvent(event);
      } catch (error) {
        logger.error('Error processing event:', error, event);
        // Continue processing other events
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: events.length 
    });

  } catch (error: any) {
    logger.error('SendGrid webhook error:', error);
    return NextResponse.json({
      error: 'Failed to process webhook',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Process individual SendGrid event
 */
async function processEvent(event: any) {
  const {
    event: eventType,
    email,
    timestamp,
    sg_message_id,
    campaign_id,
    lead_id,
    url,
    reason,
    useragent,
    ip,
  } = event;

  logger.log(`Processing ${eventType} event for ${email}`);

  // Find recipient by custom args or email
  let recipient;

  if (lead_id && campaign_id) {
    // Find by lead_id and campaign_id from custom args
    const { data } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('lead_id', lead_id)
      .eq('campaign_id', campaign_id)
      .single();
    
    recipient = data;
  } else if (sg_message_id) {
    // Find by SendGrid message ID
    const { data } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('sendgrid_message_id', sg_message_id)
      .single();
    
    recipient = data;
  } else if (email) {
    // Find by email (least reliable, but fallback)
    const { data } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    recipient = data;
  }

  if (!recipient) {
    logger.warn(`Recipient not found for event: ${eventType}, email: ${email}`);
    return;
  }

  const eventTimestamp = new Date(timestamp * 1000).toISOString();

  // Process based on event type
  switch (eventType) {
    case 'delivered':
      await handleDelivered(recipient, eventTimestamp);
      break;
    
    case 'open':
      await handleOpen(recipient, eventTimestamp, useragent, ip);
      break;
    
    case 'click':
      await handleClick(recipient, eventTimestamp, url, useragent, ip);
      break;
    
    case 'bounce':
      await handleBounce(recipient, eventTimestamp, reason);
      break;
    
    case 'dropped':
      await handleDropped(recipient, eventTimestamp, reason);
      break;
    
    case 'spamreport':
      await handleSpamReport(recipient, eventTimestamp);
      break;
    
    case 'unsubscribe':
      await handleUnsubscribe(recipient, eventTimestamp);
      break;

    default:
      logger.log(`Unhandled event type: ${eventType}`);
  }
}

/**
 * Handle delivered event
 */
async function handleDelivered(recipient: any, timestamp: string) {
  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'delivered',
      delivered_at: timestamp,
    })
    .eq('id', recipient.id);
}

/**
 * Handle open event
 */
async function handleOpen(
  recipient: any, 
  timestamp: string, 
  useragent?: string,
  ip?: string
) {
  const isFirstOpen = !recipient.opened_at;
  
  // Determine device type from user agent
  let deviceType = 'desktop';
  if (useragent) {
    if (useragent.match(/iPhone|iPad|iPod/i)) {
      deviceType = 'mobile';
    } else if (useragent.match(/Android/i)) {
      deviceType = 'mobile';
    }
  }

  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'opened',
      opened_at: isFirstOpen ? timestamp : recipient.opened_at,
      open_count: (recipient.open_count || 0) + 1,
      last_opened_at: timestamp,
    })
    .eq('id', recipient.id);

  // Log activity only for first open
  if (isFirstOpen && recipient.lead_id) {
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_opened',
        subject: 'Opened email campaign',
        description: `Opened email on ${deviceType}`,
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          device_type: deviceType,
          user_agent: useragent,
          ip_address: ip,
          timestamp,
        },
        created_at: timestamp,
      });

    // Update lead score (opened email = +3 points)
    await supabase.rpc('increment_lead_score', {
      p_lead_id: recipient.lead_id,
      p_increment: 3,
    });
  }
}

/**
 * Handle click event
 */
async function handleClick(
  recipient: any,
  timestamp: string,
  url?: string,
  useragent?: string,
  ip?: string
) {
  const isFirstClick = !recipient.clicked_at;

  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'clicked',
      clicked_at: isFirstClick ? timestamp : recipient.clicked_at,
      click_count: (recipient.click_count || 0) + 1,
      last_clicked_at: timestamp,
    })
    .eq('id', recipient.id);

  // Log click details
  if (url) {
    await supabase
      .from('email_campaign_clicks')
      .insert({
        recipient_id: recipient.id,
        url,
        clicked_at: timestamp,
        user_agent: useragent,
        ip_address: ip,
      });
  }

  // Log activity only for first click
  if (isFirstClick && recipient.lead_id) {
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_clicked',
        subject: 'Clicked link in email',
        description: url ? `Clicked: ${url}` : 'Clicked link in email campaign',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          url,
          user_agent: useragent,
          ip_address: ip,
          timestamp,
        },
        created_at: timestamp,
      });

    // Update lead score (clicked link = +5 points)
    await supabase.rpc('increment_lead_score', {
      p_lead_id: recipient.lead_id,
      p_increment: 5,
    });
  }
}

/**
 * Handle bounce event
 */
async function handleBounce(recipient: any, timestamp: string, reason?: string) {
  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'bounced',
      bounced_at: timestamp,
      error_message: reason,
    })
    .eq('id', recipient.id);

  // Mark email as invalid in leads table
  if (recipient.lead_id) {
    await supabase
      .from('leads')
      .update({
        email_valid: false,
        email_bounce_reason: reason,
      })
      .eq('id', recipient.lead_id);

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_bounced',
        subject: 'Email bounced',
        description: reason || 'Email address is invalid',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          reason,
          timestamp,
        },
        created_at: timestamp,
      });
  }
}

/**
 * Handle dropped event
 */
async function handleDropped(recipient: any, timestamp: string, reason?: string) {
  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'failed',
      failed_at: timestamp,
      error_message: reason,
    })
    .eq('id', recipient.id);

  if (recipient.lead_id) {
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'email_failed',
        subject: 'Email failed to send',
        description: reason || 'Email was dropped by SendGrid',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          reason,
          timestamp,
        },
        created_at: timestamp,
      });
  }
}

/**
 * Handle spam report event
 */
async function handleSpamReport(recipient: any, timestamp: string) {
  await supabase
    .from('email_campaign_recipients')
    .update({
      status: 'spam',
      spam_reported_at: timestamp,
    })
    .eq('id', recipient.id);

  // Mark lead as unsubscribed and do not contact
  if (recipient.lead_id) {
    await supabase
      .from('leads')
      .update({
        unsubscribed: true,
        unsubscribed_at: timestamp,
        do_not_contact: true,
        status: 'lost',
      })
      .eq('id', recipient.lead_id);

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'spam_report',
        subject: 'Marked email as spam',
        description: 'Recipient marked email as spam. Automatically unsubscribed.',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          timestamp,
        },
        created_at: timestamp,
      });

    // TODO: Send alert to admin about spam report
    logger.warn(`SPAM REPORT: Lead ${recipient.lead_id} marked email as spam`);
  }
}

/**
 * Handle unsubscribe event
 */
async function handleUnsubscribe(recipient: any, timestamp: string) {
  // Mark lead as unsubscribed
  if (recipient.lead_id) {
    await supabase
      .from('leads')
      .update({
        unsubscribed: true,
        unsubscribed_at: timestamp,
      })
      .eq('id', recipient.lead_id);

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: recipient.lead_id,
        activity_type: 'unsubscribed',
        subject: 'Unsubscribed from emails',
        description: 'Recipient unsubscribed from email campaigns',
        metadata: {
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          timestamp,
        },
        created_at: timestamp,
      });
  }
}

// Allow GET for webhook verification (SendGrid may send GET requests)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'SendGrid webhook endpoint is active'
  });
}
