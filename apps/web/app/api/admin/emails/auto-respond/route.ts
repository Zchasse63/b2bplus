/**
 * Email Auto-Response API
 * 
 * Generates and sends automated responses to customer emails
 * using AI and templates.
 * 
 * Phase 5: Operational AI - Week 22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAutoResponse, EmailData } from '@/lib/ai/email-classification';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/emails/auto-respond
 * 
 * Generate and send auto-response for an email
 * 
 * Request body:
 * {
 *   email_id: string,
 *   template?: string,
 *   send?: boolean // If true, actually send the email (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // CRITICAL SECURITY: Authenticate and authorize user BEFORE doing anything
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role - only admin/super_admin can send auto-responses
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Forbidden: Only administrators can send auto-responses'
      }, { status: 403 });
    }

    const body = await request.json();
    const { email_id, template, send = true } = body;

    if (!email_id) {
      return NextResponse.json(
        { error: 'email_id is required' },
        { status: 400 }
      );
    }

    // Fetch email
    const { data: email, error: emailError } = await supabase
      .from('processed_emails')
      .select('*')
      .eq('id', email_id)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Check if auto-response already sent
    if (email.auto_response_sent) {
      return NextResponse.json(
        { error: 'Auto-response already sent for this email' },
        { status: 400 }
      );
    }

    // Get template if not provided
    let responseTemplate = template;
    if (!responseTemplate) {
      const { data: templates } = await supabase
        .from('email_auto_response_templates')
        .select('*')
        .eq('is_active', true)
        .eq('classification_type', email.classification)
        .limit(1)
        .single();

      if (templates) {
        responseTemplate = templates.body_template;
      }
    }

    // Prepare email data for AI
    const emailData: EmailData = {
      from_address: email.from_address,
      to_addresses: email.to_addresses,
      cc_addresses: email.cc_addresses || [],
      subject: email.subject,
      body_text: email.body_text,
      body_html: email.body_html,
      attachments: email.attachments || [],
    };

    // Generate auto-response using AI
    console.log(`[Auto-Response] Generating response for email ${email_id}`);
    const autoResponse = await generateAutoResponse(
      emailData,
      {
        classification: email.classification,
        confidence: email.classification_confidence,
        reasoning: email.classification_reasoning,
        sentiment: email.sentiment,
        sentiment_score: email.sentiment_score,
        urgency_level: email.urgency_level,
        extracted_entities: email.extracted_entities,
        suggested_actions: [],
        requires_human_review: false,
      },
      responseTemplate
    );

    // Personalize response with extracted entities
    let personalizedBody = autoResponse.body;
    if (email.extracted_entities) {
      if (email.extracted_entities.organization_name) {
        personalizedBody = personalizedBody.replace(
          /{{organization_name}}/g,
          email.extracted_entities.organization_name
        );
      }
      if (email.extracted_entities.order_number) {
        personalizedBody = personalizedBody.replace(
          /{{order_number}}/g,
          email.extracted_entities.order_number
        );
      }
      if (email.extracted_entities.contact_name) {
        personalizedBody = personalizedBody.replace(
          /{{contact_name}}/g,
          email.extracted_entities.contact_name
        );
      }
    }

    // Update email record
    const { error: updateError } = await supabase
      .from('processed_emails')
      .update({
        auto_response_sent: send,
        auto_response_content: personalizedBody,
        auto_response_sent_at: send ? new Date().toISOString() : null,
      })
      .eq('id', email_id);

    if (updateError) {
      throw new Error(`Failed to update email: ${updateError.message}`);
    }

    // Log auto-response action
    await supabase.from('email_actions_log').insert({
      email_id,
      action_type: 'auto_responded',
      success: true,
      action_details: {
        subject: autoResponse.subject,
        template_used: !!responseTemplate,
        sent: send,
      },
      performed_by_system: true,
    });

    // Send email if requested
    if (send) {
      await sendEmail({
        to: email.from_address,
        subject: autoResponse.subject,
        body: personalizedBody,
        in_reply_to: email.message_id,
        thread_id: email.thread_id,
      });

      console.log(`[Auto-Response] Sent response to ${email.from_address}`);
    }

    return NextResponse.json({
      success: true,
      email_id,
      response: {
        subject: autoResponse.subject,
        body: personalizedBody,
      },
      sent: send,
    });

  } catch (error: any) {
    console.error('Auto-response error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send email via email service provider
 * In production, integrate with SendGrid, Mailgun, etc.
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  in_reply_to?: string;
  thread_id?: string;
}) {
  // TODO: Integrate with email service provider
  // For now, just log the email
  console.log('[Email Service] Sending email:', {
    to: params.to,
    subject: params.subject,
    body_preview: params.body.substring(0, 100) + '...',
  });

  // Example SendGrid integration:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: params.to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: params.subject,
    text: params.body,
    html: params.body.replace(/\n/g, '<br>'),
    headers: {
      'In-Reply-To': params.in_reply_to,
      'References': params.thread_id,
    },
  };

  await sgMail.send(msg);
  */
}

/**
 * GET /api/admin/emails/auto-respond
 * 
 * Get auto-response statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // CRITICAL SECURITY: Authenticate and authorize user BEFORE doing anything
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role - only admin/super_admin can view auto-response statistics
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Forbidden: Only administrators can view auto-response statistics'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const fromDate = searchParams.get('from_date') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = searchParams.get('to_date') || new Date().toISOString();

    // Get auto-response statistics
    const { data: emails } = await supabase
      .from('processed_emails')
      .select('auto_response_sent, classification')
      .gte('received_at', fromDate)
      .lte('received_at', toDate);

    const stats = {
      total_emails: emails?.length || 0,
      auto_responded: emails?.filter(e => e.auto_response_sent).length || 0,
      auto_response_rate: 0,
      by_classification: {} as Record<string, { total: number; auto_responded: number }>,
    };

    stats.auto_response_rate = stats.total_emails > 0
      ? (stats.auto_responded / stats.total_emails) * 100
      : 0;

    // Calculate by classification
    emails?.forEach(email => {
      if (!stats.by_classification[email.classification]) {
        stats.by_classification[email.classification] = {
          total: 0,
          auto_responded: 0,
        };
      }
      stats.by_classification[email.classification].total++;
      if (email.auto_response_sent) {
        stats.by_classification[email.classification].auto_responded++;
      }
    });

    return NextResponse.json({
      success: true,
      statistics: stats,
    });

  } catch (error: any) {
    console.error('Auto-response statistics error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

