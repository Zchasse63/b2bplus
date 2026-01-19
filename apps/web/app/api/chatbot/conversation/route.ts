/**
 * Chatbot Conversation Management
 *
 * GET /api/chatbot/conversation?conversationId=xxx
 * Retrieve conversation history
 *
 * POST /api/chatbot/conversation
 * Create new conversation
 *
 * PATCH /api/chatbot/conversation
 * Update conversation (add message, update status)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { handleError, AuthError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler';

const ConversationUpdateSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  message: z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(5000),
  }),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      throw new ValidationError('Conversation ID is required');
    }

    // Fetch conversation
    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        messages: conversation.messages || [],
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
    });

  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: user.id,
        messages: [],
      })
      .select('*')
      .single();

    if (error || !conversation) {
      throw DatabaseError.queryFailed('chatbot_conversations', 'insert');
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        messages: [],
        createdAt: conversation.created_at,
      },
    });

  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    // Validate request body
    const validation = await validateRequestBody(request, ConversationUpdateSchema);
    if (!validation.valid) return validation.response!;

    const { conversationId, message } = validation.data!;

    // Get current conversation
    const { data: conversation, error: getError } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (getError || !conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }

    // Add message to conversation
    const messages = conversation.messages || [];
    messages.push({
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
    });

    // Update conversation
    const { data: updated, error: updateError } = await supabase
      .from('chatbot_conversations')
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw DatabaseError.queryFailed('chatbot_conversations', 'update');
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: updated.id,
        messages: updated.messages,
        updatedAt: updated.updated_at,
      },
    });

  } catch (error) {
    return handleError(error);
  }
}

