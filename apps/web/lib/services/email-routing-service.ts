/**
 * Email Routing Service
 * 
 * Centralized service for email routing and auto-response logic:
 * - Route emails to appropriate handlers
 * - Generate auto-responses
 * - Handle opt-out logic
 * - Log email activities
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logging/logger'

const logger = createLogger('email-routing-service')

export interface ProcessedEmail {
  id: string
  fromAddress: string
  toAddresses: string[]
  subject: string
  classification: string
  urgencyLevel: string
}

/**
 * Route email based on classification
 */
export async function routeEmail(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Check if sender is opted out
    const { data: lead } = await (supabase.from('leads') as any)
      .select('do_not_contact, unsubscribed')
      .eq('email', email.fromAddress)
      .single()

    if (lead?.do_not_contact || lead?.unsubscribed) {
      logger.info('Email from opted-out contact, skipping routing', {
        email: email.fromAddress,
      })
      return
    }

    // Route based on classification
    switch (email.classification) {
      case 'inquiry':
        await routeInquiry(email)
        break
      case 'complaint':
        await routeComplaint(email)
        break
      case 'feedback':
        await routeFeedback(email)
        break
      case 'spam':
        await routeSpam(email)
        break
      default:
        await routeGeneral(email)
    }

    logger.info('Email routed successfully', {
      emailId: email.id,
      classification: email.classification,
    })
  } catch (error) {
    logger.error('Failed to route email', { error, emailId: email.id })
    throw error
  }
}

/**
 * Route inquiry emails
 */
async function routeInquiry(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  // Create ticket or assign to sales
  await (supabase.from('email_actions_log') as any).insert({
    email_id: email.id,
    action_type: 'routed_to_sales',
    success: true,
    action_details: {
      classification: email.classification,
      urgency: email.urgencyLevel,
    },
  })
}

/**
 * Route complaint emails
 */
async function routeComplaint(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  // Create high-priority ticket
  await (supabase.from('email_actions_log') as any).insert({
    email_id: email.id,
    action_type: 'routed_to_support',
    success: true,
    action_details: {
      priority: 'high',
      classification: email.classification,
    },
  })
}

/**
 * Route feedback emails
 */
async function routeFeedback(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  await (supabase.from('email_actions_log') as any).insert({
    email_id: email.id,
    action_type: 'routed_to_product',
    success: true,
    action_details: {
      classification: email.classification,
    },
  })
}

/**
 * Route spam emails
 */
async function routeSpam(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  // Mark sender as spam
  await (supabase.from('leads') as any)
    .update({ do_not_contact: true })
    .eq('email', email.fromAddress)

  logger.warn('Spam email detected and sender marked as do-not-contact', {
    email: email.fromAddress,
  })
}

/**
 * Route general/unclassified emails
 */
async function routeGeneral(email: ProcessedEmail): Promise<void> {
  const supabase = createAdminClient()

  await (supabase.from('email_actions_log') as any).insert({
    email_id: email.id,
    action_type: 'routed_to_general',
    success: true,
    action_details: {
      classification: email.classification,
    },
  })
}

/**
 * Generate auto-response for email
 */
export async function generateAutoResponse(
  email: ProcessedEmail
): Promise<string | null> {
  // Only auto-respond to inquiries and feedback
  if (!['inquiry', 'feedback'].includes(email.classification)) {
    return null
  }

  const responses: Record<string, string> = {
    inquiry: `Thank you for your inquiry. We have received your email and will respond within 24 hours.`,
    feedback: `Thank you for your feedback. We appreciate your input and will review it carefully.`,
  }

  return responses[email.classification] || null
}

