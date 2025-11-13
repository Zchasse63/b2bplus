/**
 * Phase 2: AI Backend Logic - Lead Qualification
 * 
 * AI-powered lead scoring and qualification for public chatbot conversations
 * Analyzes conversation to determine lead quality and next steps
 */

import { generateJSON } from '@/lib/gemini';
import { getLeadQualificationPrompt } from './chatbot-prompts';
import { createClient } from '@/lib/supabase/server';

/**
 * Lead qualification result
 */
export interface LeadQualification {
  score: number; // 0-100
  category: 'hot' | 'warm' | 'cold';
  intent: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  estimatedMonthlyVolume: string | null;
  painPoints: string[];
  nextSteps: string[];
  notes: string;
}

/**
 * Qualify a lead based on chatbot conversation
 */
export async function qualifyLead(
  messages: Array<{ role: string; content: string }>
): Promise<LeadQualification> {
  try {
    const prompt = getLeadQualificationPrompt(messages);
    
    const qualification = await generateJSON<LeadQualification>(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
    });

    return qualification;
  } catch (error) {
    console.error('Lead qualification error:', error);
    
    // Return default low-quality lead if AI fails
    return {
      score: 0,
      category: 'cold',
      intent: 'Unknown',
      companyName: null,
      contactName: null,
      email: null,
      phone: null,
      industry: null,
      estimatedMonthlyVolume: null,
      painPoints: [],
      nextSteps: ['Follow up via email'],
      notes: 'AI qualification failed - manual review needed',
    };
  }
}

/**
 * Create or update lead in database
 */
export async function createOrUpdateLead(
  qualification: LeadQualification,
  conversationId: string,
  ipAddress: string
): Promise<{ leadId: string; isNew: boolean }> {
  const supabase = await createClient();

  // Check if lead already exists by email
  let existingLead = null;
  if (qualification.email) {
    const { data } = await supabase
      .from('leads')
      .select('id, lead_score, status, company_name, contact_name, phone, industry, notes')
      .eq('email', qualification.email)
      .single();

    existingLead = data;
  }

  if (existingLead) {
    // Update existing lead
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update({
        company_name: qualification.companyName || existingLead.company_name,
        contact_name: qualification.contactName || existingLead.contact_name,
        phone: qualification.phone || existingLead.phone,
        industry: qualification.industry || existingLead.industry,
        lead_score: Math.max(qualification.score, existingLead.lead_score || 0),
        lead_source: 'chatbot',
        notes: `${existingLead.notes || ''}\n\n[${new Date().toISOString()}] Chatbot conversation:\n${qualification.notes}`,
        last_contact_date: new Date().toISOString(),
      })
      .eq('id', existingLead.id)
      .select('id')
      .single();

    if (error) {
      throw new Error('Failed to update lead');
    }

    // Link conversation to lead
    await supabase
      .from('public_chatbot_conversations')
      .update({ lead_id: updatedLead.id })
      .eq('id', conversationId);

    return { leadId: updatedLead.id, isNew: false };
  } else {
    // Create new lead
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        company_name: qualification.companyName,
        contact_name: qualification.contactName,
        email: qualification.email,
        phone: qualification.phone,
        industry: qualification.industry,
        lead_score: qualification.score,
        lead_source: 'chatbot',
        status: qualification.category === 'hot' ? 'new' : 'unqualified',
        notes: qualification.notes,
        last_contact_date: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error('Failed to create lead');
    }

    // Link conversation to lead
    await supabase
      .from('public_chatbot_conversations')
      .update({ lead_id: newLead.id })
      .eq('id', conversationId);

    return { leadId: newLead.id, isNew: true };
  }
}

/**
 * Extract contact information from conversation
 * Uses AI to identify email, phone, name, company from messages
 */
export async function extractContactInfo(
  messages: Array<{ role: string; content: string }>
): Promise<{
  email: string | null;
  phone: string | null;
  name: string | null;
  company: string | null;
}> {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Extract contact information from this conversation. Look for email addresses, phone numbers, names, and company names.

Conversation:
${conversationText}

Respond with a JSON object:
{
  "email": "email@example.com" or null,
  "phone": "+1234567890" or null,
  "name": "John Doe" or null,
  "company": "Acme Corp" or null
}

Rules:
- Only extract information that is explicitly stated
- Validate email format
- Normalize phone numbers to E.164 format if possible
- Return null if information is not found`;

    const result = await generateJSON<{
      email: string | null;
      phone: string | null;
      name: string | null;
      company: string | null;
    }>(prompt, {
      temperature: 0.1,
      maxTokens: 300,
    });

    return result;
  } catch (error) {
    console.error('Contact extraction error:', error);
    return {
      email: null,
      phone: null,
      name: null,
      company: null,
    };
  }
}

/**
 * Determine if conversation has enough information to qualify lead
 */
export function shouldQualifyLead(
  messages: Array<{ role: string; content: string }>
): boolean {
  // Qualify if:
  // 1. At least 4 messages (2 exchanges)
  // 2. User has provided some information
  
  if (messages.length < 4) {
    return false;
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const totalUserText = userMessages.map(m => m.content).join(' ');

  // Check for indicators of engagement
  const hasEmail = /@/.test(totalUserText);
  const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(totalUserText);
  const hasCompanyMention = /company|business|restaurant|hotel|catering/i.test(totalUserText);
  const hasInterest = /interested|need|looking|want|buy|order|price|quote/i.test(totalUserText);

  // Qualify if user has shown interest and provided some contact info
  return (hasEmail || hasPhone) || (hasInterest && hasCompanyMention);
}

/**
 * Get lead category color for UI
 */
export function getLeadCategoryColor(category: 'hot' | 'warm' | 'cold'): string {
  switch (category) {
    case 'hot':
      return '#ef4444'; // red-500
    case 'warm':
      return '#f59e0b'; // amber-500
    case 'cold':
      return '#3b82f6'; // blue-500
  }
}

/**
 * Get lead category label
 */
export function getLeadCategoryLabel(category: 'hot' | 'warm' | 'cold'): string {
  switch (category) {
    case 'hot':
      return 'Hot Lead - Ready to Buy';
    case 'warm':
      return 'Warm Lead - Needs Nurturing';
    case 'cold':
      return 'Cold Lead - Low Intent';
  }
}

/**
 * Calculate lead priority for sales team
 */
export function calculateLeadPriority(qualification: LeadQualification): number {
  let priority = qualification.score;

  // Boost priority if contact info is provided
  if (qualification.email) priority += 10;
  if (qualification.phone) priority += 5;
  if (qualification.companyName) priority += 5;

  // Boost priority based on estimated volume
  if (qualification.estimatedMonthlyVolume) {
    const volumeMatch = qualification.estimatedMonthlyVolume.match(/\d+/);
    if (volumeMatch) {
      const volume = parseInt(volumeMatch[0]);
      if (volume > 10000) priority += 15;
      else if (volume > 5000) priority += 10;
      else if (volume > 1000) priority += 5;
    }
  }

  return Math.min(100, priority);
}

