'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, Button, Select } from '@/components/b2b';
import { FiDollarSign, FiTrendingUp, FiRefreshCw, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';
import { EmbeddedAIAssistantPanel } from '@/components/EmbeddedAIAssistantPanel';


interface PricingRecommendation {
  customer_id: string;
  product_id: string;
  current_price: number;
  recommended_price: number;
  win_probability: number;
  expected_revenue: number;
  ai_reasoning: string;
  customer?: {
    full_name: string;
    email: string;
  };
  product?: {
    name: string;
    sku: string;
  };
}

export default function PricingRecommendationsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<PricingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'probability' | 'revenue' | 'discount'>('probability');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadRecommendations();
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    filterAndSortRecommendations();
  }, [recommendations, searchQuery, sortBy, filterBy]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from a pricing_recommendations table
      // For now, we'll generate them on demand
      setRecommendations([]);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRecommendations = () => {
    let filtered = [...recommendations];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.customer?.full_name?.toLowerCase().includes(query) ||
        rec.customer?.email?.toLowerCase().includes(query) ||
        rec.product?.name?.toLowerCase().includes(query) ||
        rec.product?.sku?.toLowerCase().includes(query)
      );
    }

    // Filter by probability
    if (filterBy !== 'all') {
      filtered = filtered.filter(rec => {
        if (filterBy === 'high') return rec.win_probability >= 70;
        if (filterBy === 'medium') return rec.win_probability >= 40 && rec.win_probability < 70;
        if (filterBy === 'low') return rec.win_probability < 40;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'probability':
          return b.win_probability - a.win_probability;
        case 'revenue':
          return b.expected_revenue - a.expected_revenue;
        case 'discount':
          const aDiscount = ((a.current_price - a.recommended_price) / a.current_price) * 100;
          const bDiscount = ((b.current_price - b.recommended_price) / b.current_price) * 100;
          return bDiscount - aDiscount;
        default:
          return 0;
      }
    });

    setFilteredRecommendations(filtered);
  };

  const generateRecommendations = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/pricing/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to generate recommendations');

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setGenerating(false);
    }
  };

  const approveRecommendation = async (customerId: string, productId: string, newPrice: number) => {
    try {
      const supabase = createClient();
      // Update the customer's custom pricing
      const { error } = await supabase
        .from('customer_pricing')
        .upsert({
          customer_id: customerId,
          product_id: productId,
          custom_price: newPrice,
          approved_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Remove from recommendations
      setRecommendations(prev =>
        prev.filter(r => !(r.customer_id === customerId && r.product_id === productId))
      );
    } catch (error) {
      console.error('Error approving recommendation:', error);
    }
  };

  const rejectRecommendation = (customerId: string, productId: string) => {
    setRecommendations(prev =>
      prev.filter(r => !(r.customer_id === customerId && r.product_id === productId))
    );
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'success';
    if (probability >= 40) return 'warning';
    return 'error';
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-b2b-yellow mx-auto"></div>
          <p className="mt-4 text-b2b-gray-500">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Animation removed for E2E test reliability */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-b2b-dark">AI Pricing Recommendations</h1>
          <p className="mt-1 text-b2b-gray-500">
            AI-optimized pricing suggestions to maximize revenue and win probability
          </p>
        </div>
        <Button
          variant="primary"
          icon={<FiRefreshCw />}
          onClick={generateRecommendations}
          loading={generating}
        >
          Generate Recommendations
        </Button>
      </div>

      {/* Stats Cards */}
      <motion.div {...fadeIn} transition={{ ...fast, delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-b2b-yellow/10 rounded-lg">
              <FiDollarSign className="h-6 w-6 text-b2b-yellow" />
            </div>
            <div>
              <p className="text-sm text-b2b-gray-500">Total Recommendations</p>
              <p className="text-2xl font-bold text-b2b-dark">{recommendations.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiTrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-b2b-gray-500">Potential Revenue</p>
              <p className="text-2xl font-bold text-b2b-dark">
                ${recommendations.reduce((sum, rec) => sum + rec.expected_revenue, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiTrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-b2b-gray-500">Avg Win Probability</p>
              <p className="text-2xl font-bold text-b2b-dark">
                {recommendations.length > 0
                  ? Math.round(recommendations.reduce((sum, rec) => sum + rec.win_probability, 0) / recommendations.length)
                  : 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiDollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-b2b-gray-500">High Confidence</p>
              <p className="text-2xl font-bold text-b2b-dark">
                {recommendations.filter(r => r.win_probability >= 70).length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeIn} transition={{ ...fast, delay: 0.2 }}>
        <Card padding="md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-b2b-gray-500" />
              <input
                type="text"
                placeholder="Search recommendations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
              />
            </div>
            <Select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Probabilities' },
                { value: 'high', label: 'High (70%+)' },
                { value: 'medium', label: 'Medium (40-70%)' },
                { value: 'low', label: 'Low (<40%)' },
              ]}
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { value: 'probability', label: 'Sort by Win Probability' },
                { value: 'revenue', label: 'Sort by Expected Revenue' },
                { value: 'discount', label: 'Sort by Discount %' },
              ]}
            />
          </div>
        </Card>
      </motion.div>
      {/* AI Pricing Advisor */}
      <motion.div {...fadeIn} transition={{ ...fast, delay: 0.25 }}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card padding="md" className="lg:col-span-2">
            <h2 className="text-lg font-bold text-b2b-dark">AI Pricing Advisor</h2>
            <p className="mt-2 text-sm text-b2b-gray-500">
              Use the assistant to sanity-check recommendations and explore custom pricing strategies.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-b2b-gray-500">
              <li>Ask which recommendations to prioritize for this week or month.</li>
              <li>Explore the tradeoffs between margin, win rate, and revenue.</li>
              <li>Have AI draft talking points for customer pricing conversations.</li>
            </ul>
          </Card>
          <div>
            <EmbeddedAIAssistantPanel mode="admin" />
          </div>
        </div>
      </motion.div>


      {/* Recommendations Table */}
      <motion.div {...fadeIn} transition={{ ...fast, delay: 0.3 }}>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-b2b-gray-50 border-b border-b2b-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Recommended Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Win Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Expected Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    AI Reasoning
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-b2b-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-b2b-gray-200">
                {filteredRecommendations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-b2b-gray-500">
                      {searchQuery || filterBy !== 'all'
                        ? 'No recommendations match your filters'
                        : 'No recommendations yet. Click "Generate Recommendations" to analyze pricing opportunities.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecommendations.map((rec, index) => {
                    const discount = ((rec.current_price - rec.recommended_price) / rec.current_price) * 100;
                    return (
                      <tr key={`${rec.customer_id}-${rec.product_id}-${index}`} className="hover:bg-b2b-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-b2b-dark">
                              {rec.customer?.full_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-b2b-gray-500">
                              {rec.customer?.email || ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-b2b-dark">
                              {rec.product?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-b2b-gray-500">
                              {rec.product?.sku || ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-b2b-dark">
                          ${rec.current_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-b2b-dark">
                              ${rec.recommended_price.toFixed(2)}
                            </div>
                            <div className={`text-xs ${discount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {discount > 0 ? '-' : '+'}{Math.abs(discount).toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={getProbabilityColor(rec.win_probability) as any}>
                              {rec.win_probability}%
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ${rec.expected_revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-b2b-gray-500 max-w-md truncate">
                            {rec.ai_reasoning}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<FiCheck />}
                              onClick={() => approveRecommendation(rec.customer_id, rec.product_id, rec.recommended_price)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<FiX />}
                              onClick={() => rejectRecommendation(rec.customer_id, rec.product_id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

