/**
 * Audit Logging Utility
 *
 * Provides TypeScript interface for logging audit events to the database
 * Used for compliance, security monitoring, and debugging
 *
 * SECURITY: All critical operations should be logged for audit trail
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Audit event types
 * Must match the CHECK constraint in audit_logs table
 */
export enum AuditEventType {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_MAGIC_LINK_REQUEST = 'auth.magic_link_request',
  AUTH_MAGIC_LINK_VERIFY = 'auth.magic_link_verify',

  // Users
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',

  // Organizations
  ORG_CREATE = 'org.create',
  ORG_UPDATE = 'org.update',
  ORG_DELETE = 'org.delete',
  ORG_MEMBER_ADD = 'org.member_add',
  ORG_MEMBER_REMOVE = 'org.member_remove',
  ORG_MEMBER_ROLE_CHANGE = 'org.member_role_change',

  // Products
  PRODUCT_CREATE = 'product.create',
  PRODUCT_UPDATE = 'product.update',
  PRODUCT_DELETE = 'product.delete',

  // Orders
  ORDER_CREATE = 'order.create',
  ORDER_UPDATE = 'order.update',
  ORDER_CANCEL = 'order.cancel',
  ORDER_SHIP = 'order.ship',
  ORDER_DELIVER = 'order.deliver',

  // Pricing
  PRICING_UPDATE = 'pricing.update',
  PRICING_TIER_ASSIGN = 'pricing.tier_assign',

  // Campaigns
  CAMPAIGN_CREATE = 'campaign.create',
  CAMPAIGN_SEND = 'campaign.send',

  // Security
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  SECURITY_CSRF_VIOLATION = 'security.csrf_violation',
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SECURITY_WEBHOOK_VERIFY_FAIL = 'security.webhook_verify_fail',

  // Admin
  ADMIN_IMPERSONATE = 'admin.impersonate',
  ADMIN_DATA_EXPORT = 'admin.data_export',
  ADMIN_DATA_IMPORT = 'admin.data_import',

  // System
  SYSTEM_ERROR = 'system.error',
}

/**
 * Audit severity levels
 */
export enum AuditSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  eventType: AuditEventType;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
}

/**
 * Log an audit event
 *
 * @param event - The audit event to log
 * @returns The audit log ID
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   eventType: AuditEventType.PRODUCT_CREATE,
 *   action: 'create',
 *   resourceType: 'product',
 *   resourceId: product.id,
 *   newValues: { sku: product.sku, name: product.name },
 *   metadata: { imported: true },
 * });
 * ```
 */
export async function logAuditEvent(event: AuditEvent): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Call the database function
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_event_type: event.eventType,
      p_action: event.action,
      p_resource_type: event.resourceType || null,
      p_resource_id: event.resourceId || null,
      p_old_values: event.oldValues ? JSON.stringify(event.oldValues) : null,
      p_new_values: event.newValues ? JSON.stringify(event.newValues) : null,
      p_metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      p_severity: event.severity || AuditSeverity.INFO,
    });

    if (error) {
      logger.error('Failed to log audit event:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    logger.error('Error logging audit event:', error);
    return null;
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  type: 'login' | 'logout' | 'password_change' | 'magic_link_request' | 'magic_link_verify',
  metadata?: Record<string, any>
): Promise<void> {
  const eventMap = {
    login: AuditEventType.AUTH_LOGIN,
    logout: AuditEventType.AUTH_LOGOUT,
    password_change: AuditEventType.AUTH_PASSWORD_CHANGE,
    magic_link_request: AuditEventType.AUTH_MAGIC_LINK_REQUEST,
    magic_link_verify: AuditEventType.AUTH_MAGIC_LINK_VERIFY,
  };

  await logAuditEvent({
    eventType: eventMap[type],
    action: type,
    metadata,
    severity: AuditSeverity.INFO,
  });
}

/**
 * Log security event
 */
export async function logSecurityEventToAudit(
  type: 'rate_limit' | 'csrf' | 'unauthorized' | 'webhook_verify_fail',
  details: Record<string, any>
): Promise<void> {
  const eventMap = {
    rate_limit: AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
    csrf: AuditEventType.SECURITY_CSRF_VIOLATION,
    unauthorized: AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
    webhook_verify_fail: AuditEventType.SECURITY_WEBHOOK_VERIFY_FAIL,
  };

  const severityMap = {
    rate_limit: AuditSeverity.WARN,
    csrf: AuditSeverity.ERROR,
    unauthorized: AuditSeverity.ERROR,
    webhook_verify_fail: AuditSeverity.CRITICAL,
  };

  await logAuditEvent({
    eventType: eventMap[type],
    action: 'security_event',
    metadata: details,
    severity: severityMap[type],
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: 'impersonate' | 'data_export' | 'data_import',
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  const eventMap = {
    impersonate: AuditEventType.ADMIN_IMPERSONATE,
    data_export: AuditEventType.ADMIN_DATA_EXPORT,
    data_import: AuditEventType.ADMIN_DATA_IMPORT,
  };

  await logAuditEvent({
    eventType: eventMap[action],
    action,
    resourceType,
    resourceId,
    metadata: details,
    severity: AuditSeverity.WARN, // Admin actions should be monitored closely
  });
}

/**
 * Log resource change (create, update, delete)
 */
export async function logResourceChange(
  resourceType: 'product' | 'order' | 'user' | 'organization' | 'pricing' | 'campaign',
  action: 'create' | 'update' | 'delete',
  resourceId: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  const eventTypeMap = {
    product: {
      create: AuditEventType.PRODUCT_CREATE,
      update: AuditEventType.PRODUCT_UPDATE,
      delete: AuditEventType.PRODUCT_DELETE,
    },
    order: {
      create: AuditEventType.ORDER_CREATE,
      update: AuditEventType.ORDER_UPDATE,
      delete: AuditEventType.ORDER_CANCEL, // Orders are usually cancelled, not deleted
    },
    user: {
      create: AuditEventType.USER_CREATE,
      update: AuditEventType.USER_UPDATE,
      delete: AuditEventType.USER_DELETE,
    },
    organization: {
      create: AuditEventType.ORG_CREATE,
      update: AuditEventType.ORG_UPDATE,
      delete: AuditEventType.ORG_DELETE,
    },
    pricing: {
      create: AuditEventType.PRICING_UPDATE,
      update: AuditEventType.PRICING_UPDATE,
      delete: AuditEventType.PRICING_UPDATE,
    },
    campaign: {
      create: AuditEventType.CAMPAIGN_CREATE,
      update: AuditEventType.CAMPAIGN_SEND,
      delete: AuditEventType.CAMPAIGN_CREATE, // Unlikely to delete campaigns
    },
  };

  await logAuditEvent({
    eventType: eventTypeMap[resourceType][action],
    action,
    resourceType,
    resourceId,
    oldValues,
    newValues,
    metadata,
    severity: AuditSeverity.INFO,
  });
}

/**
 * Get audit logs for current organization (admin only)
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_audit_logs_for_organization', {
      p_organization_id: organizationId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.error('Failed to retrieve audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error retrieving audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
): Promise<any[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_audit_logs_for_resource', {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
    });

    if (error) {
      logger.error('Failed to retrieve resource audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error retrieving resource audit logs:', error);
    return [];
  }
}

export default {
  logAuditEvent,
  logAuthEvent,
  logSecurityEventToAudit,
  logAdminAction,
  logResourceChange,
  getOrganizationAuditLogs,
  getResourceAuditLogs,
};
