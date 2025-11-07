/**
 * AI Monitoring Dashboard
 * 
 * Task 4.5: Create monitoring dashboard
 * - Display AI usage metrics
 * - Show performance metrics
 * - Track business metrics
 * - Real-time monitoring
 */

import { createClient } from '@/lib/supabase/server';
import { getAIUsageStats } from '@/lib/metrics/ai-metrics';

export default async function MonitoringPage() {
  const supabase = await createClient();
  
  // Get current user and organization
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Please log in</div>;
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return <div>Admin access required</div>;
  }

  // Get AI usage stats
  const usageStats = await getAIUsageStats(membership.organization_id);

  // Get recent metrics
  const { data: recentMetrics } = await supabase
    .from('ai_usage_metrics')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Get business metrics
  const { data: businessMetrics } = await supabase
    .from('ai_business_metrics')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get performance metrics
  const { data: performanceMetrics } = await supabase
    .from('ai_performance_metrics')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('period_start', { ascending: false })
    .limit(50);

  // Calculate summary stats
  const totalRequests = recentMetrics?.length || 0;
  const avgResponseTime = recentMetrics
    ? recentMetrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalRequests
    : 0;
  const cacheHitRate = recentMetrics
    ? (recentMetrics.filter(m => m.cache_hit).length / totalRequests) * 100
    : 0;
  const errorRate = recentMetrics
    ? (recentMetrics.filter(m => !m.success).length / totalRequests) * 100
    : 0;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Monitoring Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
          <p className="text-3xl font-bold mt-2">{totalRequests}</p>
          <p className="text-xs text-gray-400 mt-1">Last 100 requests</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
          <p className="text-3xl font-bold mt-2">{avgResponseTime.toFixed(0)}ms</p>
          <p className={`text-xs mt-1 ${avgResponseTime < 2000 ? 'text-green-600' : 'text-red-600'}`}>
            Target: &lt;2000ms
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Cache Hit Rate</h3>
          <p className="text-3xl font-bold mt-2">{cacheHitRate.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${cacheHitRate > 50 ? 'text-green-600' : 'text-yellow-600'}`}>
            Target: &gt;50%
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
          <p className="text-3xl font-bold mt-2">{errorRate.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${errorRate < 5 ? 'text-green-600' : 'text-red-600'}`}>
            Target: &lt;5%
          </p>
        </div>
      </div>

      {/* Usage by Type */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Usage by Type</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Requests</th>
                <th className="text-right py-2">Tokens</th>
                <th className="text-right py-2">Avg Time</th>
                <th className="text-right py-2">Cache Hit %</th>
                <th className="text-right py-2">Error %</th>
              </tr>
            </thead>
            <tbody>
              {usageStats.map((stat: any) => (
                <tr key={stat.metric_type} className="border-b">
                  <td className="py-2">{stat.metric_type}</td>
                  <td className="text-right">{stat.total_requests}</td>
                  <td className="text-right">{stat.total_tokens?.toLocaleString() || 'N/A'}</td>
                  <td className="text-right">{parseFloat(stat.avg_response_time_ms).toFixed(0)}ms</td>
                  <td className="text-right">{parseFloat(stat.cache_hit_rate).toFixed(1)}%</td>
                  <td className="text-right">{parseFloat(stat.error_rate).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Business Metrics */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Business Metrics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Value</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {businessMetrics?.slice(0, 10).map((metric: any) => (
                <tr key={metric.id} className="border-b">
                  <td className="py-2">{metric.metric_type}</td>
                  <td className="text-right">
                    {metric.metric_unit === 'dollars' ? '$' : ''}
                    {parseFloat(metric.metric_value).toFixed(2)}
                  </td>
                  <td className="text-right">{metric.metric_unit}</td>
                  <td className="text-right">
                    {new Date(metric.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Performance Trends</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">Value</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Period</th>
                <th className="text-right py-2">Date Range</th>
              </tr>
            </thead>
            <tbody>
              {performanceMetrics?.slice(0, 10).map((metric: any) => (
                <tr key={metric.id} className="border-b">
                  <td className="py-2">{metric.metric_name}</td>
                  <td className="text-right">{parseFloat(metric.metric_value).toFixed(2)}</td>
                  <td className="text-right">{metric.metric_unit}</td>
                  <td className="text-right">{metric.aggregation_period}</td>
                  <td className="text-right text-xs">
                    {new Date(metric.period_start).toLocaleDateString()} - {new Date(metric.period_end).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {recentMetrics?.slice(0, 20).map((metric: any) => (
            <div key={metric.id} className="flex items-center justify-between py-2 border-b">
              <div className="flex-1">
                <span className="font-medium">{metric.metric_type}</span>
                <span className="text-gray-500 text-sm ml-2">{metric.operation}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={metric.cache_hit ? 'text-green-600' : 'text-gray-400'}>
                  {metric.cache_hit ? '⚡ Cached' : '🔄 Fresh'}
                </span>
                <span className="text-gray-600">{metric.response_time_ms}ms</span>
                <span className={metric.success ? 'text-green-600' : 'text-red-600'}>
                  {metric.success ? '✓' : '✗'}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(metric.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

