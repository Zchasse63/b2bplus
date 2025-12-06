/**
 * AI Companion API Endpoint
 *
 * Streaming chat endpoint with tool calling for the AI Companion.
 * Uses Grok 4.1 Fast for simple operations and Grok 4.1 Fast Reasoning for complex tasks.
 */

import { streamText, CoreMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { grokModels, defaultModel } from '@/lib/ai/providers/xai';
import { getToolsForRole, allTools } from '@/lib/ai/tools';

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile for role-based access
    let role: 'customer' | 'admin' | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role as 'customer' | 'admin' | null;
    }

    const { messages, context, useReasoning = false } = await request.json() as {
      messages: CoreMessage[];
      context?: {
        currentPath?: string;
        pageData?: Record<string, any>;
      };
      useReasoning?: boolean;
    };

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

    // Select model based on task complexity
    const model = useReasoning ? grokModels.reasoning : defaultModel;

    // Get tools available for user role
    const tools = getToolsForRole(role);

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 10, // Allow multiple tool calls per turn
      temperature: useReasoning ? 0.3 : 0.7,
      onFinish: async ({ text, toolCalls, toolResults, usage }) => {
        // Log conversation for analytics (optional)
        if (user) {
          try {
            await supabase.from('ai_conversations').insert({
              user_id: user.id,
              messages: messages.length,
              tool_calls: toolCalls?.length || 0,
              tokens_used: usage?.totalTokens || 0,
              model: useReasoning ? 'grok-4.1-fast-reasoning' : 'grok-4.1-fast',
            });
          } catch (err) {
            console.error('Failed to log AI conversation:', err);
          }
        }
      },
    });

    // Return streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI Companion error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Health check endpoint
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', model: 'grok-4.1-fast' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
