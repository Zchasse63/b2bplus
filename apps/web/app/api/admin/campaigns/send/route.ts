import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendgrid';
import { checkAdminRole } from '@/lib/middleware/admin';
import { generateJSON } from '@/lib/gemini';

// Batch size for concurrent email sends
const BATCH_SIZE = 50;

/**
 * Render email template with variables
 * Replaces {{variable_name}} with actual values
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

/**
 * Generate AI-personalized email content using Gemini 2.5 Flash
 * Flash is 15× cheaper than Pro and perfect for high-volume campaigns
 */
async function generatePersonalizedContent(
  baseSubject: string,
  baseContent: string,
  recipient: any
): Promise<{ subject: string; content: string }> {
  try {
    const aiPrompt = `
You are a B2B sales expert. Personalize this email for the recipient while maintaining the core message.

RECIPIENT INFO:
- Name: ${recipient.customer_name || 'Valued Customer'}
- Email: ${recipient.email}

ORIGINAL SUBJECT: ${baseSubject}

ORIGINAL CONTENT:
${baseContent}

Generate a personalized version that:
1. Addresses the recipient by name naturally
2. Maintains the core message and call-to-action
3. Uses a professional, engaging tone
4. Keeps the same length (don't make it significantly longer)

Return JSON with this exact structure:
{
  "subject": "personalized subject line",
  "content": "personalized email body in HTML format"
}
`;

    const result = await generateJSON(aiPrompt, {
      temperature: 0.7,
      systemPrompt: 'You are a B2B email personalization expert. Generate engaging, professional email content.'
    });

    return {
      subject: result.subject || baseSubject,
      content: result.content || baseContent
    };
  } catch (error) {
    console.error('AI personalization error:', error);
    // Fallback to template-based personalization
    return {
      subject: baseSubject,
      content: baseContent
    };
  }
}

// POST send email campaign
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    const body = await request.json();
    const { campaignId, useAI = false } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Campaign already sent' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (recipientsError || !recipients || recipients.length === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId);
        
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      );
    }

    // Send emails in batches for better performance
    let sent = 0;
    let failed = 0;

    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Send all emails in this batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(async (recipient) => {
          try {
            // Render email content with recipient-specific variables
            const variables = {
              customer_name: recipient.customer_name || 'Valued Customer',
              customer_email: recipient.email
            };

            let finalSubject = campaign.subject;
            let htmlContent = renderTemplate(campaign.html_content || '', variables);
            let textContent = campaign.text_content
              ? renderTemplate(campaign.text_content, variables)
              : undefined;

            // Apply AI personalization if enabled
            if (useAI) {
              const personalized = await generatePersonalizedContent(
                finalSubject,
                htmlContent,
                recipient
              );
              finalSubject = personalized.subject;
              htmlContent = personalized.content;
              // Regenerate text content from AI-generated HTML
              textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
            }

            // Send email via SendGrid
            const result = await sendEmail({
              to: recipient.email,
              subject: finalSubject,
              html: htmlContent,
              text: textContent,
              customArgs: {
                campaign_id: campaignId,
                recipient_id: recipient.id,
                ai_personalized: useAI ? 'true' : 'false',
              },
              categories: [
                'campaign',
                campaign.name || 'unnamed',
                useAI ? 'ai-personalized' : 'template-based'
              ],
            });

            return {
              recipient,
              success: result.success,
              messageId: result.messageId,
            };
          } catch (error) {
            return {
              recipient,
              success: false,
              messageId: undefined,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      // Update database in batch
      const updates = batchResults.map((result, index) => {
        const recipient = batch[index];

        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
          return supabase
            .from('email_campaign_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              sendgrid_message_id: result.value.messageId
            })
            .eq('id', recipient.id);
        } else {
          failed++;
          const error = result.status === 'fulfilled'
            ? result.value.error
            : result.reason?.message || 'Unknown error';

          return supabase
            .from('email_campaign_recipients')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error
            })
            .eq('id', recipient.id);
        }
      });

      // Execute all database updates for this batch
      await Promise.all(updates);

      // Small delay between batches to avoid overwhelming the email service
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: recipients.length
    });

  } catch (error) {
    console.error('Error in send campaign API:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
