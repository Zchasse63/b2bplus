/**
 * Campaign Management AI Tools (Admin Only)
 *
 * Tools for AI-assisted marketing campaigns and promotions.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const campaignTools = {
  // ─────────────────────────────────────────────────────────────────
  // READ TOOLS
  // ─────────────────────────────────────────────────────────────────

  listCampaigns: tool({
    description: 'List all marketing campaigns',
    parameters: z.object({
      status: z.enum(['all', 'draft', 'active', 'paused', 'completed']).default('all'),
      type: z.enum(['all', 'email', 'promo', 'banner']).optional(),
    }),
    execute: async ({ status, type }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      const { data: campaigns, error } = await query;

      if (error) throw new Error(`Failed to list campaigns: ${error.message}`);

      return {
        campaigns: campaigns || [],
        count: campaigns?.length || 0,
      };
    },
  }),

  getCampaignDetails: tool({
    description: 'Get detailed campaign information and metrics',
    parameters: z.object({
      campaignId: z.string(),
    }),
    execute: async ({ campaignId }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw new Error(`Campaign not found: ${error.message}`);

      // Get campaign metrics
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      return {
        campaign,
        metrics: metrics || {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        },
      };
    },
  }),

  getCampaignPerformance: tool({
    description: 'Get performance analytics for campaigns',
    parameters: z.object({
      campaignId: z.string().optional(),
      dateRange: z.object({
        start: z.string(),
        end: z.string(),
      }).optional(),
    }),
    execute: async ({ campaignId, dateRange }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      let query = supabase
        .from('campaign_metrics')
        .select(`
          *,
          campaign:campaigns(id, name, type, status)
        `);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data: metrics, error } = await query;

      if (error) throw new Error(`Failed to get metrics: ${error.message}`);

      // Calculate aggregates
      const totals = metrics?.reduce((acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        revenue: acc.revenue + (m.revenue || 0),
      }), { impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

      const ctr = totals?.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
      const conversionRate = totals?.clicks ? (totals.conversions / totals.clicks) * 100 : 0;

      return {
        campaigns: metrics?.map(m => ({
          campaignId: m.campaign_id,
          campaignName: (m.campaign as any)?.name,
          campaignType: (m.campaign as any)?.type,
          impressions: m.impressions,
          clicks: m.clicks,
          conversions: m.conversions,
          revenue: m.revenue,
          ctr: m.impressions ? Math.round((m.clicks / m.impressions) * 1000) / 10 : 0,
        })) || [],
        totals: {
          ...totals,
          ctr: Math.round(ctr * 10) / 10,
          conversionRate: Math.round(conversionRate * 10) / 10,
        },
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // PROMO CODE TOOLS
  // ─────────────────────────────────────────────────────────────────

  listPromoCodes: tool({
    description: 'List all promotional codes',
    parameters: z.object({
      activeOnly: z.boolean().default(true),
    }),
    execute: async ({ activeOnly }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      let query = supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: promoCodes, error } = await query;

      if (error) throw new Error(`Failed to list promo codes: ${error.message}`);

      return {
        promoCodes: promoCodes?.map(p => ({
          id: p.id,
          code: p.code,
          discount: p.discount_percent
            ? `${p.discount_percent}%`
            : `$${p.discount_amount}`,
          isActive: p.is_active,
          expiresAt: p.expires_at,
          usageCount: p.usage_count,
          usageLimit: p.usage_limit,
        })) || [],
      };
    },
  }),

  createPromoCode: tool({
    description: 'Create a new promotional code',
    parameters: z.object({
      code: z.string().min(3).max(20),
      discountPercent: z.number().min(1).max(100).optional(),
      discountAmount: z.number().positive().optional(),
      expiresAt: z.string().optional().describe('ISO date'),
      usageLimit: z.number().positive().optional(),
      minOrderValue: z.number().positive().optional(),
    }),
    execute: async ({ code, discountPercent, discountAmount, expiresAt, usageLimit, minOrderValue }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      if (!discountPercent && !discountAmount) {
        throw new Error('Either discountPercent or discountAmount is required');
      }

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .insert({
          code: code.toUpperCase(),
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          expires_at: expiresAt,
          usage_limit: usageLimit,
          min_order_value: minOrderValue,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create promo code: ${error.message}`);

      return {
        success: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discount: discountPercent ? `${discountPercent}%` : `$${discountAmount}`,
        },
      };
    },
  }),

  updatePromoCode: tool({
    description: 'Update or deactivate a promo code',
    parameters: z.object({
      promoCodeId: z.string(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().optional(),
      usageLimit: z.number().optional(),
    }),
    execute: async ({ promoCodeId, isActive, expiresAt, usageLimit }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const updates: Record<string, any> = {};
      if (isActive !== undefined) updates.is_active = isActive;
      if (expiresAt) updates.expires_at = expiresAt;
      if (usageLimit) updates.usage_limit = usageLimit;

      const { error } = await supabase
        .from('promo_codes')
        .update(updates)
        .eq('id', promoCodeId);

      if (error) throw new Error(`Failed to update promo code: ${error.message}`);

      return { success: true, promoCodeId, updates };
    },
  }),

  // ─────────────────────────────────────────────────────────────────
  // WRITE TOOLS
  // ─────────────────────────────────────────────────────────────────

  createCampaign: tool({
    description: 'Create a new marketing campaign',
    parameters: z.object({
      name: z.string(),
      type: z.enum(['email', 'promo', 'banner']),
      description: z.string().optional(),
      startDate: z.string().describe('ISO date'),
      endDate: z.string().optional().describe('ISO date'),
      targetAudience: z.object({
        segment: z.enum(['all', 'new', 'returning', 'high_value', 'at_risk']).optional(),
        regions: z.array(z.string()).optional(),
      }).optional(),
    }),
    execute: async ({ name, type, description, startDate, endDate, targetAudience }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          name,
          type,
          description,
          start_date: startDate,
          end_date: endDate,
          target_audience: targetAudience,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create campaign: ${error.message}`);

      return {
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
        },
      };
    },
  }),

  updateCampaignStatus: tool({
    description: 'Update campaign status (activate, pause, or complete)',
    parameters: z.object({
      campaignId: z.string(),
      status: z.enum(['active', 'paused', 'completed']),
    }),
    execute: async ({ campaignId, status }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId);

      if (error) throw new Error(`Failed to update campaign: ${error.message}`);

      return { success: true, campaignId, newStatus: status };
    },
  }),

  sendCampaignEmail: tool({
    description: 'Send campaign email to target audience',
    parameters: z.object({
      campaignId: z.string(),
      subject: z.string(),
      content: z.string().describe('HTML email content'),
      testMode: z.boolean().default(false).describe('If true, only sends to admin'),
    }),
    execute: async ({ campaignId, subject, content, testMode }) => {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get campaign
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!campaign) throw new Error('Campaign not found');

      if (testMode) {
        // Send test email to admin only
        await supabase
          .from('email_queue')
          .insert({
            to_user_id: user.id,
            subject: `[TEST] ${subject}`,
            body: content,
            template: 'campaign',
            campaign_id: campaignId,
          });

        return {
          success: true,
          mode: 'test',
          sentTo: profile.email,
        };
      }

      // Get target audience
      const targetAudience = campaign.target_audience as any;
      let recipientQuery = supabase
        .from('profiles')
        .select('id')
        .eq('role', 'customer');

      // Apply segment filter if specified
      if (targetAudience?.segment && targetAudience.segment !== 'all') {
        // This would need more complex logic based on segment
        // For now, just get all customers
      }

      const { data: recipients } = await recipientQuery;

      // Queue emails for all recipients
      const emailRecords = recipients?.map(r => ({
        to_user_id: r.id,
        subject,
        body: content,
        template: 'campaign',
        campaign_id: campaignId,
      })) || [];

      if (emailRecords.length > 0) {
        await supabase.from('email_queue').insert(emailRecords);
      }

      return {
        success: true,
        mode: 'production',
        recipientCount: emailRecords.length,
        campaignId,
      };
    },
  }),
};

export type CampaignTools = typeof campaignTools;
