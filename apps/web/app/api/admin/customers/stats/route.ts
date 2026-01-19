import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, DatabaseError } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

/**
 * Get customer statistics in bulk (optimized to avoid N+1 queries)
 * GET /api/admin/customers/stats
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Get all organizations with their order stats in a single optimized query
    const { data: stats, error: statsError } = await supabase
      .rpc('get_customer_stats');

    if (statsError) {
      // Fallback to manual aggregation if RPC doesn't exist yet
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, type, phone, website, created_at')
        .order('created_at', { ascending: false });

      if (orgsError) {
        throw DatabaseError.queryFailed('organizations', 'fetch');
      }

      // Get order stats for all organizations in one query
      const { data: orderStats, error: orderStatsError } = await supabase
        .from('orders')
        .select('organization_id, total')
        .neq('status', 'cancelled');

      if (orderStatsError) {
        // Log but don't fail - just return orgs without stats
      }

      // Aggregate stats by organization
      const statsMap = new Map<string, { total_orders: number; total_spent: number }>();

      if (orderStats) {
        orderStats.forEach(order => {
          const existing = statsMap.get(order.organization_id) || { total_orders: 0, total_spent: 0 };
          statsMap.set(order.organization_id, {
            total_orders: existing.total_orders + 1,
            total_spent: existing.total_spent + parseFloat(order.total || '0')
          });
        });
      }

      // Combine org data with stats
      const customersWithStats = orgs.map(org => ({
        ...org,
        total_orders: statsMap.get(org.id)?.total_orders || 0,
        total_spent: statsMap.get(org.id)?.total_spent || 0
      }));

      return NextResponse.json({
        success: true,
        customers: customersWithStats
      });
    }

    return NextResponse.json({
      success: true,
      customers: stats
    });
  } catch (error) {
    return handleError(error);
  }
}
