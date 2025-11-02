import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { leadId, productId } = await request.json();

    if (!leadId || !productId) {
      return NextResponse.json(
        { error: 'Lead ID and Product ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the get_lead_price function
    const { data, error } = await supabase.rpc('get_lead_price', {
      p_lead_id: leadId,
      p_product_id: productId,
    });

    if (error) {
      console.error('Error getting lead price:', error);
      return NextResponse.json(
        { error: 'Failed to calculate price' },
        { status: 500 }
      );
    }

    // Get lead details for context
    const { data: lead } = await supabase
      .from('leads')
      .select('*, regions(name, tier), buying_groups(name, price_markup_percentage)')
      .eq('id', leadId)
      .single();

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('name, sku, price')
      .eq('id', productId)
      .single();

    return NextResponse.json({
      price: data,
      basePrice: product?.price,
      product: product,
      lead: {
        company: lead?.company_name,
        region: lead?.regions?.name,
        regionTier: lead?.regions?.tier,
        buyingGroup: lead?.buying_groups?.name,
        buyingGroupMarkup: lead?.buying_groups?.price_markup_percentage,
      },
    });

  } catch (error) {
    console.error('Error in lead price calculation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
