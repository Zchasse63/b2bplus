'use client';

import { lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

// Lazy load ProductRecommendations component
const ProductRecommendations = lazy(() =>
  import('@/components/ProductRecommendations').then(mod => ({
    default: mod.ProductRecommendations,
  }))
);

// Loading fallback
function RecommendationsLoadingFallback({ title }: { title?: string }) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
          <Sparkles className="h-5 w-5" />
          {title || 'Recommendations'}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3 animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-md" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface LazyProductRecommendationsProps {
  productId?: string;
  type: 'also_bought' | 'similar' | 'personalized';
  title?: string;
  limit?: number;
}

export function LazyProductRecommendations(props: LazyProductRecommendationsProps) {
  return (
    <Suspense fallback={<RecommendationsLoadingFallback title={props.title} />}>
      <ProductRecommendations {...props} />
    </Suspense>
  );
}
