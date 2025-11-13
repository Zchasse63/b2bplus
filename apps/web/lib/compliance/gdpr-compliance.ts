/**
 * GDPR Compliance Utilities
 * Implements GDPR requirements: data retention, right to deletion, data export
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface DataRetentionPolicy {
  dataType: string;
  retentionDays: number;
  description: string;
}

export interface UserDataExport {
  userId: string;
  exportDate: string;
  data: {
    profile: any;
    orders: any[];
    analytics: any;
    communications: any[];
    preferences: any;
  };
}

/**
 * GDPR Data Retention Policies
 */
export const DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
  {
    dataType: 'user_profile',
    retentionDays: 2555, // 7 years
    description: 'User profile information',
  },
  {
    dataType: 'order_data',
    retentionDays: 2555, // 7 years (for tax/legal reasons)
    description: 'Order history and transactions',
  },
  {
    dataType: 'invoice_data',
    retentionDays: 2555, // 7 years (for tax/legal reasons)
    description: 'Invoice records',
  },
  {
    dataType: 'analytics_data',
    retentionDays: 365, // 1 year
    description: 'User behavior analytics',
  },
  {
    dataType: 'email_logs',
    retentionDays: 90, // 3 months
    description: 'Email communication logs',
  },
  {
    dataType: 'audit_logs',
    retentionDays: 365, // 1 year
    description: 'System audit logs',
  },
  {
    dataType: 'ai_usage_logs',
    retentionDays: 90, // 3 months
    description: 'AI API usage logs',
  },
  {
    dataType: 'temporary_data',
    retentionDays: 30, // 30 days
    description: 'Temporary session and cache data',
  },
];

/**
 * Export user data for GDPR data subject access request
 */
export async function exportUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<UserDataExport> {
  const [profile, orders, analytics, communications, preferences] = await Promise.all([
    // Get user profile
    supabase.from('organizations').select('*').eq('id', userId).single(),

    // Get orders
    supabase.from('orders').select('*').eq('organization_id', userId),

    // Get analytics
    supabase
      .from('customer_purchase_analytics')
      .select('*')
      .eq('customer_id', userId)
      .single(),

    // Get communications
    supabase
      .from('campaign_recipients')
      .select('*')
      .eq('customer_id', userId),

    // Get preferences
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ]);

  return {
    userId,
    exportDate: new Date().toISOString(),
    data: {
      profile: profile.data,
      orders: orders.data || [],
      analytics: analytics.data,
      communications: communications.data || [],
      preferences: preferences.data,
    },
  };
}

/**
 * Delete user data (right to be forgotten)
 */
export async function deleteUserData(
  supabase: SupabaseClient,
  userId: string,
  options?: { keepOrdersForTax?: boolean }
): Promise<{ success: boolean; deletedRecords: number }> {
  let deletedRecords = 0;

  try {
    // Delete user profile
    const { count: profileCount } = await supabase
      .from('organizations')
      .delete()
      .eq('id', userId);
    deletedRecords += profileCount || 0;

    // Delete analytics
    const { count: analyticsCount } = await supabase
      .from('customer_purchase_analytics')
      .delete()
      .eq('customer_id', userId);
    deletedRecords += analyticsCount || 0;

    // Delete preferences
    const { count: preferencesCount } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);
    deletedRecords += preferencesCount || 0;

    // Delete communications
    const { count: communicationsCount } = await supabase
      .from('campaign_recipients')
      .delete()
      .eq('customer_id', userId);
    deletedRecords += communicationsCount || 0;

    // Delete orders (unless keeping for tax purposes)
    if (!options?.keepOrdersForTax) {
      const { count: ordersCount } = await supabase
        .from('orders')
        .delete()
        .eq('organization_id', userId);
      deletedRecords += ordersCount || 0;
    }

    // Delete audit logs
    const { count: auditCount } = await supabase
      .from('audit_trail')
      .delete()
      .eq('user_id', userId);
    deletedRecords += auditCount || 0;

    return { success: true, deletedRecords };
  } catch (error) {
    console.error('Error deleting user data:', error);
    return { success: false, deletedRecords };
  }
}

/**
 * Anonymize user data instead of deletion
 */
export async function anonymizeUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; anonymizedRecords: number }> {
  let anonymizedRecords = 0;

  try {
    // Anonymize profile
    const { count: profileCount } = await supabase
      .from('organizations')
      .update({
        name: 'Anonymized User',
        email: `anonymized-${userId}@example.com`,
        phone: null,
        address: null,
      })
      .eq('id', userId);
    anonymizedRecords += profileCount || 0;

    // Anonymize analytics
    const { count: analyticsCount } = await supabase
      .from('customer_purchase_analytics')
      .update({
        customer_name: 'Anonymized',
      })
      .eq('customer_id', userId);
    anonymizedRecords += analyticsCount || 0;

    return { success: true, anonymizedRecords };
  } catch (error) {
    console.error('Error anonymizing user data:', error);
    return { success: false, anonymizedRecords };
  }
}

/**
 * Clean up expired data based on retention policies
 */
export async function cleanupExpiredData(supabase: SupabaseClient): Promise<{
  success: boolean;
  deletedRecords: number;
  policies: string[];
}> {
  let deletedRecords = 0;
  const policies: string[] = [];

  try {
    for (const policy of DATA_RETENTION_POLICIES) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - policy.retentionDays);

      let count = 0;

      switch (policy.dataType) {
        case 'email_logs':
          const { count: emailCount } = await supabase
            .from('email_logs')
            .delete()
            .lt('created_at', expirationDate.toISOString());
          count = emailCount || 0;
          break;

        case 'ai_usage_logs':
          const { count: aiCount } = await supabase
            .from('ai_usage_logs')
            .delete()
            .lt('created_at', expirationDate.toISOString());
          count = aiCount || 0;
          break;

        case 'audit_logs':
          const { count: auditCount } = await supabase
            .from('audit_trail')
            .delete()
            .lt('created_at', expirationDate.toISOString());
          count = auditCount || 0;
          break;

        case 'analytics_data':
          const { count: analyticsCount } = await supabase
            .from('customer_purchase_analytics')
            .delete()
            .lt('updated_at', expirationDate.toISOString());
          count = analyticsCount || 0;
          break;
      }

      if (count > 0) {
        deletedRecords += count;
        policies.push(`${policy.dataType}: ${count} records deleted`);
      }
    }

    return { success: true, deletedRecords, policies };
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
    return { success: false, deletedRecords, policies };
  }
}

/**
 * Get data processing activities for privacy policy
 */
export function getDataProcessingActivities(): Array<{
  activity: string;
  purpose: string;
  legalBasis: string;
  retention: string;
}> {
  return [
    {
      activity: 'User Registration',
      purpose: 'Account creation and authentication',
      legalBasis: 'Consent',
      retention: '7 years or until account deletion',
    },
    {
      activity: 'Order Processing',
      purpose: 'Process customer orders and payments',
      legalBasis: 'Contract',
      retention: '7 years (tax/legal requirement)',
    },
    {
      activity: 'Analytics',
      purpose: 'Understand user behavior and improve service',
      legalBasis: 'Legitimate Interest',
      retention: '1 year',
    },
    {
      activity: 'Email Communications',
      purpose: 'Send transactional and marketing emails',
      legalBasis: 'Consent',
      retention: '90 days',
    },
    {
      activity: 'AI Insights',
      purpose: 'Generate personalized recommendations',
      legalBasis: 'Consent',
      retention: '90 days',
    },
    {
      activity: 'Audit Logging',
      purpose: 'Security and compliance monitoring',
      legalBasis: 'Legal Obligation',
      retention: '1 year',
    },
  ];
}

/**
 * Verify GDPR compliance
 */
export async function verifyGDPRCompliance(supabase: SupabaseClient): Promise<{
  compliant: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check if data retention policies are implemented
    const { data: policies } = await supabase
      .from('data_retention_policies')
      .select('*');

    if (!policies || policies.length === 0) {
      issues.push('No data retention policies configured');
      recommendations.push('Implement data retention policies');
    }

    // Check if audit logging is enabled
    const { data: auditLogs } = await supabase
      .from('audit_trail')
      .select('*')
      .limit(1);

    if (!auditLogs || auditLogs.length === 0) {
      recommendations.push('Enable audit logging for compliance tracking');
    }

    // Check if privacy policy is published
    // This would require checking your website/documentation

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error('Error verifying GDPR compliance:', error);
    return {
      compliant: false,
      issues: ['Error verifying compliance'],
      recommendations: ['Review compliance manually'],
    };
  }
}

