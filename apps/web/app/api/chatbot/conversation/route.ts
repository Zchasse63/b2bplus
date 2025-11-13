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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Fetch conversation
    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
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

  } catch (error: any) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        messages: [],
        createdAt: conversation.created_at,
      },
    });

  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Conversation ID and message are required' },
        { status: 400 }
      );
    }

    // Get current conversation
    const { data: conversation, error: getError } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (getError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: updated.id,
        messages: updated.messages,
        updatedAt: updated.updated_at,
      },
    });

  } catch (error: any) {
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

