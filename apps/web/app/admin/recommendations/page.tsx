'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Badge, Button, DataTable } from '@/components/b2b';
import { FiZap, FiRefreshCw, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';

interface RecommendationStats {
  total_recommendations: number;
  also_bought_count: number;
  similar_count: number;
  personalized_count: number;
  avg_score: number;
  last_updated: string;
}

interface TopRecommendation {
  product_name: string;
  product_sku: string;
  recommendation_count: number;
  avg_score: number;
}

export default function AdminRecommendationsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      checkFeatureAndLoadData();
    }
  }, [isAdmin, adminLoading, router]);

  const checkFeatureAndLoadData = async () => {
    try {
      const supabase = createClient();
      
      // Check if recommendations feature is enabled
      const { data: featureFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('feature_name', 'smart_recommendations')
        .single();

      const enabled = featureFlag?.enabled || false;
      setFeatureEnabled(enabled);

      if (!enabled) {
        setLoading(false);
        return;
      }

      // Load recommendation stats
      const { data: recommendations, error } = await supabase
        .from('product_recommendations')
        .select('*');

      if (error) throw error;

      const recs = recommendations || [];
      
      // Calculate stats
      const statsData: RecommendationStats = {
        total_recommendations: recs.length,
        also_bought_count: recs.filter(r => r.recommendation_type === 'also_bought').length,
        similar_count: recs.filter(r => r.recommendation_type === 'similar').length,
        personalized_count: recs.filter(r => r.recommendation_type === 'personalized').length,
        avg_score: recs.length > 0 ? recs.reduce((sum, r) => sum + (r.score || 0), 0) / recs.length : 0,
        last_updated: recs.length > 0 ? recs.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0].updated_at : new Date().toISOString(),
      };

      setStats(statsData);

      // Get top recommended products
      const { data: products } = await supabase
        .from('product_recommendations')
        .select(`
          recommended_product_id,
          score,
          products!product_recommendations_recommended_product_id_fkey (name, sku)
        `);

      if (products) {
        // Group by product and calculate stats
        const productMap = new Map<string, { name: string; sku: string; count: number; totalScore: number }>();
        
        products.forEach((p: any) => {
          const id = p.recommended_product_id;
          const existing = productMap.get(id);
          
          if (existing) {
            existing.count++;
            existing.totalScore += p.score || 0;
          } else {
            productMap.set(id, {
              name: p.products?.name || 'Unknown',
              sku: p.products?.sku || 'N/A',
              count: 1,
              totalScore: p.score || 0,
            });
          }
        });

        const topProds: TopRecommendation[] = Array.from(productMap.values())
          .map(p => ({
            product_name: p.name,
            product_sku: p.sku,
            recommendation_count: p.count,
            avg_score: p.totalScore / p.count,
          }))
          .sort((a, b) => b.recommendation_count - a.recommendation_count)
          .slice(0, 10);

        setTopProducts(topProds);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh recommendations');
      }

      const data = await response.json();
      alert(`Successfully refreshed recommendations! Generated ${data.generated || 0} recommendations.`);
      
      // Reload data
      await checkFeatureAndLoadData();
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      alert('Failed to refresh recommendations');
    } finally {
      setRefreshing(false);
    }
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: TopRecommendation) => (
        <div>
          <div className="font-semibold text-navy-700 dark:text-white">
            {item.product_name}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            SKU: {item.product_sku}
          </div>
        </div>
      ),
    },
    {
      key: 'count',
      header: 'Times Recommended',
      render: (item: TopRecommendation) => (
        <span className="font-semibold text-navy-700 dark:text-white">
          {item.recommendation_count}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Avg Score',
      render: (item: TopRecommendation) => (
        <Badge variant="info">
          {item.avg_score.toFixed(2)}
        </Badge>
      ),
    },
  ];

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // If feature is not enabled, show message
  if (!featureEnabled) {
    return (
      <div className="mt-3">
        <Card className="mb-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
                Product Recommendations
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage AI-powered product recommendations
              </p>
            </div>
            <FiZap className="h-12 w-12 text-b2b-yellow" />
          </div>
        </Card>

        <Card className="p-12 text-center">
          <FiZap className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Recommendations Disabled
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This feature is currently disabled. Contact a super administrator to enable smart recommendations.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Product Recommendations
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage AI-powered product recommendations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<FiRefreshCw />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              Refresh All
            </Button>
            <FiZap className="h-12 w-12 text-b2b-yellow" />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Recommendations</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                {stats?.total_recommendations || 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FiZap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Also Bought</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                {stats?.also_bought_count || 0}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiTrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Similar Products</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                {stats?.similar_count || 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <FiZap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
              <p className="mt-1 text-2xl font-bold text-navy-700 dark:text-white">
                {stats?.avg_score.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <FiUsers className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Recommended Products */}
      <Card className="mb-5 p-6">
        <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
          Top Recommended Products
        </h2>
        {topProducts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No recommendations yet. Click &quot;Refresh All&quot; to generate recommendations.
            </p>
          </div>
        ) : (
          <DataTable data={topProducts} columns={columns} />
        )}
      </Card>
    </div>
  );
}

