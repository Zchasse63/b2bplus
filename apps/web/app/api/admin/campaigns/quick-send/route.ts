/**
 * Quick Send API
 * 
 * Voice-triggered email automation for individual leads
 * Example: "Email Chris at ABC Supply about new pricing"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, createEmailTemplate, addUtmParameters, EMAIL_CONFIG } from '@/lib/sendgrid';
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
    const { message, leadId, context, subject: customSubject } = body;

    // Find lead by ID or parse message
    let lead;
    
    if (leadId) {
      // Direct lead ID provided
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          region:regions(*),
          buying_group:buying_groups(*)
        `)
        .eq('id', leadId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      
      lead = data;
    } else if (message) {
      // Parse message to find lead
      // Example: "Email Chris at ABC Supply about pricing"
      const parsed = parseEmailCommand(message);
      
      if (!parsed.companyName && !parsed.contactName) {
        return NextResponse.json({ 
          error: 'Could not parse lead information from message. Please provide company or contact name.' 
        }, { status: 400 });
      }
      
      // Search for lead
      let query = supabase
        .from('leads')
        .select(`
          *,
          region:regions(*),
          buying_group:buying_groups(*)
        `);
      
      if (parsed.companyName) {
        query = query.ilike('company_name', `%${parsed.companyName}%`);
      }
      
      if (parsed.contactName) {
        query = query.ilike('contact_name', `%${parsed.contactName}%`);
      }
      
      const { data, error } = await query.limit(1).single();
      
      if (error || !data) {
        return NextResponse.json({ 
          error: `Lead not found. Searched for: ${parsed.companyName || parsed.contactName}` 
        }, { status: 404 });
      }
      
      lead = data;
    } else {
      return NextResponse.json({ 
        error: 'Please provide either leadId or message' 
      }, { status: 400 });
    }

    // Validate lead has email
    if (!lead.email) {
      return NextResponse.json({ 
        error: `Lead ${lead.company_name} does not have an email address` 
      }, { status: 400 });
    }

    // Generate personalized email with AI first
    const emailContext = context || parseEmailCommand(message || '')?.context || 'general update';
    const personalizedEmail = await generatePersonalizedEmail(lead, emailContext);

    // Create campaign with subject and content
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name: `Quick Send - ${lead.company_name}`,
        subject: customSubject || personalizedEmail.subject,
        html_content: personalizedEmail.body,
        campaign_type: 'individual',
        status: 'sending',
        total_recipients: 1,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Create magic link for easy access
    const magicLinkToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error: tokenError } = await supabase
      .from('magic_link_tokens')
      .insert({
        lead_id: lead.id,
        token: magicLinkToken,
        email: lead.email,
        purpose: 'email_campaign_access',
        redirect_url: '/products',
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Magic link token error:', tokenError);
    }

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
      categories: ['quick-send', 'individual', lead.region?.name || 'unknown'],
    });

    // Track in database
    const { error: recipientError } = await supabase
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

    if (recipientError) {
      console.error('Recipient tracking error:', recipientError);
    }

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
          context: emailContext,
        },
      });

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: 1,
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
      },
      lead: {
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        region: lead.region?.name,
        buying_group: lead.buying_group?.name,
      },
      email: {
        subject: personalizedEmail.subject,
        preview: personalizedEmail.body.substring(0, 200) + '...',
        sent_at: new Date().toISOString(),
        tracking_enabled: true,
        message_id: sendResult.messageId,
      },
    });

  } catch (error: any) {
    console.error('Quick send error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Parse email command to extract lead info and context
 */
function parseEmailCommand(message: string): {
  contactName?: string;
  companyName?: string;
  context?: string;
} {
  const result: any = {};
  
  // Extract "at [Company]"
  const companyMatch = message.match(/at\s+([A-Z][A-Za-z\s&]+?)(?:\s+about|\s*$)/i);
  if (companyMatch) {
    result.companyName = companyMatch[1].trim();
  }
  
  // Extract contact name (first word after "email")
  const contactMatch = message.match(/email\s+([A-Z][a-z]+)/i);
  if (contactMatch) {
    result.contactName = contactMatch[1].trim();
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

  const result = await generateJSON<any>(prompt);
  
  return {
    subject: result.subject,
    body: result.body,
  };
}
