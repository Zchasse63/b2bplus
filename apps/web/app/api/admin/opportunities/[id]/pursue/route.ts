import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';

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
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
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
          console.error('Error creating task:', taskError);
          return NextResponse.json(
            { error: 'Failed to create task' },
            { status: 500 }
          );
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
          console.error('Error updating opportunity:', updateError);
          return NextResponse.json(
            { error: 'Failed to update opportunity' },
            { status: 500 }
          );
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
          console.error('Error updating opportunity:', pursueError);
          return NextResponse.json(
            { error: 'Failed to update opportunity' },
            { status: 500 }
          );
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
          console.error('Error dismissing opportunity:', dismissError);
          return NextResponse.json(
            { error: 'Failed to dismiss opportunity' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Opportunity dismissed',
        });

      case 'create_campaign':
        // TODO: Implement campaign creation
        // For now, just mark as contacted
        const { error: campaignError } = await supabase
          .from('customer_opportunities')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (campaignError) {
          console.error('Error updating opportunity:', campaignError);
          return NextResponse.json(
            { error: 'Failed to update opportunity' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Campaign creation feature coming soon',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in pursue opportunity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body = await request.json();
    const { outcome, outcome_revenue, outcome_notes } = body;

    if (!outcome || !['won', 'lost', 'dismissed'].includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome. Must be won, lost, or dismissed' },
        { status: 400 }
      );
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
      console.error('Error updating opportunity outcome:', updateError);
      return NextResponse.json(
        { error: 'Failed to update opportunity outcome' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Opportunity marked as ${outcome}`,
    });
  } catch (error) {
    console.error('Error updating opportunity outcome:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

