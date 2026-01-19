import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { csrfProtection } from '@/lib/middleware/csrf';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { CampaignCreateSchema, CampaignUpdateSchema } from '@/lib/validation/schemas';
import { handleError, ValidationError } from '@/lib/middleware/error-handler';

// GET all campaigns
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(name),
        created_by_user:profiles!email_campaigns_created_by_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Get recipient counts for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const { data: stats } = await supabase
          .rpc('get_campaign_stats', { p_campaign_id: campaign.id });

        return {
          ...campaign,
          stats: stats || {
            total_recipients: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0,
            open_rate: 0,
            click_rate: 0
          }
        };
      })
    );

    return NextResponse.json({ success: true, campaigns: campaignsWithStats });

  } catch (error) {
    return handleError(error);
  }
}

// POST create campaign
export async function POST(request: NextRequest) {
  // CSRF Protection
  const { valid, response: csrfResponse } = await csrfProtection(request);
  if (!valid) {
    return csrfResponse!;
  }

  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    // Validate request body
    const validation = await validateRequestBody(request, CampaignCreateSchema);
    if (!validation.valid) return validation.response!;

    const supabase = await createClient();

    const {
      name,
      subject,
      templateId,
      htmlContent,
      textContent,
      targetAudience,
      scheduledAt
    } = validation.data!;

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name,
        subject,
        template_id: templateId || null,
        html_content: htmlContent,
        text_content: textContent,
        target_audience: targetAudience || {},
        scheduled_at: scheduledAt || null,
        status: scheduledAt ? 'scheduled' : 'draft',
        created_by: user!.id
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Get target customers based on audience criteria
    let customersQuery = supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'customer');

    // Apply audience filters if provided
    if (targetAudience?.tier) {
      // First get the customer IDs for the tier
      const { data: tierCustomers } = await supabase
        .from('customer_pricing_tiers')
        .select('customer_id')
        .eq('tier_id', targetAudience.tier);

      if (tierCustomers && tierCustomers.length > 0) {
        const customerIds = tierCustomers.map(tc => tc.customer_id);
        customersQuery = customersQuery.in('id', customerIds);
      }
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (!customersError && customers && customers.length > 0) {
      // Create recipient records
      const recipients = customers.map(customer => ({
        campaign_id: campaign.id,
        customer_id: customer.id,
        email: customer.email,
        status: 'pending'
      }));

      await supabase
        .from('email_campaign_recipients')
        .insert(recipients);
    }

    return NextResponse.json({ success: true, campaign });

  } catch (error) {
    return handleError(error);
  }
}

// PATCH update campaign
export async function PATCH(request: NextRequest) {
  // CSRF Protection
  const { valid, response: csrfResponse } = await csrfProtection(request);
  if (!valid) {
    return csrfResponse!;
  }

  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    // Validate request body
    const validation = await validateRequestBody(request, CampaignUpdateSchema);
    if (!validation.valid) return validation.response!;

    const supabase = await createClient();

    const { id, ...updates } = validation.data!;

    // Check if campaign can be updated
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (campaign?.status === 'sent') {
      throw new ValidationError('Cannot update sent campaign', { status: ['Campaign has already been sent'] });
    }

    const { data: updatedCampaign, error } = await supabase
      .from('email_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: updatedCampaign });

  } catch (error) {
    return handleError(error);
  }
}

// DELETE campaign
export async function DELETE(request: NextRequest) {
  // CSRF Protection
  const { valid, response: csrfResponse } = await csrfProtection(request);
  if (!valid) {
    return csrfResponse!;
  }

  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Campaign ID is required', { id: ['Campaign ID is required'] });
    }

    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleError(error);
  }
}
