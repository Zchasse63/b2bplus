/**
 * Email Routing API
 * 
 * Routes emails to appropriate departments/users based on classification
 * and routing rules.
 * 
 * Phase 5: Operational AI - Week 22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { determineRoutingDepartment, shouldAutoRespond } from '@/lib/ai/email-classification';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/emails/route
 * 
 * Route an email based on classification and rules
 * 
 * Request body:
 * {
 *   email_id: string,
 *   classification: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email_id, classification } = body;

    if (!email_id) {
      return NextResponse.json(
        { error: 'email_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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

    // Fetch active routing rules (ordered by priority)
    const { data: rules, error: rulesError } = await supabase
      .from('email_routing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('Failed to fetch routing rules:', rulesError);
    }

    // Find matching rule
    let matchedRule = null;
    let routedTo = null;
    let assignedTo = null;
    let autoRespond = false;
    let autoResponseTemplate = null;

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (matchesRoutingRule(email, rule)) {
          matchedRule = rule;
          routedTo = rule.route_to_department;
          assignedTo = rule.assign_to_user;
          autoRespond = rule.auto_respond;
          autoResponseTemplate = rule.auto_response_template;
          break;
        }
      }
    }

    // If no rule matched, use default routing based on classification
    if (!routedTo) {
      routedTo = determineRoutingDepartment(classification);
    }

    // Update email with routing information
    const { error: updateError } = await supabase
      .from('processed_emails')
      .update({
        routed_to: routedTo,
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date().toISOString() : null,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', email_id);

    if (updateError) {
      throw new Error(`Failed to update email: ${updateError.message}`);
    }

    // Log routing action
    await supabase.from('email_actions_log').insert({
      email_id,
      action_type: 'routed',
      success: true,
      action_details: {
        routed_to: routedTo,
        assigned_to: assignedTo,
        matched_rule: matchedRule?.name,
      },
      performed_by_system: true,
    });

    // If assigned to user, log assignment
    if (assignedTo) {
      await supabase.from('email_actions_log').insert({
        email_id,
        action_type: 'assigned',
        success: true,
        action_details: {
          assigned_to: assignedTo,
        },
        performed_by_system: true,
      });
    }

    // Trigger auto-response if applicable
    if ((autoRespond || shouldAutoRespond(classification)) && !email.auto_response_sent) {
      await triggerAutoResponse(email_id, email, classification, autoResponseTemplate);
    }

    return NextResponse.json({
      success: true,
      email_id,
      routed_to: routedTo,
      assigned_to: assignedTo,
      auto_respond: autoRespond,
    });

  } catch (error: any) {
    console.error('Email routing error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if email matches a routing rule
 */
function matchesRoutingRule(email: any, rule: any): boolean {
  // Check classification types
  if (rule.classification_types && rule.classification_types.length > 0) {
    if (!rule.classification_types.includes(email.classification)) {
      return false;
    }
  }

  // Check minimum urgency level
  if (rule.min_urgency_level) {
    const urgencyLevels = ['low', 'medium', 'high', 'critical'];
    const emailUrgencyIndex = urgencyLevels.indexOf(email.urgency_level);
    const minUrgencyIndex = urgencyLevels.indexOf(rule.min_urgency_level);
    
    if (emailUrgencyIndex < minUrgencyIndex) {
      return false;
    }
  }

  // Check keywords in subject/body
  if (rule.keywords && rule.keywords.length > 0) {
    const searchText = `${email.subject} ${email.body_text}`.toLowerCase();
    const hasKeyword = rule.keywords.some((keyword: string) =>
      searchText.includes(keyword.toLowerCase())
    );
    
    if (!hasKeyword) {
      return false;
    }
  }

  // Check sender domain
  if (rule.from_domains && rule.from_domains.length > 0) {
    const senderDomain = email.from_address.split('@')[1]?.toLowerCase();
    if (!senderDomain || !rule.from_domains.some((domain: string) =>
      senderDomain === domain.toLowerCase()
    )) {
      return false;
    }
  }

  return true;
}

/**
 * Trigger auto-response for an email
 */
async function triggerAutoResponse(
  emailId: string,
  email: any,
  classification: any,
  template?: string
) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/emails/auto-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_id: emailId,
        template,
      }),
    });

    if (!response.ok) {
      console.error('[Email Routing] Auto-response failed:', await response.text());
    }
  } catch (error) {
    console.error('[Email Routing] Auto-response error:', error);
  }
}

/**
 * GET /api/admin/emails/route
 * 
 * Get routing statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const fromDate = searchParams.get('from_date') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = searchParams.get('to_date') || new Date().toISOString();

    // Get routing statistics
    const { data: emails } = await supabase
      .from('processed_emails')
      .select('routed_to, classification, urgency_level')
      .gte('received_at', fromDate)
      .lte('received_at', toDate);

    // Calculate statistics
    const stats = {
      total: emails?.length || 0,
      by_department: {} as Record<string, number>,
      by_classification: {} as Record<string, number>,
      by_urgency: {} as Record<string, number>,
    };

    emails?.forEach(email => {
      // By department
      if (email.routed_to) {
        stats.by_department[email.routed_to] = (stats.by_department[email.routed_to] || 0) + 1;
      }

      // By classification
      if (email.classification) {
        stats.by_classification[email.classification] = (stats.by_classification[email.classification] || 0) + 1;
      }

      // By urgency
      if (email.urgency_level) {
        stats.by_urgency[email.urgency_level] = (stats.by_urgency[email.urgency_level] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      statistics: stats,
    });

  } catch (error: any) {
    console.error('Routing statistics error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

