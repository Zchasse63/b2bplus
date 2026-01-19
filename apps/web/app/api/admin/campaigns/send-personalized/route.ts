import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/sendgrid';
import { generateJSON } from '@/lib/ai/providers/unified';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, NotFoundError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai');
    if (!allowed) return rateLimitResponse!;

    const { campaignId, leadIds, useAI = true } = await request.json();

    if (!campaignId) {
      throw new ValidationError('Campaign ID is required', { campaignId: ['Campaign ID is required'] });
    }

    const supabase = await createClient();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new NotFoundError('Campaign', campaignId);
    }

    // Get leads to send to
    let query = supabase
      .from('leads')
      .select('*, regions(name, tier), buying_groups(name)');

    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds);
    } else if (campaign.target_criteria) {
      // Apply target criteria filters
      const criteria = campaign.target_criteria;
      if (criteria.region) query = query.eq('region_id', criteria.region);
      if (criteria.status) query = query.eq('status', criteria.status);
      if (criteria.buyingGroup) query = query.eq('buying_group_id', criteria.buyingGroup);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError || !leads || leads.length === 0) {
      throw new NotFoundError('Leads matching criteria');
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sending',
        total_recipients: leads.length,
      })
      .eq('id', campaignId);

    let sentCount = 0;
    let failedCount = 0;

    // Send emails to each lead
    for (const lead of leads) {
      try {
        // Personalize email content
        let personalizedSubject = campaign.subject;
        let personalizedBody = campaign.body_template;

        if (useAI) {
          // Use AI to personalize the email
          const aiPrompt = `
You are a B2B sales expert. Personalize this email for the following lead:

Lead Information:
- Company: ${lead.company_name}
- Contact Name: ${lead.contact_name}
- Industry: ${lead.industry || 'Not specified'}
- Region: ${lead.regions?.name || 'Not specified'}
- Buying Group: ${lead.buying_groups?.name || 'None'}
- Lead Score: ${lead.lead_score}/100

Original Email Subject: ${campaign.subject}
Original Email Body: ${campaign.body_template}

Instructions:
1. Personalize the subject line to be more engaging and relevant to this specific lead
2. Personalize the email body with relevant details about their company, industry, and region
3. Keep the tone professional but friendly
4. Include a clear call-to-action
5. Keep it concise (max 200 words)

Return ONLY the personalized email in this exact JSON format:
{
  "subject": "personalized subject here",
  "body": "personalized body here (HTML allowed)"
}
`;

          try {
            const aiContent = await generateJSON<any>(aiPrompt, {
              temperature: 0.7,
              systemPrompt: 'You are a B2B sales expert specializing in personalized email campaigns.'
            });
            
            personalizedSubject = aiContent.subject || campaign.subject;
            personalizedBody = aiContent.body || campaign.body_template;
          } catch (parseError) {
            console.error('Error generating AI personalization:', parseError);
            // Fall back to template-based personalization
          }
        }

        // Apply template variables (fallback or additional personalization)
        personalizedSubject = personalizedSubject
          .replace(/{{company_name}}/g, lead.company_name)
          .replace(/{{contact_name}}/g, lead.contact_name || 'there')
          .replace(/{{region}}/g, lead.regions?.name || '');

        personalizedBody = personalizedBody
          .replace(/{{company_name}}/g, lead.company_name)
          .replace(/{{contact_name}}/g, lead.contact_name || 'there')
          .replace(/{{region}}/g, lead.regions?.name || '')
          .replace(/{{buying_group}}/g, lead.buying_groups?.name || 'None');

        // Generate magic link if this is an offer campaign
        let magicLink = '';
        if (campaign.campaign_type === 'promotional' || campaign.campaign_type === 'sample_offer') {
          const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

          await supabase
            .from('magic_link_tokens')
            .insert({
              lead_id: lead.id,
              token,
              email: lead.email,
              purpose: 'offer_access',
              redirect_url: '/products',
              expires_at: expiresAt,
            });

          magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/verify?token=${token}`;
          
          // Add magic link to email body
          personalizedBody += `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Your Personalized Pricing
              </a>
            </div>
          `;
        }

        // Send email via SendGrid
        await sendEmail({
          to: lead.email,
          subject: personalizedSubject,
          html: personalizedBody,
        });

        // Track email send
        await supabase
          .from('email_campaign_recipients')
          .insert({
            campaign_id: campaignId,
            lead_id: lead.id,
            email: lead.email,
            personalization_data: {
              company_name: lead.company_name,
              contact_name: lead.contact_name,
              region: lead.regions?.name,
              buying_group: lead.buying_groups?.name,
            },
            status: 'sent',
            sent_at: new Date().toISOString(),
            magic_link_token: magicLink ? magicLink.split('token=')[1] : null,
          });

        // Log activity
        await supabase
          .from('lead_activities')
          .insert({
            lead_id: lead.id,
            activity_type: 'email_sent',
            subject: personalizedSubject,
            description: `Email campaign sent: ${campaign.name}`,
            metadata: {
              campaign_id: campaignId,
            },
          });

        sentCount++;

      } catch (emailError) {
        console.error(`Error sending email to ${lead.email}:`, emailError);
        failedCount++;

        // Track failed send
        await supabase
          .from('email_campaign_recipients')
          .insert({
            campaign_id: campaignId,
            lead_id: lead.id,
            email: lead.email,
            status: 'failed',
          });
      }
    }

    // Update campaign with final stats
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: sentCount,
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalLeads: leads.length,
      message: `Campaign sent to ${sentCount} leads (${failedCount} failed)`,
    });

  } catch (error) {
    return handleError(error);
  }
}
