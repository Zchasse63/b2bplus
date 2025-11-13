/**
 * Public Chatbot Lead Capture
 * 
 * POST /api/chatbot/lead-capture
 * Capture lead information from public chatbot conversations
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface LeadCaptureRequest {
  conversationId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadCaptureRequest = await request.json();
    const { conversationId, name, email, company, phone, message } = body;

    // Validate required fields
    if (!conversationId || !name || !email) {
      return NextResponse.json(
        { error: 'Conversation ID, name, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single();

    let leadId: string;

    if (existingLead) {
      // Update existing lead
      const { data: updated, error: updateError } = await supabase
        .from('leads')
        .update({
          full_name: name,
          company_name: company,
          phone,
          status: 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select('id')
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          { error: 'Failed to update lead' },
          { status: 500 }
        );
      }

      leadId = updated.id;
    } else {
      // Create new lead
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          full_name: name,
          email,
          company_name: company,
          phone,
          source: 'public_chatbot',
          status: 'new',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newLead) {
        return NextResponse.json(
          { error: 'Failed to create lead' },
          { status: 500 }
        );
      }

      leadId = newLead.id;
    }

    // Update conversation with lead info
    const { data: conversation } = await supabase
      .from('public_chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      await supabase
        .from('public_chatbot_conversations')
        .update({
          lead_id: leadId,
          lead_name: name,
          lead_email: email,
          lead_company: company,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    // Log lead capture event
    await supabase
      .from('lead_events')
      .insert({
        lead_id: leadId,
        event_type: 'chatbot_lead_capture',
        event_data: {
          conversationId,
          source: 'public_chatbot',
          message,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      leadId,
      message: 'Lead captured successfully',
      lead: {
        id: leadId,
        name,
        email,
        company,
      },
    });

  } catch (error: any) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chatbot/lead-capture?email=user@example.com
 * Check if lead already exists
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !lead) {
      return NextResponse.json({
        exists: false,
        message: 'Lead not found',
      });
    }

    return NextResponse.json({
      exists: true,
      lead: {
        id: lead.id,
        name: lead.full_name,
        email: lead.email,
        company: lead.company_name,
        status: lead.status,
      },
    });

  } catch (error: any) {
    console.error('Lead lookup error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

