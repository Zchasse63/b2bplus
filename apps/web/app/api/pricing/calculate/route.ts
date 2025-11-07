import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PricingService } from '@b2b-plus/shared';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const {
      product_id,
      quantity,
      customer_organization_id,
      promo_code,
      order_subtotal
    } = body;
    
    // Validate required fields
    if (!product_id || !quantity || !customer_organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, quantity, customer_organization_id' },
        { status: 400 }
      );
    }
    
    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Fetch pricing data
    const [
      priceLocks,
      contractPrices,
      customerPrices,
      promoCodeData,
      volumePricing,
      pricingTiers
    ] = await Promise.all([
      // Price locks
      supabase
        .from('price_locks')
        .select('*')
        .eq('product_id', product_id)
        .eq('customer_organization_id', customer_organization_id)
        .eq('is_active', true),
      
      // Contract prices
      supabase
        .from('contract_prices')
        .select(`
          *,
          contract:contracts(
            id,
            status,
            start_date,
            end_date
          )
        `)
        .eq('product_id', product_id),
      
      // Customer-specific prices
      supabase
        .from('customer_product_prices')
        .select('*')
        .eq('product_id', product_id)
        .eq('customer_organization_id', customer_organization_id)
        .eq('is_active', true),
      
      // Promotional code (if provided)
      promo_code
        ? supabase
            .from('promotional_codes')
            .select('*')
            .eq('code', promo_code)
            .eq('organization_id', product.organization_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      
      // Volume pricing
      supabase
        .from('volume_pricing')
        .select('*')
        .eq('product_id', product_id)
        .eq('is_active', true),
      
      // Pricing tiers
      supabase
        .from('pricing_tiers')
        .select('*')
        .eq('product_id', product_id)
        .eq('is_active', true)
        .order('priority', { ascending: true })
    ]);
    
    // Calculate price
    const pricingResult = await PricingService.calculatePrice(
      {
        product,
        quantity,
        customer_organization_id,
        supplier_organization_id: product.organization_id,
        promo_code,
        order_subtotal
      },
      {
        priceLocks: priceLocks.data || [],
        contractPrices: contractPrices.data?.map(cp => ({
          ...cp,
          contract_id: cp.contract.id,
          contract_status: cp.contract.status,
          contract_start_date: new Date(cp.contract.start_date),
          contract_end_date: new Date(cp.contract.end_date)
        })) || [],
        customerPrices: customerPrices.data || [],
        promoCode: promoCodeData.data || undefined,
        volumePricing: volumePricing.data || [],
        pricingTiers: pricingTiers.data || []
      }
    );
    
    return NextResponse.json({
      success: true,
      pricing: pricingResult
    });
    
  } catch (error) {
    // Get user ID for error tracking
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Ignore errors getting user for error tracking
    }

    console.error('Pricing calculation error:', error);

    // Report to error monitoring
    const { errorMonitor } = await import('@/lib/error-monitoring');
    errorMonitor.report(error instanceof Error ? error : new Error(String(error)), {
      category: 'pricing',
      severity: 'high',
      userId,
      operation: 'calculate-price'
    });

    // Production: Generic message, Development: Detailed error
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'An error occurred while calculating price. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
