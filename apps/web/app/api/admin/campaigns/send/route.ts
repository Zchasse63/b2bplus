import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resendEmail, renderTemplate } from '@/lib/email/resend';

// POST send email campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Send emails in batches
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
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

        if (result.success) {
          // Update recipient status
          await supabase
            .from('email_campaign_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              resend_message_id: result.messageId
            })
            .eq('id', recipient.id);
          
          sent++;
        } else {
          // Mark as failed
          await supabase
            .from('email_campaign_recipients')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: result.error
            })
            .eq('id', recipient.id);
          
          failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Error sending to recipient:', recipient.email, error);
        failed++;
        
        await supabase
          .from('email_campaign_recipients')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', recipient.id);
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
