import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OpportunityCard } from '@/components/admin/OpportunityCard';

interface Opportunity {
  id: string;
  opportunity_type: string;
  potential_revenue: number;
  confidence_score: number;
  ai_reasoning: string;
  status: string;
  created_at: string;
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
  };
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; search?: string };
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

  // Build query
  let query = supabase
    .from('customer_opportunities')
    .select(
      `
      *,
      product:products!customer_opportunities_product_id_fkey(
        id,
        name
      )
    `
    )
    .order('opportunity_score', { ascending: false });

  // Apply filters
  if (searchParams.type && searchParams.type !== 'all') {
    query = query.eq('opportunity_type', searchParams.type);
  }

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }

  const { data: opportunities, error } = await query;

  if (error) {
    console.error('Error fetching opportunities:', error);
  }

  // Filter by search if provided
  let filteredOpportunities = opportunities || [];
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase();
    filteredOpportunities = filteredOpportunities.filter(
      (opp) =>
        opp.product?.name?.toLowerCase().includes(searchLower) ||
        opp.reason?.toLowerCase().includes(searchLower)
    );
  }

  // Calculate summary stats
  const totalOpportunities = filteredOpportunities.length;
  const totalPotentialRevenue = filteredOpportunities.reduce(
    (sum, opp) => sum + (opp.predicted_revenue || 0),
    0
  );
  const newOpportunities = filteredOpportunities.filter(
    (opp) => opp.status === 'open'
  ).length;
  const avgConfidence =
    filteredOpportunities.length > 0
      ? filteredOpportunities.reduce(
          (sum, opp) => sum + (opp.opportunity_score || 0),
          0
        ) / filteredOpportunities.length
      : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-b2b-dark">Sales Opportunities</h1>
        <p className="text-b2b-gray-500 mt-2">
          AI-detected opportunities to increase revenue and customer engagement
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Total Opportunities</div>
          <div className="text-2xl font-bold text-b2b-dark mt-1">
            {totalOpportunities}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Potential Revenue</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            ${totalPotentialRevenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">New Opportunities</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {newOpportunities}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-b2b p-4 border border-b2b-gray-100">
          <div className="text-sm text-b2b-gray-500">Avg Confidence</div>
          <div className="text-2xl font-bold text-b2b-dark mt-1">
            {Math.round(avgConfidence * 100)}%
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
              name="type"
              defaultValue={searchParams.type || 'all'}
              className="border border-b2b-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
            >
              <option value="all">All Types</option>
              <option value="stopped_buying">Stopped Purchases</option>
              <option value="cross_sell">Cross-Sell</option>
              <option value="upsell">Upsell</option>
              <option value="new_product">New Product</option>
            </select>
          </div>
          <div>
            <select
              name="status"
              defaultValue={searchParams.status || 'all'}
              className="border border-b2b-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
            >
              <option value="all">All Statuses</option>
              <option value="open">New</option>
              <option value="contacted">In Progress</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="ignored">Dismissed</option>
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

      {/* Opportunities Grid */}
      {filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-b2b p-12 text-center border border-b2b-gray-100">
          <div className="text-b2b-gray-400 text-lg">
            No opportunities found matching your criteria
          </div>
          <p className="text-b2b-gray-500 mt-2">
            Try adjusting your filters or check back later for new AI-detected opportunities
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </div>
  );
}

