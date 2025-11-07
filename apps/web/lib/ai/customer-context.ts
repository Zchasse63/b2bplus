import { createClient } from '@/lib/supabase/server';

/**
 * Customer Context for AI Operations
 * Phase 1, Task 2.1: Customer Data Isolation Helper
 * 
 * This module ensures AI operations only access data belonging to the
 * authenticated user's organization, preventing data leakage across tenants.
 */

export interface CustomerContext {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: string;
  recentOrders: any[];
  topProducts: any[];
  totalSpend: number;
  // Phase 2 enhancements for chatbot
  cartItems: any[];
  cartTotal: number;
  creditLimit: number;
  creditAvailable: number;
  accountStatus: string;
}

/**
 * Get customer context for AI operations
 * CRITICAL: Only returns data for the authenticated user's organization
 * 
 * @param userId - Authenticated user ID
 * @returns Customer context with organization-scoped data
 * @throws Error if user not found or organization not approved
 */
export async function getCustomerContext(userId: string): Promise<CustomerContext> {
  const supabase = await createClient();
  
  // Get user's organization membership
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      organization:organizations!inner(
        id,
        name,
        approval_status,
        credit_limit
      )
    `)
    .eq('user_id', userId)
    .single();
  
  if (memberError || !member) {
    throw new Error('User organization membership not found');
  }
  
  const org = member.organization as any;
  
  // Verify organization is approved
  if (org.approval_status !== 'approved') {
    throw new Error('Organization not approved');
  }
  
  const organizationId = org.id;
  
  // Get recent orders (ONLY for this organization)
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      created_at,
      order_items(
        product_id,
        quantity,
        unit_price,
        products(name, sku)
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Calculate total spend (ONLY for this organization)
  const { data: spendData } = await supabase
    .from('orders')
    .select('total')
    .eq('organization_id', organizationId)
    .eq('status', 'completed');
  
  const totalSpend = spendData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  
  // Get top products by order frequency (ONLY for this organization)
  const { data: topProducts } = await supabase
    .from('order_items')
    .select(`
      product_id,
      products(id, name, sku),
      quantity
    `)
    .in('order_id', 
      (await supabase
        .from('orders')
        .select('id')
        .eq('organization_id', organizationId)
      ).data?.map(o => o.id) || []
    )
    .limit(20);
  
  // Aggregate top products
  const productMap = new Map();
  topProducts?.forEach((item: any) => {
    const productId = item.product_id;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        ...item.products,
        totalQuantity: 0,
        orderCount: 0
      });
    }
    const product = productMap.get(productId);
    product.totalQuantity += item.quantity || 0;
    product.orderCount += 1;
  });
  
  const topProductsList = Array.from(productMap.values())
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10);

  // Phase 2: Get cart contents
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product:products(
        id,
        name,
        sku,
        base_price,
        image_url
      )
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId);

  // Calculate cart total
  const cartTotal = cartItems?.reduce((sum, item: any) => {
    const price = item.product?.base_price || 0;
    return sum + (price * item.quantity);
  }, 0) || 0;

  // Get credit information
  const creditLimit = org.credit_limit || 0;

  // Calculate credit used (sum of pending/processing orders)
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('organization_id', organizationId)
    .in('status', ['submitted', 'processing']);

  const creditUsed = pendingOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const creditAvailable = Math.max(0, creditLimit - creditUsed);

  return {
    userId,
    organizationId,
    organizationName: org.name,
    role: member.role,
    recentOrders: orders || [],
    topProducts: topProductsList,
    totalSpend,
    // Phase 2 enhancements
    cartItems: cartItems || [],
    cartTotal,
    creditLimit,
    creditAvailable,
    accountStatus: org.approval_status,
  };
}

/**
 * Verify user has access to specific customer/organization data
 * 
 * @param userId - Authenticated user ID
 * @param targetOrganizationId - Organization ID to check access for
 * @returns true if user has access, false otherwise
 */
export async function verifyCustomerAccess(
  userId: string, 
  targetOrganizationId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Check if user is a member of the target organization
  const { data: member, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', targetOrganizationId)
    .single();
  
  if (error || !member) {
    return false;
  }
  
  return true;
}

/**
 * Verify user has access to specific order
 * 
 * @param userId - Authenticated user ID
 * @param orderId - Order ID to check access for
 * @returns true if user has access, false otherwise
 */
export async function verifyOrderAccess(
  userId: string,
  orderId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Get user's organization
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  
  if (!member) {
    return false;
  }
  
  // Check if order belongs to user's organization
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('organization_id', member.organization_id)
    .single();
  
  return !!order;
}

/**
 * Verify user has access to specific product data
 * Note: Products are generally public, but this checks if user can see
 * organization-specific pricing or recommendations
 * 
 * @param userId - Authenticated user ID
 * @param productId - Product ID to check access for
 * @returns true if user has access, false otherwise
 */
export async function verifyProductAccess(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Products are public, but verify user is authenticated and has approved org
  const { data: member } = await supabase
    .from('organization_members')
    .select(`
      organization:organizations!inner(
        approval_status
      )
    `)
    .eq('user_id', userId)
    .single();
  
  if (!member) {
    return false;
  }
  
  const org = member.organization as any;
  return org.approval_status === 'approved';
}

/**
 * Get organization ID for a user
 * Helper function for quick organization ID lookup
 * 
 * @param userId - Authenticated user ID
 * @returns Organization ID or null if not found
 */
export async function getUserOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  
  return member?.organization_id || null;
}

/**
 * Verify user is admin or owner of their organization
 * Used for operations that require elevated permissions within the org
 * 
 * @param userId - Authenticated user ID
 * @returns true if user is admin/owner, false otherwise
 */
export async function isOrganizationAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (!member) {
    return false;
  }
  
  return ['owner', 'admin', 'super_admin'].includes(member.role);
}

