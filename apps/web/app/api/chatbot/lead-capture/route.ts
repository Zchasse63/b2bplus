/**
 * Public Chatbot Lead Capture
 *
 * POST /api/chatbot/lead-capture
 * Capture lead information from public chatbot conversations
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { handleError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

const LeadCaptureSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  name: z.string().min(1).max(255),
  email: z.string().email('Invalid email format'),
  company: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for public endpoint
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'public');
    if (!allowed) return rateLimitResponse!;

    // Validate request body
    const validation = await validateRequestBody(request, LeadCaptureSchema);
    if (!validation.valid) return validation.response!;

    const { conversationId, name, email, company, phone, message } = validation.data!;

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
        throw DatabaseError.queryFailed('leads', 'update');
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
        throw DatabaseError.queryFailed('leads', 'insert');
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

  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/chatbot/lead-capture?email=user@example.com
 * Check if lead already exists
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for public endpoint
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'public');
    if (!allowed) return rateLimitResponse!;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email || !z.string().email().safeParse(email).success) {
      throw new ValidationError('Valid email is required');
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

  } catch (error) {
    return handleError(error);
  }
}

