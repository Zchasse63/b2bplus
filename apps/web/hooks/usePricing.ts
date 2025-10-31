import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PricingResult {
  unit_price: number;
  line_total: number;
  base_price: number;
  discount_amount: number;
  discount_percentage: number;
  pricing_source: 'base' | 'tier' | 'volume' | 'promotional' | 'contract' | 'customer' | 'price_lock';
  pricing_details?: any;
}

interface UsePricingOptions {
  productId: string;
  quantity: number;
  promoCode?: string;
  enabled?: boolean;
}

interface UsePricingReturn {
  pricing: PricingResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePricing({
  productId,
  quantity,
  promoCode,
  enabled = true
}: UsePricingOptions): UsePricingReturn {
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchPricing = async () => {
    if (!enabled || !productId || quantity <= 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) {
        throw new Error('No organization found');
      }

      // Get product details
      const { data: product } = await supabase
        .from('products')
        .select('*, organization_id')
        .eq('id', productId)
        .single();

      if (!product) {
        throw new Error('Product not found');
      }

      // Call pricing API
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity,
          customer_organization_id: profile.current_organization_id,
          supplier_organization_id: product.organization_id,
          promo_code: promoCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to calculate pricing');
      }

      const data = await response.json();
      setPricing(data.pricing);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Pricing error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [productId, quantity, promoCode, enabled]);

  return {
    pricing,
    loading,
    error,
    refetch: fetchPricing,
  };
}
