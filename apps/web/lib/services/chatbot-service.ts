/**
 * Chatbot Service
 * 
 * Centralized service for chatbot operations:
 * - Conversation management
 * - Message handling
 * - User ownership enforcement
 * - Opt-out handling
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logging/logger'

const logger = createLogger('chatbot-service')

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ChatConversation {
  id: string
  userId: string
  organizationId: string
  title: string
  createdAt: string
  updatedAt: string
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  organizationId: string,
  title: string
): Promise<ChatConversation> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('chatbot_conversations')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      title,
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create conversation', { error, userId })
    throw new Error('Failed to create conversation')
  }

  return data
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string
): Promise<ChatConversation[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('chatbot_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch conversations', { error, userId })
    return []
  }

  return data || []
}

/**
 * Add message to conversation
 */
export async function addMessage(
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const supabase = createAdminClient()

  // Verify user owns conversation
  const { data: conversation, error: convError } = await supabase
    .from('chatbot_conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation || conversation.user_id !== userId) {
    throw new Error('Unauthorized: User does not own this conversation')
  }

  // Add message
  const { data, error } = await supabase
    .from('chatbot_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to add message', { error, conversationId })
    throw new Error('Failed to add message')
  }

  return data
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string
): Promise<ChatMessage[]> {
  const supabase = createAdminClient()

  // Verify user owns conversation
  const { data: conversation, error: convError } = await supabase
    .from('chatbot_conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation || conversation.user_id !== userId) {
    throw new Error('Unauthorized')
  }

  // Get messages
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('Failed to fetch messages', { error, conversationId })
    return []
  }

  return data || []
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Verify user owns conversation
  const { data: conversation, error: convError } = await supabase
    .from('chatbot_conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation || conversation.user_id !== userId) {
    throw new Error('Unauthorized')
  }

  // Delete conversation and messages
  const { error } = await supabase
    .from('chatbot_conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    logger.error('Failed to delete conversation', { error, conversationId })
    throw new Error('Failed to delete conversation')
  }
}

