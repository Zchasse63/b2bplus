import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler';

interface PursueOpportunityRequest {
  action: 'contact' | 'mark_pursued' | 'dismiss' | 'create_campaign';
  notes?: string;
}

/**
 * POST /api/admin/opportunities/[id]/pursue
 * Handle opportunity actions (contact, pursue, dismiss, campaign)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body: PursueOpportunityRequest = await request.json();
    const { action, notes } = body;

    // Get the opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from('customer_opportunities')
      .select('*')
      .eq('id', params.id)
      .single();

    if (oppError || !opportunity) {
      throw new NotFoundError('Opportunity', params.id);
    }

    // Handle different actions
    switch (action) {
      case 'contact':
        // Create a task for following up
        const { error: taskError } = await supabase.from('tasks').insert({
          title: `Follow up on ${opportunity.opportunity_type} opportunity`,
          description: notes || `Contact ${opportunity.customer_id} about opportunity`,
          opportunity_id: params.id,
          assigned_to: user!.id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'pending',
        });

        if (taskError) {
          throw DatabaseError.queryFailed('tasks', 'insert');
        }

        // Update opportunity status to contacted
        const { error: updateError } = await supabase
          .from('customer_opportunities')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (updateError) {
          throw DatabaseError.queryFailed('customer_opportunities', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Task created and opportunity marked as contacted',
        });

      case 'mark_pursued':
        // Update opportunity status to contacted
        const { error: pursueError } = await supabase
          .from('customer_opportunities')
          .update({
            status: 'contacted',
            pursued_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (pursueError) {
          throw DatabaseError.queryFailed('customer_opportunities', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Opportunity marked as pursued',
        });

      case 'dismiss':
        // Update opportunity status to ignored
        const { error: dismissError } = await supabase
          .from('customer_opportunities')
          .update({
            status: 'ignored',
            outcome: 'dismissed',
            outcome_notes: notes,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (dismissError) {
          throw DatabaseError.queryFailed('customer_opportunities', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Opportunity dismissed',
        });

      case 'create_campaign':
        // Create email campaign for this opportunity
        // Get opportunity details
        const { data: opportunityDetails } = await supabase
          .from('customer_opportunities')
          .select('*, product:products(name, description)')
          .eq('id', params.id)
          .single();

        if (!opportunityDetails) {
          throw new NotFoundError('Opportunity', params.id);
        }

        // Create campaign
        const { data: campaign, error: campaignError } = await supabase
          .from('email_campaigns')
          .insert({
            organization_id: opportunityDetails.organization_id,
            name: `Campaign: ${opportunityDetails.product?.name || 'Product'}`,
            subject: `Special Offer: ${opportunityDetails.product?.name || 'Product'}`,
            body: `We noticed you might be interested in ${opportunityDetails.product?.name}. Here's a special offer just for you!`,
            status: 'draft',
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (campaignError || !campaign) {
          throw DatabaseError.queryFailed('email_campaigns', 'insert');
        }

        // Update opportunity status
        const { error: campaignUpdateError } = await supabase
          .from('customer_opportunities')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (campaignUpdateError) {
          throw DatabaseError.queryFailed('customer_opportunities', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Campaign created successfully',
          campaignId: campaign.id,
        });

      default:
        throw new ValidationError('Invalid action', { action: ['Must be contact, mark_pursued, dismiss, or create_campaign'] });
    }
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/opportunities/[id]/pursue
 * Update opportunity outcome (won/lost)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { outcome, outcome_revenue, outcome_notes } = body;

    if (!outcome || !['won', 'lost', 'dismissed'].includes(outcome)) {
      throw new ValidationError('Invalid outcome', { outcome: ['Must be won, lost, or dismissed'] });
    }

    // Update opportunity with outcome
    const { error: updateError } = await supabase
      .from('customer_opportunities')
      .update({
        outcome,
        outcome_revenue: outcome_revenue || null,
        outcome_notes: outcome_notes || null,
        status: outcome === 'won' ? 'won' : outcome === 'lost' ? 'lost' : 'ignored',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      throw DatabaseError.queryFailed('customer_opportunities', 'update');
    }

    return NextResponse.json({
      success: true,
      message: `Opportunity marked as ${outcome}`,
    });
  } catch (error) {
    return handleError(error);
  }
}
