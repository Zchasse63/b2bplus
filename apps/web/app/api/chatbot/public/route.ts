/**
 * Phase 2: AI Backend Logic - Public Chatbot API
 *
 * POST /api/chatbot/public
 * Handles public (unauthenticated) chatbot conversations with lead capture
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/providers/unified';
import { getChatbotPrompt } from '@/lib/ai/chatbot-prompts';
import { sanitizeAIInput } from '@/lib/ai/input-sanitizer';
import {
  qualifyLead,
  createOrUpdateLead,
  extractContactInfo,
  shouldQualifyLead
} from '@/lib/ai/lead-qualification';
import {
  validatePublicRequest,
  PUBLIC_RATE_LIMITS,
  getRateLimitHeaders
} from '@/lib/middleware/public-rate-limit';
import { sendLeadNotification } from '@/lib/sendgrid';
import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('public-chatbot');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PublicChatbotRequest {
  message: string;
  conversationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate rate limit (10 messages per hour per IP)
    const { ip, remaining, resetAt } = validatePublicRequest(
      request,
      PUBLIC_RATE_LIMITS.PUBLIC_CHATBOT
    );

    const supabase = await createClient();

    // Parse request body
    const body: PublicChatbotRequest = await request.json();
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
      logger.warn('Suspicious input detected in public chatbot message', {
        conversationId,
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

    // Get or create conversation
    let conversation: any;
    let messages: ChatMessage[] = [];

    if (conversationId) {
      // Load existing conversation
      const { data: existingConv, error: convError } = await supabase
        .from('public_chatbot_conversations')
        .select('id, messages, lead_id')
        .eq('id', conversationId)
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
        .from('public_chatbot_conversations')
        .insert({
          ip_address: ip,
          messages: [],
        })
        .select('id, messages, lead_id')
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

    // Build conversation history for AI
    const conversationHistory = messages
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate AI response using public chatbot prompt
    const systemPrompt = getChatbotPrompt(false); // false = public/unauthenticated

    const aiPrompt = `${conversationHistory}\n\nuser: ${message}\n\nassistant:`;

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
      .from('public_chatbot_conversations')
      .update({ messages })
      .eq('id', conversation.id);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
    }

    // Check if we should qualify this lead
    let leadQualified = false;
    let leadId: string | null = conversation.lead_id;

    if (shouldQualifyLead(messages) && !conversation.lead_id) {
      try {
        // Extract contact information first
        const contactInfo = await extractContactInfo(messages);

        // Only qualify if we have at least email or phone
        if (contactInfo.email || contactInfo.phone) {
          // Qualify the lead
          const qualification = await qualifyLead(messages);

          // Merge extracted contact info with qualification
          const mergedQualification = {
            ...qualification,
            email: qualification.email || contactInfo.email,
            phone: qualification.phone || contactInfo.phone,
            contactName: qualification.contactName || contactInfo.name,
            companyName: qualification.companyName || contactInfo.company,
          };

          // Create or update lead in database
          const { leadId: newLeadId, isNew } = await createOrUpdateLead(
            mergedQualification,
            conversation.id,
            ip
          );

          leadId = newLeadId;
          leadQualified = true;

          // Send notification to sales team for hot/warm leads
          if (isNew && (mergedQualification.category === 'hot' || mergedQualification.category === 'warm')) {
            try {
              await sendLeadNotification({
                leadId: newLeadId,
                companyName: mergedQualification.companyName,
                contactName: mergedQualification.contactName,
                email: mergedQualification.email,
                phone: mergedQualification.phone,
                leadScore: mergedQualification.score,
                leadCategory: mergedQualification.category,
                industry: mergedQualification.industry,
                painPoints: mergedQualification.painPoints,
                nextSteps: mergedQualification.nextSteps,
                notes: mergedQualification.notes,
                conversationSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
              });
            } catch (emailError) {
              console.error('Failed to send lead notification:', emailError);
              // Don't fail the request if email fails
            }
          }
        }
      } catch (qualificationError) {
        console.error('Lead qualification error:', qualificationError);
        // Don't fail the request if qualification fails
      }
    }

    // Build response with rate limit headers
    const response = NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: aiResponse.response,
      leadQualified,
      leadId,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toISOString());

    return response;

  } catch (error) {
    logger.error('Public chatbot API error', { error });

    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chatbot/public?conversationId=xxx
 * Retrieve public conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Return specific conversation
    const { data: conversation, error } = await supabase
      .from('public_chatbot_conversations')
      .select('id, messages, created_at, updated_at')
      .eq('id', conversationId)
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
    console.error('Get public conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
