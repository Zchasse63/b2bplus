import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { csrfProtection } from '@/lib/middleware/csrf';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler';

interface ApprovePricingRequest {
  action: 'approve' | 'reject' | 'modify';
  custom_price?: number;
  rejection_reason?: string;
}

/**
 * POST /api/admin/pricing/[id]/approve
 * Handle pricing recommendation actions (approve, reject, modify)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limiting
  const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
  if (!allowed) return rateLimitResponse!;

  // CSRF Protection
  const { valid, response: csrfResponse } = await csrfProtection(request);
  if (!valid) {
    return csrfResponse!;
  }

  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();
    const body: ApprovePricingRequest = await request.json();
    const { action, custom_price, rejection_reason } = body;

    // Get the pricing recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('pricing_recommendations')
      .select('*, product:products!product_id(*)')
      .eq('id', params.id)
      .single();

    if (recError || !recommendation) {
      throw new NotFoundError('Pricing recommendation', params.id);
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        // Update product price
        const newPrice = recommendation.recommended_price;
        const oldPrice = recommendation.product.price;

        const { error: productError } = await supabase
          .from('products')
          .update({
            price: newPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recommendation.product_id);

        if (productError) {
          throw DatabaseError.queryFailed('products', 'update');
        }

        // Log to pricing history
        const { error: historyError } = await supabase
          .from('pricing_history')
          .insert({
            product_id: recommendation.product_id,
            old_price: oldPrice,
            new_price: newPrice,
            price_change_percent:
              ((newPrice - oldPrice) / oldPrice) * 100,
            changed_by: user!.id,
            change_reason: 'AI recommendation approved',
            recommendation_id: params.id,
          });

        if (historyError) {
          console.error('Error logging pricing history:', historyError);
        }

        // Update recommendation status
        const { error: updateError } = await supabase
          .from('pricing_recommendations')
          .update({
            status: 'applied',
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (updateError) {
          throw DatabaseError.queryFailed('pricing_recommendations', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Pricing recommendation approved and applied',
          new_price: newPrice,
        });

      case 'modify':
        if (!custom_price || custom_price <= 0) {
          throw new ValidationError('Valid custom price is required for modify action', { custom_price: ['Must be a positive number'] });
        }

        // Update product price with custom value
        const customOldPrice = recommendation.product.price;

        const { error: customProductError } = await supabase
          .from('products')
          .update({
            price: custom_price,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recommendation.product_id);

        if (customProductError) {
          throw DatabaseError.queryFailed('products', 'update');
        }

        // Log to pricing history
        const { error: customHistoryError } = await supabase
          .from('pricing_history')
          .insert({
            product_id: recommendation.product_id,
            old_price: customOldPrice,
            new_price: custom_price,
            price_change_percent:
              ((custom_price - customOldPrice) / customOldPrice) * 100,
            changed_by: user!.id,
            change_reason: 'AI recommendation modified and applied',
            recommendation_id: params.id,
          });

        if (customHistoryError) {
          console.error('Error logging pricing history:', customHistoryError);
        }

        // Update recommendation status
        const { error: customUpdateError } = await supabase
          .from('pricing_recommendations')
          .update({
            status: 'applied',
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (customUpdateError) {
          throw DatabaseError.queryFailed('pricing_recommendations', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Custom pricing applied',
          new_price: custom_price,
        });

      case 'reject':
        // Update recommendation status to rejected
        const { error: rejectError } = await supabase
          .from('pricing_recommendations')
          .update({
            status: 'rejected',
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejection_reason || 'Rejected by admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id);

        if (rejectError) {
          throw DatabaseError.queryFailed('pricing_recommendations', 'update');
        }

        return NextResponse.json({
          success: true,
          message: 'Pricing recommendation rejected',
        });

      default:
        throw new ValidationError('Invalid action', { action: ['Must be approve, reject, or modify'] });
    }
  } catch (error) {
    return handleError(error);
  }
}
