import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resendEmail, renderTemplate } from '@/lib/email/resend';
import { checkAdminRole } from '@/lib/middleware/admin';

// Batch size for concurrent email sends
const BATCH_SIZE = 50;

// POST send email campaign
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const supabase = await createClient();

    const body = await request.json();
    const { campaignId } = body;

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

            const htmlContent = renderTemplate(campaign.html_content || '', variables);
            const textContent = campaign.text_content
              ? renderTemplate(campaign.text_content, variables)
              : undefined;

            // Send email via Resend
            const result = await resendEmail.send({
              to: recipient.email,
              subject: campaign.subject,
              html: htmlContent,
              text: textContent
            });

            return {
              recipient,
              success: result.success,
              messageId: result.messageId,
              error: result.error
            };
          } catch (error) {
            return {
              recipient,
              success: false,
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
              resend_message_id: result.value.messageId
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
