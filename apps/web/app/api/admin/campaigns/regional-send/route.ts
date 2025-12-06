/**
 * Regional Campaign API
 * 
 * Voice-triggered bulk email campaigns by region
 * Example: "Email all Georgia customers about new pricing"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, createEmailTemplate, addUtmParameters } from '@/lib/sendgrid';
import { generateJSON } from '@/lib/ai/providers/unified';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      message, 
      region, 
      regionTier,
      buyingGroup,
      context, 
      subject: customSubject,
      filters = {}
    } = body;

    // Parse message if provided
    let parsedRegion = region;
    let parsedContext = context;
    let parsedBuyingGroup = buyingGroup;

    if (message) {
      const parsed = parseRegionalCommand(message);
      parsedRegion = parsedRegion || parsed.region;
      parsedContext = parsedContext || parsed.context;
      parsedBuyingGroup = parsedBuyingGroup || parsed.buyingGroup;
    }

    if (!parsedRegion && !regionTier && !parsedBuyingGroup) {
      return NextResponse.json({ 
        error: 'Please specify region, regionTier, or buyingGroup' 
      }, { status: 400 });
    }

    // Find leads based on filters
    let query = supabase
      .from('leads')
      .select(`
        *,
        region:regions(*),
        buying_group:buying_groups(*)
      `)
      .not('email', 'is', null)
      .in('status', ['new', 'contacted', 'qualified', 'proposal']);

    // Apply region filter
    if (parsedRegion) {
      const { data: regionData } = await supabase
        .from('regions')
        .select('id')
        .ilike('name', `%${parsedRegion}%`)
        .single();
      
      if (regionData) {
        query = query.eq('region_id', regionData.id);
      }
    } else if (regionTier) {
      const { data: regionData } = await supabase
        .from('regions')
        .select('id')
        .eq('tier', regionTier)
        .single();
      
      if (regionData) {
        query = query.eq('region_id', regionData.id);
      }
    }

    // Apply buying group filter
    if (parsedBuyingGroup) {
      const { data: groupData } = await supabase
        .from('buying_groups')
        .select('id')
        .ilike('name', `%${parsedBuyingGroup}%`)
        .single();
      
      if (groupData) {
        query = query.eq('buying_group_id', groupData.id);
      }
    }

    // Apply additional filters
    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }
    if (filters.leadScoreMin) {
      query = query.gte('lead_score', filters.leadScoreMin);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Leads query error:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ 
        error: 'No leads found matching criteria',
        filters: { region: parsedRegion, regionTier, buyingGroup: parsedBuyingGroup }
      }, { status: 404 });
    }

    // Create campaign
    const campaignName = `${parsedContext || 'Campaign'} - ${parsedRegion || `Tier ${regionTier}` || parsedBuyingGroup}`;
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name: campaignName,
        campaign_type: 'regional',
        status: 'sending',
        total_recipients: leads.length,
      })
      .select()
      .single();
    
    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Send emails to all leads
    const results = [];
    const errors = [];

    for (const lead of leads) {
      try {
        // Generate personalized email
        const personalizedEmail = await generatePersonalizedEmail(
          lead, 
          parsedContext || 'general update'
        );

        // Create magic link
        const magicLinkToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabase
          .from('magic_link_tokens')
          .insert({
            lead_id: lead.id,
            token: magicLinkToken,
            email: lead.email,
            purpose: 'email_campaign_access',
            redirect_url: '/products',
            expires_at: expiresAt.toISOString(),
          });

        const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/magic-link/verify?token=${magicLinkToken}`;

        // Add magic link to email body
        let emailBody = personalizedEmail.body.replace(
          /\[View .*?\]/g,
          `<a href="${magicLink}" class="button">View Your Personalized Pricing</a>`
        );

        // Add UTM parameters
        emailBody = addUtmParameters(emailBody, {
          source: 'email',
          medium: 'campaign',
          campaign: campaign.id,
          content: lead.id,
        });

        // Wrap in template
        const finalHtml = createEmailTemplate({
          body: emailBody,
          preheader: personalizedEmail.subject,
        });

        // Send via SendGrid
        const sendResult = await sendEmail({
          to: lead.email,
          subject: customSubject || personalizedEmail.subject,
          html: finalHtml,
          customArgs: {
            campaign_id: campaign.id,
            lead_id: lead.id,
            region: lead.region?.name || '',
            buying_group: lead.buying_group?.name || '',
            industry: lead.industry || '',
          },
          categories: [
            'regional-campaign',
            lead.region?.name || 'unknown',
            parsedBuyingGroup || 'no-group',
          ],
        });

        // Track in database
        await supabase
          .from('email_campaign_recipients')
          .insert({
            campaign_id: campaign.id,
            lead_id: lead.id,
            email: lead.email,
            status: 'sent',
            sent_at: new Date().toISOString(),
            sendgrid_message_id: sendResult.messageId,
            personalization_data: {
              company: lead.company_name,
              contact: lead.contact_name,
              region: lead.region?.name,
              buying_group: lead.buying_group?.name,
              industry: lead.industry,
            },
          });

        // Log activity
        await supabase
          .from('lead_activities')
          .insert({
            lead_id: lead.id,
            activity_type: 'email_sent',
            subject: personalizedEmail.subject,
            description: `Email campaign sent: ${campaign.name}`,
            metadata: {
              campaign_id: campaign.id,
              sendgrid_message_id: sendResult.messageId,
            },
          });

        results.push({
          lead_id: lead.id,
          company: lead.company_name,
          email: lead.email,
          message_id: sendResult.messageId,
        });

      } catch (error: any) {
        console.error(`Failed to send to ${lead.email}:`, error);
        errors.push({
          lead_id: lead.id,
          company: lead.company_name,
          email: lead.email,
          error: error.message,
        });
      }
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: errors.length === 0 ? 'sent' : 'partial',
        sent_at: new Date().toISOString(),
        total_sent: results.length,
      })
      .eq('id', campaign.id);

    // Calculate breakdown
    const breakdown = {
      by_buying_group: {} as Record<string, number>,
      by_industry: {} as Record<string, number>,
      by_region: {} as Record<string, number>,
    };

    leads.forEach(lead => {
      const group = lead.buying_group?.name || 'None';
      const industry = lead.industry || 'Unknown';
      const region = lead.region?.name || 'Unknown';

      breakdown.by_buying_group[group] = (breakdown.by_buying_group[group] || 0) + 1;
      breakdown.by_industry[industry] = (breakdown.by_industry[industry] || 0) + 1;
      breakdown.by_region[region] = (breakdown.by_region[region] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: 'regional',
        total_recipients: leads.length,
        sent_count: results.length,
        failed_count: errors.length,
      },
      breakdown,
      filters: {
        region: parsedRegion,
        regionTier,
        buyingGroup: parsedBuyingGroup,
      },
      results: results.slice(0, 10), // First 10 for preview
      errors,
      tracking: {
        opens_tracked: true,
        clicks_tracked: true,
        real_time_webhooks: true,
      },
    });

  } catch (error: any) {
    console.error('Regional campaign error:', error);
    return NextResponse.json({ 
      error: 'Failed to send campaign', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Parse regional command to extract region and context
 */
function parseRegionalCommand(message: string): {
  region?: string;
  buyingGroup?: string;
  context?: string;
} {
  const result: any = {};
  
  // Extract region
  if (message.match(/georgia/i)) {
    result.region = 'Georgia';
  } else if (message.match(/border\s+state/i)) {
    result.region = 'Border States';
  } else if (message.match(/outer\s+state/i)) {
    result.region = 'Outer States';
  }
  
  // Extract buying group
  if (message.match(/sysco/i)) {
    result.buyingGroup = 'Sysco';
  } else if (message.match(/us\s+foods/i)) {
    result.buyingGroup = 'US Foods';
  } else if (message.match(/pfg|performance\s+food/i)) {
    result.buyingGroup = 'PFG';
  }
  
  // Extract context (after "about")
  const contextMatch = message.match(/about\s+(.+?)$/i);
  if (contextMatch) {
    result.context = contextMatch[1].trim();
  }
  
  return result;
}

/**
 * Generate personalized email using AI
 */
async function generatePersonalizedEmail(
  lead: any,
  context: string
): Promise<{ subject: string; body: string }> {
  const prompt = `
You are a B2B sales professional for Metro Bag, a food service disposables company.

Lead Information:
- Company: ${lead.company_name}
- Contact: ${lead.contact_name}
- Industry: ${lead.industry || 'Food Service'}
- Company Size: ${lead.company_size || 'Unknown'}
- Region: ${lead.region?.name || 'Unknown'} (Tier ${lead.region?.tier || 'Unknown'})
- Buying Group: ${lead.buying_group?.name || 'None'}
- Lead Score: ${lead.lead_score || 50}/100

Regional Pricing:
- Price Multiplier: ${lead.region?.price_multiplier || 1.0}
- ${lead.region?.tier === 1 ? 'Local Georgia pricing (best rates)' : 
   lead.region?.tier === 2 ? 'Border state pricing (5% markup)' :
   lead.region?.tier === 3 ? 'Outer state pricing (10% markup)' :
   'Standard pricing'}

Buying Group Benefits:
${lead.buying_group ? `
- Monthly Rebate: ${lead.buying_group.monthly_rebate_percentage}%
- Annual Growth Rebate: ${lead.buying_group.annual_rebate_percentage}%
- Member of ${lead.buying_group.name}
` : '- Not currently in a buying group (mention potential savings from joining)'}

Email Topic: ${context}

Generate a professional, personalized email that:
1. Addresses ${lead.contact_name} by name
2. References their company (${lead.company_name}) and industry
3. Highlights their regional pricing benefits
4. ${lead.buying_group ? 'Emphasizes their buying group rebates and savings' : 'Suggests the benefits of joining a buying group'}
5. Discusses: ${context}
6. Includes specific estimated savings with realistic numbers
7. Has a clear call-to-action
8. Is concise (150-250 words)
9. Professional but friendly tone
10. Includes a placeholder [View Your Personalized Pricing] for the magic link button

Return JSON with:
{
  "subject": "Compelling subject line (max 60 chars, personalized with company name)",
  "body": "Email body in HTML format with <p>, <h2>, <ul>, <li> tags. Use professional formatting."
}
`;

  const result = await generateJSON(prompt);
  
  return {
    subject: result.subject,
    body: result.body,
  };
}
