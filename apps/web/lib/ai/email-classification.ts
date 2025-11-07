/**
 * Email Classification Module
 * 
 * AI-powered email classification, sentiment analysis, and entity extraction.
 * Classifies incoming emails and determines routing and urgency.
 * 
 * Phase 5: Operational AI - Week 22
 */

import { generateJSONPro } from '@/lib/gemini';

/**
 * Email classification types
 */
export type EmailClassification =
  | 'order_inquiry'
  | 'quote_request'
  | 'support_request'
  | 'complaint'
  | 'invoice_question'
  | 'shipping_inquiry'
  | 'product_question'
  | 'partnership'
  | 'spam'
  | 'other';

/**
 * Sentiment types
 */
export type Sentiment = 'positive' | 'neutral' | 'negative';

/**
 * Urgency levels
 */
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Email classification result
 */
export interface EmailClassificationResult {
  classification: EmailClassification;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  sentiment: Sentiment;
  sentiment_score: number; // -1.0 to 1.0
  urgency_level: UrgencyLevel;
  extracted_entities: {
    organization_name?: string;
    organization_id?: string;
    order_number?: string;
    order_id?: string;
    product_names?: string[];
    product_ids?: string[];
    invoice_number?: string;
    tracking_number?: string;
    contact_name?: string;
    phone_numbers?: string[];
    dates?: string[];
    amounts?: number[];
  };
  suggested_actions: string[];
  requires_human_review: boolean;
  review_reason?: string;
}

/**
 * Email data for classification
 */
export interface EmailData {
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  body_text: string;
  body_html?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
  }>;
}

/**
 * Classify an email using AI
 */
export async function classifyEmail(
  email: EmailData
): Promise<EmailClassificationResult> {
  const prompt = `Analyze this B2B customer email and provide comprehensive classification:

FROM: ${email.from_address}
TO: ${email.to_addresses.join(', ')}
${email.cc_addresses && email.cc_addresses.length > 0 ? `CC: ${email.cc_addresses.join(', ')}` : ''}
SUBJECT: ${email.subject}

BODY:
${email.body_text}

${email.attachments && email.attachments.length > 0 ? `
ATTACHMENTS:
${email.attachments.map(a => `- ${a.filename} (${a.content_type}, ${a.size} bytes)`).join('\n')}
` : ''}

Classify this email into ONE of these categories:
- order_inquiry: Customer asking about placing an order or order process
- quote_request: Customer requesting a price quote or proposal
- support_request: Technical support or help needed
- complaint: Customer complaint or dissatisfaction
- invoice_question: Questions about billing or invoices
- shipping_inquiry: Questions about delivery or shipping
- product_question: Questions about specific products
- partnership: Business partnership or collaboration inquiry
- spam: Spam, marketing, or irrelevant email
- other: Doesn't fit other categories

Also analyze:
1. Sentiment (positive, neutral, negative) with score (-1.0 to 1.0)
2. Urgency level (low, medium, high, critical)
3. Extract entities: organization names, order numbers, product names, invoice numbers, tracking numbers, contact info, dates, amounts
4. Suggest automated actions that could be taken
5. Determine if human review is required

Provide detailed reasoning for your classification.`;

  const result = await generateJSONPro<EmailClassificationResult>(prompt);

  // Validate and normalize the result
  return {
    classification: result.classification || 'other',
    confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
    reasoning: result.reasoning || 'No reasoning provided',
    sentiment: result.sentiment || 'neutral',
    sentiment_score: Math.min(Math.max(result.sentiment_score || 0, -1), 1),
    urgency_level: result.urgency_level || 'medium',
    extracted_entities: result.extracted_entities || {},
    suggested_actions: result.suggested_actions || [],
    requires_human_review: result.requires_human_review || false,
    review_reason: result.review_reason,
  };
}

/**
 * Determine if an email should auto-respond
 */
export function shouldAutoRespond(
  classification: EmailClassificationResult
): boolean {
  // Don't auto-respond to spam
  if (classification.classification === 'spam') {
    return false;
  }

  // Don't auto-respond to complaints (needs human touch)
  if (classification.classification === 'complaint') {
    return false;
  }

  // Don't auto-respond if human review is required
  if (classification.requires_human_review) {
    return false;
  }

  // Don't auto-respond to critical urgency (needs immediate human attention)
  if (classification.urgency_level === 'critical') {
    return false;
  }

  // Auto-respond to common inquiries
  const autoRespondTypes: EmailClassification[] = [
    'order_inquiry',
    'quote_request',
    'shipping_inquiry',
    'product_question',
    'invoice_question',
  ];

  return autoRespondTypes.includes(classification.classification);
}

/**
 * Determine routing department based on classification
 */
export function determineRoutingDepartment(
  classification: EmailClassificationResult
): string {
  const routingMap: Record<EmailClassification, string> = {
    order_inquiry: 'sales',
    quote_request: 'sales',
    support_request: 'support',
    complaint: 'customer_service',
    invoice_question: 'accounting',
    shipping_inquiry: 'logistics',
    product_question: 'sales',
    partnership: 'business_development',
    spam: 'spam',
    other: 'general',
  };

  return routingMap[classification.classification] || 'general';
}

/**
 * Generate auto-response content using AI
 */
export async function generateAutoResponse(
  email: EmailData,
  classification: EmailClassificationResult,
  template?: string
): Promise<{
  subject: string;
  body: string;
}> {
  const prompt = `Generate a professional auto-response email for this customer inquiry:

ORIGINAL EMAIL:
From: ${email.from_address}
Subject: ${email.subject}
Body: ${email.body_text}

CLASSIFICATION: ${classification.classification}
SENTIMENT: ${classification.sentiment}
URGENCY: ${classification.urgency_level}

${template ? `Use this template as a guide:\n${template}\n` : ''}

Generate a helpful, professional auto-response that:
1. Acknowledges receipt of their email
2. Provides relevant information based on the classification
3. Sets expectations for follow-up
4. Maintains a ${classification.sentiment === 'negative' ? 'empathetic and apologetic' : 'friendly and professional'} tone
5. Includes next steps or actions they can take

${classification.extracted_entities.order_number ? `Reference their order number: ${classification.extracted_entities.order_number}` : ''}
${classification.extracted_entities.organization_name ? `Address them by organization: ${classification.extracted_entities.organization_name}` : ''}

Provide both subject line and email body.`;

  const result = await generateJSONPro<{
    subject: string;
    body: string;
  }>(prompt);

  return {
    subject: result.subject || `Re: ${email.subject}`,
    body: result.body || 'Thank you for your email. We have received your message and will respond shortly.',
  };
}

/**
 * Extract actionable items from email
 */
export async function extractActionableItems(
  email: EmailData,
  classification: EmailClassificationResult
): Promise<Array<{
  action_type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  data: Record<string, any>;
}>> {
  const prompt = `Extract actionable items from this email:

SUBJECT: ${email.subject}
BODY: ${email.body_text}
CLASSIFICATION: ${classification.classification}

Identify specific actions that should be taken, such as:
- Create quote for specific products
- Look up order status
- Process return/refund
- Schedule follow-up call
- Update customer information
- Create support ticket
- Send product information

For each action, provide:
- action_type: Type of action (create_quote, lookup_order, etc.)
- description: Human-readable description
- priority: low, medium, or high
- data: Relevant data extracted from email (product names, order numbers, etc.)`;

  const result = await generateJSONPro<{
    actions: Array<{
      action_type: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      data: Record<string, any>;
    }>;
  }>(prompt);

  return result.actions || [];
}

