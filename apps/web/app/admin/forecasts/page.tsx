import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ForecastChart } from '@/components/admin/ForecastChart';
import { InventoryRecommendations } from '@/components/admin/InventoryRecommendations';
import { EmbeddedAIAssistantPanel } from '@/components/EmbeddedAIAssistantPanel';


interface Forecast {
  id: string;
  customer_id: string;
  product_id: string;
  forecast_period: string;
  predicted_quantity: number;
  predicted_revenue: number;
  confidence_level: number;
  forecast_date: string;
  actual_quantity: number | null;
  accuracy_score: number | null;
  customer: {
    id: string;
    email: string;
    organization: {
      name: string;
    };
  };
  product: {
    id: string;
    name: string;
    stock_quantity: number;
  };
}

export default async function ForecastsPage({
  searchParams,
}: {
  searchParams: { period?: string; search?: string };
}) {
  const supabase = await createClient();

  // Check authentication and admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }

  // Determine date range based on period
  const period = searchParams.period || '30';
  const daysAhead = parseInt(period);
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  // Build query
  let query = supabase
    .from('product_usage_forecasts')
    .select(
      `
      *,
      customer:profiles!customer_id(
        id,
        email,
        organization:organizations!inner(name)
      ),
      product:products!product_id(
        id,
        name,
        stock_quantity
      )
    `
    )
    .gte('forecast_date', startDate.toISOString())
    .lte('forecast_date', endDate.toISOString())
    .order('forecast_date', { ascending: true });

  const { data: forecasts, error } = await query;

  if (error) {
    console.error('Error fetching forecasts:', error);
  }

  // Filter by search if provided
  let filteredForecasts = forecasts || [];
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase();
    filteredForecasts = filteredForecasts.filter(
      (forecast) =>
        forecast.customer?.organization?.name?.toLowerCase().includes(searchLower) ||
        forecast.product?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Calculate summary stats
  const totalForecasts = filteredForecasts.length;
  const totalPredictedRevenue = filteredForecasts.reduce(
    (sum, f) => sum + (f.predicted_revenue || 0),
    0
  );
  const totalPredictedQuantity = filteredForecasts.reduce(
    (sum, f) => sum + (f.predicted_quantity || 0),
    0
  );

  // Calculate average accuracy for forecasts that have actual data
  const forecastsWithActuals = filteredForecasts.filter(f => f.accuracy_score !== null);
  const avgAccuracy = forecastsWithActuals.length > 0
    ? forecastsWithActuals.reduce((sum, f) => sum + (f.accuracy_score || 0), 0) / forecastsWithActuals.length
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-b2b-dark">Usage Forecasts</h1>
        <p className="text-b2b-gray-500 mt-2">
          AI-powered predictions for inventory planning and demand forecasting
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Total Forecasts</div>
          <div className="text-2xl font-bold text-b2b-dark mt-1">
            {totalForecasts}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Predicted Revenue</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            ${totalPredictedRevenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Predicted Units</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {Math.round(totalPredictedQuantity).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Avg Accuracy</div>
          <div className="text-2xl font-bold text-b2b-dark mt-1">
            {forecastsWithActuals.length > 0 ? `${Math.round(avgAccuracy * 100)}%` : 'N/A'}
          </div>
          <div className="text-xs text-b2b-gray-400 mt-1">
            {forecastsWithActuals.length} verified
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-b2b p-4 mb-6 border border-b2b-gray-100">
        <form className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              name="search"
              placeholder="Search by customer or product..."
              defaultValue={searchParams.search}
              className="w-full border border-b2b-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
            />
          </div>
          <div>
            <select
              name="period"
              defaultValue={searchParams.period || '30'}
              className="border border-b2b-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
            >
              <option value="30">Next 30 Days</option>
              <option value="90">Next 90 Days</option>
              <option value="365">Next Year</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-b2b-yellow text-b2b-dark px-6 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Forecast Chart */}
      {filteredForecasts.length > 0 && (
        <div className="mb-6">
          <ForecastChart forecasts={filteredForecasts} />
        </div>
      )}

      {/* Inventory Recommendations */}
      {filteredForecasts.length > 0 && (
        <div className="mb-6">
          <InventoryRecommendations forecasts={filteredForecasts} />
        </div>
      )}
      {/* AI Forecast Advisor */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-b2b-dark">AI Forecast Advisor</h2>
          <p className="mt-2 text-sm text-b2b-gray-500">
            Use the assistant to turn forecast data into concrete inventory and purchasing actions.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-b2b-gray-500">
            <li>Ask which products are most at risk of stockouts.</li>
            <li>Get reorder suggestions based on demand and current stock.</li>
            <li>Explore what-if scenarios for key customers or SKUs.</li>
          </ul>
        </div>
        <div>
          <EmbeddedAIAssistantPanel mode="admin" />
        </div>
      </div>


      {/* Forecasts Table */}
      <div className="bg-white rounded-lg shadow-b2b border border-b2b-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-b2b-gray-100">
          <h2 className="text-lg font-bold text-b2b-dark">Detailed Forecasts</h2>
        </div>
        {filteredForecasts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-b2b-gray-400 text-lg">
              No forecasts found for the selected period
            </div>
            <p className="text-b2b-gray-500 mt-2">
              Try adjusting your filters or check back later for new AI-generated forecasts
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-b2b-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Predicted Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Predicted Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-b2b-gray-100">
                {filteredForecasts.map((forecast) => (
                  <tr key={forecast.id} className="hover:bg-b2b-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-b2b-dark">
                      {forecast.customer?.organization?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-b2b-dark">
                      {forecast.product?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-b2b-gray-500">
                      {forecast.forecast_period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-b2b-dark font-medium">
                      {Math.round(forecast.predicted_quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      ${forecast.predicted_revenue?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="text-b2b-dark font-medium">
                        {Math.round((forecast.confidence_level || 0) * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {forecast.accuracy_score !== null ? (
                        <span className="text-b2b-dark font-medium">
                          {Math.round(forecast.accuracy_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-b2b-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

