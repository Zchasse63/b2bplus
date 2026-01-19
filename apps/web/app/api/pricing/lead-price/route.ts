import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { leadId, productId } = await request.json();

    if (!leadId || !productId) {
      throw new ValidationError('Lead ID and Product ID are required');
    }

    const supabase = await createClient();

    // Call the get_lead_price function
    const { data, error } = await supabase.rpc('get_lead_price', {
      p_lead_id: leadId,
      p_product_id: productId,
    });

    if (error) {
      throw DatabaseError.queryFailed('pricing', 'get_lead_price');
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
    return handleError(error);
  }
}
