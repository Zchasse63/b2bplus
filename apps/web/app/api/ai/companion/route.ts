/**
 * AI Companion API Endpoint
 *
 * Streaming chat endpoint with tool calling for the AI Companion.
 * Uses intelligent model routing to automatically select between
 * Grok 4.1 Fast and Grok 4.1 Fast Reasoning based on task complexity.
 */

import { streamText, CoreMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { grokModels } from '@/lib/ai/providers/xai';
import { getToolsForRole } from '@/lib/ai/tools';
import {
  getModelForRequest,
  detectToolCategory,
} from '@/lib/ai/model-router';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { AICompanionSchema } from '@/lib/validation/schemas';
import { NextRequest } from 'next/server';
import { handleError, AuthError } from '@/lib/middleware/error-handler';

// Maximum duration for streaming (5 minutes)
export const maxDuration = 300;

// System prompts for different contexts
const SYSTEM_PROMPTS = {
  customer: `You are an AI assistant for a B2B e-commerce platform. You help customers with:
- Searching and browsing products
- Managing their shopping cart
- Placing and tracking orders
- Managing their account and addresses
- Finding information about pricing and availability

Be helpful, concise, and professional. When you need to perform actions, use the available tools.
If you don't have information, use the appropriate tool to look it up.
Always confirm before making changes to orders or account settings.

Format your responses using markdown for better readability.`,

  admin: `You are an AI assistant for B2B Plus e-commerce platform administrators. You help with:
- Managing orders, customers, and products
- Analyzing sales data and customer insights
- Running marketing campaigns
- Processing documents (invoices, POs, price lists)
- Managing inventory and pricing

You have access to powerful analytics and management tools. Use them to provide actionable insights.
When parsing documents, use the document processing tools and always show a preview before importing.
Be thorough but efficient. Highlight important metrics and potential issues.

Format your responses using markdown. Use tables for data when appropriate.`,
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for AI endpoints
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai');
    if (!allowed) {
      return rateLimitResponse!;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError('Authentication required');
    }

    // Validate request body before processing
    const validation = await validateRequestBody(request, AICompanionSchema);
    if (!validation.valid) {
      return validation.response!;
    }

    const { messages, context, useReasoning } = validation.data as {
      messages: CoreMessage[];
      context?: {
        currentPath?: string;
        pageData?: Record<string, any>;
      };
      useReasoning?: boolean; // Optional override flag
    };

    // Get user profile for role-based access
    let role: 'customer' | 'admin' | null = null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role as 'customer' | 'admin' | null;

    // Add context to the system message if provided
    let systemPrompt = role === 'admin' ? SYSTEM_PROMPTS.admin : SYSTEM_PROMPTS.customer;

    if (context?.currentPath) {
      systemPrompt += `\n\nCurrent context:
- User is on page: ${context.currentPath}
- User role: ${role || 'guest'}
- User ID: ${user?.id || 'not authenticated'}`;

      if (context.pageData) {
        systemPrompt += `\n- Page data: ${JSON.stringify(context.pageData)}`;
      }
    }

    // =========================================================================
    // INTELLIGENT MODEL ROUTING
    // =========================================================================

    // Stage 1: Analyze prompt complexity for initial model selection
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const promptContent = typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content
      : '';

    const modelSelection = getModelForRequest(messages, {
      role,
      toolCategory: detectToolCategory(promptContent),
    });

    // Allow manual override if explicitly set
    const finalUseReasoning = useReasoning !== undefined
      ? useReasoning
      : modelSelection.useReasoning;

    const model = finalUseReasoning ? grokModels.reasoning : grokModels.fast;
    const modelId = finalUseReasoning ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast';


    // Get tools available for user role
    const tools = getToolsForRole(role);

    // Stream the response with intelligent routing
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 10 as any, // Allow multiple tool calls per turn (cast for TS compat)
      temperature: finalUseReasoning ? 0.3 : 0.7,
      onFinish: async ({ text, toolCalls, usage }: { text?: string; toolCalls?: any[]; usage?: any }) => {
        // Log conversation for analytics with routing info
        if (user) {
          try {
            await supabase.from('ai_conversations').insert({
              user_id: user.id,
              messages: messages.length,
              tool_calls: toolCalls?.length || 0,
              tokens_used: usage?.totalTokens || 0,
              model: modelId,
              routing_score: modelSelection.score,
              routing_reasons: modelSelection.reasons,
            });
          } catch (err) {
            console.error('Failed to log AI conversation:', err);
          }
        }
      },
    } as any);

    // Return streaming response
    return (result as any).toDataStreamResponse();
  } catch (error) {
    return handleError(error);
  }
}

// Health check endpoint
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', model: 'grok-4-1-fast', routing: 'intelligent' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

