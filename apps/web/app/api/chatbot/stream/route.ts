/**
 * Streaming Chatbot API Endpoint
 *
 * Uses Vercel AI SDK for streaming responses with tool calling.
 * Replaces the legacy non-streaming chatbot endpoint.
 */

import { streamText, CoreMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { grokModels, defaultModel } from '@/lib/ai/providers/xai';
import { getToolsForRole } from '@/lib/ai/tools';
import { getCustomerContext } from '@/lib/ai/customer-context';
import { getChatbotPrompt } from '@/lib/ai/chatbot-prompts';
import { validateAIRequest } from '@/lib/middleware/ai-security';
import { logAIUsage } from '@/lib/ai/usage-tracking';
import { createLogger } from '@/lib/logging/logger';
import { sanitizeAIInput } from '@/lib/ai/input-sanitizer';

const logger = createLogger('chatbot-stream');

// Maximum duration for streaming (5 minutes)
export const maxDuration = 300;

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Validate AI request (authentication, rate limiting, organization approval)
    const validation = await validateAIRequest(request as any, {
      maxRequests: 100,
      windowMs: 60000, // 100 requests per minute for streaming
    });

    if (!validation.authorized) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { userId, organizationId } = validation;
    const supabase = await createClient();

    // Get user profile for role-based access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role as 'customer' | 'admin' | null;

    // Parse request body
    const {
      messages,
      conversationId,
      context: pageContext,
      useReasoning = false,
    } = await request.json() as {
      messages: CoreMessage[];
      conversationId?: string;
      context?: { currentPath?: string; pageData?: Record<string, any> };
      useReasoning?: boolean;
    };

    // Get the latest user message for sanitization
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    if (latestUserMessage?.content && typeof latestUserMessage.content === 'string') {
      const sanitizationResult = sanitizeAIInput(latestUserMessage.content, {
        maxLength: 5000,
        stripHtml: true,
        checkSuspicious: true,
      });

      if (!sanitizationResult.isClean) {
        logger.warn('Suspicious input detected in chatbot stream', {
          userId,
          threats: sanitizationResult.threats,
          warnings: sanitizationResult.warnings,
        });

        return new Response(
          JSON.stringify({
            error: 'Invalid input detected',
            message: 'Your message contains potentially harmful content.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get customer context for personalized responses
    const customerContext = await getCustomerContext(userId!);

    // Build system prompt
    let systemPrompt = getChatbotPrompt(true, customerContext);

    if (pageContext?.currentPath) {
      systemPrompt += `\n\nCurrent context:
- User is on page: ${pageContext.currentPath}
- User role: ${role || 'customer'}
- User ID: ${userId}`;

      if (pageContext.pageData) {
        systemPrompt += `\n- Page data: ${JSON.stringify(pageContext.pageData)}`;
      }
    }

    // Select model based on task complexity
    const model = useReasoning ? grokModels.reasoning : defaultModel;

    // Get tools available for user role
    const tools = getToolsForRole(role);

    // Track conversation in database
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const { data: newConv } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          messages: messages,
        })
        .select('id')
        .single();

      activeConversationId = newConv?.id;
    }

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 10, // Allow multiple tool calls per turn
      temperature: useReasoning ? 0.3 : 0.7,
      onFinish: async ({ text, toolCalls, usage }) => {
        // Update conversation with new messages
        if (activeConversationId) {
          try {
            const updatedMessages = [
              ...messages,
              { role: 'assistant', content: text },
            ];

            await supabase
              .from('chatbot_conversations')
              .update({ messages: updatedMessages })
              .eq('id', activeConversationId);
          } catch (err) {
            logger.error('Failed to update conversation', { err });
          }
        }

        // Log AI usage
        try {
          await logAIUsage({
            userId: userId!,
            organizationId: organizationId!,
            endpoint: '/api/chatbot/stream',
            operationType: 'chatbot-stream',
            tokensUsed: usage?.totalTokens || 0,
            success: true,
            metadata: {
              toolCalls: toolCalls?.length || 0,
              model: useReasoning ? 'grok-4.1-fast-reasoning' : 'grok-4.1-fast',
              responseTime: Date.now() - startTime,
            },
          });
        } catch (err) {
          logger.error('Failed to log AI usage', { err });
        }
      },
    });

    // Return streaming response with conversation ID in headers
    const response = result.toDataStreamResponse();

    // Add conversation ID to response headers
    if (activeConversationId) {
      response.headers.set('X-Conversation-Id', activeConversationId);
    }

    return response;
  } catch (error) {
    logger.error('Chatbot stream error', { error });

    return new Response(
      JSON.stringify({ error: 'Failed to process message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Health check
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      model: 'grok-4.1-fast',
      streaming: true,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
