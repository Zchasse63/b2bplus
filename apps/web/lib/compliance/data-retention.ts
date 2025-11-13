/**
 * Data Retention Policies
 * Manages data retention and automated deletion
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface RetentionPolicy {
  id: string;
  dataType: string;
  table: string;
  retentionDays: number;
  description: string;
  enabled: boolean;
  deleteColumn: string; // Column to check for deletion (e.g., 'created_at', 'updated_at')
}

/**
 * Default retention policies
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'user_profile',
    dataType: 'User Profile',
    table: 'organizations',
    retentionDays: 2555, // 7 years
    description: 'User profile information',
    enabled: true,
    deleteColumn: 'created_at',
  },
  {
    id: 'order_data',
    dataType: 'Order Data',
    table: 'orders',
    retentionDays: 2555, // 7 years (tax/legal requirement)
    description: 'Order history and transactions',
    enabled: true,
    deleteColumn: 'created_at',
  },
  {
    id: 'invoice_data',
    dataType: 'Invoice Data',
    table: 'invoices',
    retentionDays: 2555, // 7 years (tax/legal requirement)
    description: 'Invoice records',
    enabled: true,
    deleteColumn: 'created_at',
  },
  {
    id: 'email_logs',
    dataType: 'Email Logs',
    table: 'email_logs',
    retentionDays: 90, // 3 months
    description: 'Email communication logs',
    enabled: true,
    deleteColumn: 'created_at',
  },
  {
    id: 'ai_usage_logs',
    dataType: 'AI Usage Logs',
    table: 'ai_usage_logs',
    retentionDays: 90, // 3 months
    description: 'AI API usage logs',
    enabled: true,
    deleteColumn: 'created_at',
  },
  {
    id: 'audit_logs',
    dataType: 'Audit Logs',
    table: 'audit_trail',
    retentionDays: 365, // 1 year
    description: 'System audit logs',
    enabled: true,
    deleteColumn: 'timestamp',
  },
  {
    id: 'analytics_data',
    dataType: 'Analytics Data',
    table: 'customer_purchase_analytics',
    retentionDays: 365, // 1 year
    description: 'User behavior analytics',
    enabled: true,
    deleteColumn: 'updated_at',
  },
  {
    id: 'session_data',
    dataType: 'Session Data',
    table: 'sessions',
    retentionDays: 30, // 30 days
    description: 'User session data',
    enabled: true,
    deleteColumn: 'created_at',
  },
];

/**
 * Data Retention Manager
 */
export class DataRetentionManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all retention policies
   */
  async getPolicies(): Promise<RetentionPolicy[]> {
    const { data, error } = await this.supabase
      .from('data_retention_policies')
      .select('*');

    if (error) {
      console.error('Failed to fetch retention policies:', error);
      return DEFAULT_RETENTION_POLICIES;
    }

    return data || DEFAULT_RETENTION_POLICIES;
  }

  /**
   * Create or update retention policy
   */
  async upsertPolicy(policy: RetentionPolicy): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase
        .from('data_retention_policies')
        .upsert([
          {
            id: policy.id,
            data_type: policy.dataType,
            table_name: policy.table,
            retention_days: policy.retentionDays,
            description: policy.description,
            enabled: policy.enabled,
            delete_column: policy.deleteColumn,
          },
        ]);

      if (error) {
        console.error('Failed to upsert retention policy:', error);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error('Error upserting retention policy:', error);
      return { success: false };
    }
  }

  /**
   * Delete expired data based on retention policies
   */
  async deleteExpiredData(): Promise<{
    success: boolean;
    deletedRecords: number;
    policies: Array<{ policy: string; deleted: number }>;
  }> {
    const policies = await this.getPolicies();
    let totalDeleted = 0;
    const results: Array<{ policy: string; deleted: number }> = [];

    for (const policy of policies) {
      if (!policy.enabled) continue;

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - policy.retentionDays);

      try {
        // Use RPC function for deletion to ensure proper handling
        const { data, error } = await this.supabase.rpc('delete_expired_data', {
          table_name: policy.table,
          delete_column: policy.deleteColumn,
          expiration_date: expirationDate.toISOString(),
        });

        if (error) {
          console.error(`Failed to delete expired data from ${policy.table}:`, error);
          continue;
        }

        const deleted = data?.deleted_count || 0;
        totalDeleted += deleted;
        results.push({ policy: policy.dataType, deleted });
      } catch (error) {
        console.error(`Error deleting expired data from ${policy.table}:`, error);
      }
    }

    return {
      success: true,
      deletedRecords: totalDeleted,
      policies: results,
    };
  }

  /**
   * Get data retention report
   */
  async getRetentionReport(): Promise<{
    policies: Array<{
      policy: string;
      table: string;
      retentionDays: number;
      recordCount: number;
      oldestRecord: string | null;
      newestRecord: string | null;
      expiringRecords: number;
    }>;
  }> {
    const policies = await this.getPolicies();
    const report: any[] = [];

    for (const policy of policies) {
      try {
        // Get record count
        const { count } = await this.supabase
          .from(policy.table)
          .select('*', { count: 'exact', head: true });

        // Get oldest and newest records
        const { data: oldest } = await this.supabase
          .from(policy.table)
          .select(policy.deleteColumn)
          .order(policy.deleteColumn, { ascending: true })
          .limit(1);

        const { data: newest } = await this.supabase
          .from(policy.table)
          .select(policy.deleteColumn)
          .order(policy.deleteColumn, { ascending: false })
          .limit(1);

        // Count expiring records
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() - policy.retentionDays);

        const { count: expiringCount } = await this.supabase
          .from(policy.table)
          .select('*', { count: 'exact', head: true })
          .lt(policy.deleteColumn, expirationDate.toISOString());

        report.push({
          policy: policy.dataType,
          table: policy.table,
          retentionDays: policy.retentionDays,
          recordCount: count || 0,
          oldestRecord: oldest?.[0]?.[policy.deleteColumn as keyof typeof oldest[0]] || null,
          newestRecord: newest?.[0]?.[policy.deleteColumn as keyof typeof newest[0]] || null,
          expiringRecords: expiringCount || 0,
        });
      } catch (error) {
        console.error(`Error generating report for ${policy.table}:`, error);
      }
    }

    return { policies: report };
  }

  /**
   * Schedule automatic data retention cleanup
   * Should be called from a cron job or scheduled task
   */
  async scheduleCleanup(intervalMinutes: number = 1440): Promise<void> {
    // This would typically be called from a cron job
    // For example, using a service like Vercel Cron or AWS Lambda
    console.log(`Data retention cleanup scheduled every ${intervalMinutes} minutes`);

    // Run cleanup immediately
    const result = await this.deleteExpiredData();
    console.log('Data retention cleanup result:', result);
  }

  /**
   * Get retention policy for data type
   */
  async getPolicyForDataType(dataType: string): Promise<RetentionPolicy | null> {
    const policies = await this.getPolicies();
    return policies.find(p => p.dataType === dataType) || null;
  }

  /**
   * Check if data is expired
   */
  async isDataExpired(
    table: string,
    recordId: string,
    deleteColumn: string
  ): Promise<boolean> {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.table === table);
    if (!policy) return false;

    const { data, error } = await this.supabase
      .from(table)
      .select(deleteColumn)
      .eq('id', recordId)
      .single();

    if (error || !data) return false;

    const recordDate = new Date((data as any)[deleteColumn]);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - policy.retentionDays);

    return recordDate < expirationDate;
  }

  /**
   * Get days until expiration
   */
  async getDaysUntilExpiration(
    table: string,
    recordId: string,
    deleteColumn: string
  ): Promise<number | null> {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.table === table);
    if (!policy) return null;

    const { data, error } = await this.supabase
      .from(table)
      .select(deleteColumn)
      .eq('id', recordId)
      .single();

    if (error || !data) return null;

    const recordDate = new Date((data as any)[deleteColumn]);
    const expirationDate = new Date(recordDate);
    expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, daysUntilExpiration);
  }
}

/**
 * Create data retention manager instance
 */
export function createDataRetentionManager(supabase: SupabaseClient): DataRetentionManager {
  return new DataRetentionManager(supabase);
}

