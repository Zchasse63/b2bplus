/**
 * Audit Trail System
 * Logs sensitive operations for compliance and security
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'DATA_EXPORT'
  | 'DATA_DELETE'
  | 'ADMIN_ACTION'
  | 'SECURITY_EVENT'
  | 'PAYMENT'
  | 'CAMPAIGN_SEND'
  | 'AI_CALL';

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit Trail Logger
 */
export class AuditTrailLogger {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<{ success: boolean; id?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('audit_trail')
        .insert([
          {
            timestamp: entry.timestamp,
            user_id: entry.userId,
            action: entry.action,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            changes: entry.changes,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            status: entry.status,
            error_message: entry.errorMessage,
            metadata: entry.metadata,
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log audit event:', error);
        return { success: false };
      }

      return { success: true, id: data?.id };
    } catch (error) {
      console.error('Error logging audit event:', error);
      return { success: false };
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'LOGOUT',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    userId: string,
    targetUserId: string,
    changes: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'PERMISSION_CHANGE',
      resourceType: 'user_permission',
      resourceId: targetUserId,
      changes,
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Log data export
   */
  async logDataExport(userId: string, dataType: string, ipAddress?: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'DATA_EXPORT',
      resourceType: dataType,
      resourceId: userId,
      ipAddress,
      status: 'success',
      metadata: { dataType },
    });
  }

  /**
   * Log data deletion
   */
  async logDataDeletion(
    userId: string,
    dataType: string,
    recordCount: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'DATA_DELETE',
      resourceType: dataType,
      resourceId: userId,
      ipAddress,
      status: 'success',
      metadata: { dataType, recordCount },
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'ADMIN_ACTION',
      resourceType,
      resourceId,
      changes,
      ipAddress,
      status: 'success',
      metadata: { adminAction: action },
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'SECURITY_EVENT',
      resourceType: 'security',
      resourceId: eventType,
      ipAddress,
      status: 'success',
      metadata: { eventType, severity, ...details },
    });
  }

  /**
   * Log payment
   */
  async logPayment(
    userId: string,
    orderId: string,
    amount: number,
    status: 'success' | 'failure',
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'PAYMENT',
      resourceType: 'order',
      resourceId: orderId,
      ipAddress,
      status,
      metadata: { amount },
    });
  }

  /**
   * Log campaign send
   */
  async logCampaignSend(
    userId: string,
    campaignId: string,
    recipientCount: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'CAMPAIGN_SEND',
      resourceType: 'campaign',
      resourceId: campaignId,
      ipAddress,
      status: 'success',
      metadata: { recipientCount },
    });
  }

  /**
   * Log AI call
   */
  async logAICall(
    userId: string,
    aiModel: string,
    tokensUsed: number,
    cost: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId,
      action: 'AI_CALL',
      resourceType: 'ai_model',
      resourceId: aiModel,
      ipAddress,
      status: 'success',
      metadata: { aiModel, tokensUsed, cost },
    });
  }

  /**
   * Get audit logs for user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('audit_trail')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: row.changes,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      metadata: row.metadata,
    }));
  }

  /**
   * Get audit logs for resource
   */
  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('audit_trail')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch resource audit logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: row.changes,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      metadata: row.metadata,
    }));
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    filters: {
      userId?: string;
      action?: AuditAction;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
    },
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    let query = this.supabase.from('audit_trail').select('*');

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to search audit logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: row.changes,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      metadata: row.metadata,
    }));
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(
    startDate: string,
    endDate: string
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
    failedEvents: number;
    securityEvents: number;
  }> {
    const { data, error } = await this.supabase
      .from('audit_trail')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (error) {
      console.error('Failed to generate audit report:', error);
      return {
        totalEvents: 0,
        eventsByAction: {},
        eventsByUser: {},
        failedEvents: 0,
        securityEvents: 0,
      };
    }

    const events = data || [];
    const eventsByAction: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    let failedEvents = 0;
    let securityEvents = 0;

    for (const event of events) {
      // Count by action
      eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;

      // Count by user
      eventsByUser[event.user_id] = (eventsByUser[event.user_id] || 0) + 1;

      // Count failed events
      if (event.status === 'failure') {
        failedEvents++;
      }

      // Count security events
      if (event.action === 'SECURITY_EVENT') {
        securityEvents++;
      }
    }

    return {
      totalEvents: events.length,
      eventsByAction,
      eventsByUser,
      failedEvents,
      securityEvents,
    };
  }
}

/**
 * Create audit trail logger instance
 */
export function createAuditTrailLogger(supabase: SupabaseClient): AuditTrailLogger {
  return new AuditTrailLogger(supabase);
}

