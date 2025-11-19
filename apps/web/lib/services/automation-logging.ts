/**
 * Automation Logging & Opt-Out Service
 * 
 * Standardized logging and opt-out handling for AI automations:
 * - Check opt-out status before sending
 * - Log all automation activities
 * - Enforce consistent lead_activities records
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logging/logger'

const logger = createLogger('automation-logging')

export interface AutomationActivity {
  leadId: string
  activityType: string
  subject: string
  description: string
  metadata?: Record<string, any>
}

/**
 * Check if lead is opted out
 */
export async function isLeadOptedOut(leadId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('do_not_contact, unsubscribed')
      .eq('id', leadId)
      .single()

    if (error || !lead) {
      logger.warn('Failed to check opt-out status', { leadId, error })
      return false
    }

    return lead.do_not_contact || lead.unsubscribed
  } catch (error) {
    logger.error('Error checking opt-out status', { leadId, error })
    return false
  }
}

/**
 * Check if email is opted out
 */
export async function isEmailOptedOut(email: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('do_not_contact, unsubscribed')
      .eq('email', email)
      .single()

    if (error || !lead) {
      return false
    }

    return lead.do_not_contact || lead.unsubscribed
  } catch (error) {
    logger.error('Error checking email opt-out', { email, error })
    return false
  }
}

/**
 * Log automation activity
 */
export async function logAutomationActivity(
  activity: AutomationActivity
): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Check opt-out before logging
    const optedOut = await isLeadOptedOut(activity.leadId)
    if (optedOut) {
      logger.info('Skipping activity log for opted-out lead', {
        leadId: activity.leadId,
      })
      return
    }

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: activity.leadId,
      activity_type: activity.activityType,
      subject: activity.subject,
      description: activity.description,
      metadata: activity.metadata || {},
      created_at: new Date().toISOString(),
    })

    logger.debug('Activity logged', {
      leadId: activity.leadId,
      activityType: activity.activityType,
    })
  } catch (error) {
    logger.error('Failed to log activity', { error, activity })
  }
}

/**
 * Log email sent activity
 */
export async function logEmailSent(
  leadId: string,
  campaignId: string,
  subject: string
): Promise<void> {
  await logAutomationActivity({
    leadId,
    activityType: 'email_sent',
    subject: `Email sent: ${subject}`,
    description: `Automated email sent from campaign ${campaignId}`,
    metadata: {
      campaign_id: campaignId,
      subject,
    },
  })
}

/**
 * Log chatbot interaction
 */
export async function logChatbotInteraction(
  leadId: string,
  conversationId: string,
  messageCount: number
): Promise<void> {
  await logAutomationActivity({
    leadId,
    activityType: 'chatbot_interaction',
    subject: 'Chatbot conversation',
    description: `User engaged in chatbot conversation with ${messageCount} messages`,
    metadata: {
      conversation_id: conversationId,
      message_count: messageCount,
    },
  })
}

/**
 * Mark lead as opted out
 */
export async function markLeadOptedOut(
  leadId: string,
  reason?: string
): Promise<void> {
  const supabase = createAdminClient()

  try {
    await supabase
      .from('leads')
      .update({
        do_not_contact: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    logger.info('Lead marked as opted out', { leadId, reason })

    // Log the opt-out
    await logAutomationActivity({
      leadId,
      activityType: 'opted_out',
      subject: 'Opted out from communications',
      description: reason || 'Lead opted out from all communications',
    })
  } catch (error) {
    logger.error('Failed to mark lead as opted out', { leadId, error })
  }
}

