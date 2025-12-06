/**
 * Phase 2: AI Backend Logic - Authenticated Chatbot API
 *
 * POST /api/chatbot/message
 * Handles authenticated chatbot conversations with action execution
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/providers/unified';
import { getCustomerContext } from '@/lib/ai/customer-context';
import { getChatbotPrompt, getActionDetectionPrompt } from '@/lib/ai/chatbot-prompts';
import { executeChatbotAction } from '@/lib/ai/chatbot-actions';
import { validateAIRequest } from '@/lib/middleware/ai-security';
import { logAIUsage } from '@/lib/ai/usage-tracking';
import { createLogger } from '@/lib/logging/logger';
import { sanitizeAIInput } from '@/lib/ai/input-sanitizer';

const logger = createLogger('chatbot-message');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatbotRequest {
  message: string;
  conversationId?: string;
}

interface ActionDetection {
  requiresAction: boolean;
  action: string | null;
  parameters: Record<string, any> | null;
  confidence: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate AI request (authentication, rate limiting, organization approval)
    const validation = await validateAIRequest(request, {
      maxRequests: 50,
      windowMs: 60000, // 50 requests per minute
    });

    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const { userId, organizationId } = validation;
    const supabase = await createClient();

    // Parse request body
    const body: ChatbotRequest = await request.json();
    const { message, conversationId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Sanitize user input to prevent prompt injection attacks
    const sanitizationResult = sanitizeAIInput(message, {
      maxLength: 5000,
      stripHtml: true,
      checkSuspicious: true,
    });

    if (!sanitizationResult.isClean) {
      logger.warn('Suspicious input detected in chatbot message', {
        userId,
        threats: sanitizationResult.threats,
        warnings: sanitizationResult.warnings,
      });

      return NextResponse.json(
        {
          error: 'Invalid input detected',
          message: 'Your message contains potentially harmful content. Please rephrase and try again.',
          warnings: sanitizationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Use sanitized message for processing
    const sanitizedMessage = sanitizationResult.sanitized;

    // Get customer context for personalized responses
    const context = await getCustomerContext(userId!);

    // Get or create conversation
    let conversation: any;
    let messages: ChatMessage[] = [];

    if (conversationId) {
      // Load existing conversation
      const { data: existingConv, error: convError } = await supabase
        .from('chatbot_conversations')
        .select('id, messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (convError || !existingConv) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      conversation = existingConv;
      messages = existingConv.messages || [];
    } else {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          messages: [],
        })
        .select('id, messages')
        .single();

      if (createError || !newConv) {
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        );
      }

      conversation = newConv;
    }

    // Add user message to conversation (using sanitized input)
    const userMessage: ChatMessage = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date().toISOString(),
    };
    messages.push(userMessage);

    // Detect if action is required
    let actionResult: any = null;
    let actionDetection: ActionDetection | null = null;

    try {
      actionDetection = await generateJSON<ActionDetection>(
        getActionDetectionPrompt(sanitizedMessage),
        {
          temperature: 0.3,
          maxTokens: 500,
        }
      );

      // Execute action if required and confidence is high enough
      if (actionDetection.requiresAction &&
          actionDetection.action &&
          actionDetection.confidence > 0.7) {
        actionResult = await executeChatbotAction(
          actionDetection.action,
          userId!,
          organizationId!,
          actionDetection.parameters || {}
        );
      }
    } catch (error) {
      console.error('Action detection/execution error:', error);
      // Continue without action if detection fails
    }

    // Build conversation history for AI
    const conversationHistory = messages
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate AI response
    const systemPrompt = getChatbotPrompt(true, context);

    let aiPrompt = `${conversationHistory}\n\nuser: ${message}`;

    // Include action result in prompt if available
    if (actionResult) {
      aiPrompt += `\n\n[ACTION RESULT: ${actionResult.success ? 'SUCCESS' : 'FAILED'}]`;
      if (actionResult.data) {
        aiPrompt += `\nData: ${JSON.stringify(actionResult.data)}`;
      }
      if (actionResult.message) {
        aiPrompt += `\nMessage: ${actionResult.message}`;
      }
      if (actionResult.error) {
        aiPrompt += `\nError: ${actionResult.error}`;
      }
    }

    aiPrompt += '\n\nassistant:';

    const aiResponse = await generateJSON<{ response: string }>(
      `${aiPrompt}\n\nRespond with a JSON object: { "response": "your helpful response here" }`,
      {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      }
    );

    // Add assistant message to conversation
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date().toISOString(),
    };
    messages.push(assistantMessage);

    // Update conversation in database
    const { error: updateError } = await supabase
      .from('chatbot_conversations')
      .update({ messages })
      .eq('id', conversation.id);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
    }

    // Log AI usage
    await logAIUsage({
      userId: userId!,
      organizationId: organizationId!,
      endpoint: '/api/chatbot/message',
      operationType: 'chatbot-message',
      tokensUsed: Math.ceil((message.length + aiResponse.response.length) / 4),
      success: true,
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: aiResponse.response,
      actionExecuted: actionResult?.success || false,
      actionData: actionResult?.data,
    });

  } catch (error) {
    logger.error('Chatbot API error', { error });

    // Log failed usage
    try {
      const validation = await validateAIRequest(request);
      if (validation.authorized) {
        await logAIUsage({
          userId: validation.userId!,
          organizationId: validation.organizationId!,
          endpoint: '/api/chatbot/message',
          operationType: 'chatbot-message',
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      logger.error('Failed to log error', { logError });
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chatbot/message?conversationId=xxx
 * Retrieve conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      // Return all conversations for user
      const { data: conversations, error } = await supabase
        .from('chatbot_conversations')
        .select('id, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch conversations' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        conversations: conversations || [],
      });
    }

    // Return specific conversation
    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .select('id, messages, created_at, updated_at')
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
      conversation,
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
