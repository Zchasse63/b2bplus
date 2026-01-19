/**
 * Phase 2: AI Backend Logic - Chatbot Actions System
 * 
 * This module implements all 7 chatbot actions that the AI assistant can perform:
 * 1. check_order_status - Look up order status
 * 2. get_order_history - Retrieve recent orders
 * 3. check_inventory - Check product availability
 * 4. add_to_cart - Add products to cart
 * 5. get_product_info - Get detailed product information
 * 6. create_support_ticket - Create support tickets
 * 7. reorder_last_order - Reorder items from previous order
 */

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, OrderItem, ChatbotActionParams } from '@/lib/types/ai';

/**
 * Action 1: Check Order Status
 * Looks up the status of a specific order by order number
 */
export async function checkOrderStatus(
  userId: string,
  organizationId: string,
  orderNumber: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total,
        submitted_at,
        shipped_at,
        delivered_at,
        shipping_tracking_number,
        shipping_carrier,
        shipping_addresses (
          label,
          street_address,
          city,
          state,
          postal_code
        )
      `)
      .eq('order_number', orderNumber)
      .eq('organization_id', organizationId)
      .single();

    if (error || !order) {
      return {
        success: false,
        error: `Order ${orderNumber} not found`,
      };
    }

    return {
      success: true,
      data: order,
      message: `Order ${orderNumber} is currently ${order.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check order status',
    };
  }
}

/**
 * Action 2: Get Order History
 * Retrieves recent orders for the customer
 */
export async function getOrderHistory(
  userId: string,
  organizationId: string,
  limit: number = 10
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total,
        submitted_at,
        order_items (
          id,
          name,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('organization_id', organizationId)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: 'Failed to retrieve order history',
      };
    }

    return {
      success: true,
      data: orders,
      message: `Found ${orders?.length || 0} recent orders`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to retrieve order history',
    };
  }
}

/**
 * Action 3: Check Inventory
 * Checks product availability based on search query
 */
export async function checkInventory(
  organizationId: string,
  query: string,
  limit: number = 10
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Search products using full-text search
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, name, category, base_price, in_stock, unit_of_measure, units_per_case')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('in_stock', true)
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: 'Failed to check inventory',
      };
    }

    return {
      success: true,
      data: products,
      message: `Found ${products?.length || 0} products matching "${query}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check inventory',
    };
  }
}

/**
 * Action 4: Add to Cart
 * Adds a product to the user's cart
 */
export async function addToCart(
  userId: string,
  organizationId: string,
  productId: string,
  quantity: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // First, verify the product exists and is in stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, base_price, in_stock')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    if (!product.in_stock) {
      return {
        success: false,
        error: `${product.name} is currently out of stock`,
      };
    }

    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // Update existing cart item
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update cart',
        };
      }

      return {
        success: true,
        data: { productId, quantity: existingItem.quantity + quantity },
        message: `Updated ${product.name} quantity in cart`,
      };
    } else {
      // Add new cart item
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          product_id: productId,
          quantity,
        });

      if (insertError) {
        return {
          success: false,
          error: 'Failed to add to cart',
        };
      }

      return {
        success: true,
        data: { productId, quantity },
        message: `Added ${product.name} to cart`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to add to cart',
    };
  }
}

/**
 * Action 5: Get Product Info
 * Retrieves detailed information about a specific product
 */
export async function getProductInfo(
  productId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    return {
      success: true,
      data: product,
      message: `Retrieved information for ${product.name}`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to retrieve product information',
    };
  }
}

/**
 * Action 6: Create Support Ticket
 * Creates a support ticket for issues that need human attention
 */
export async function createSupportTicket(
  userId: string,
  organizationId: string,
  subject: string,
  description: string,
  category: 'technical' | 'billing' | 'product' | 'shipping' | 'general' | 'complaint',
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  chatbotConversationId?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        subject,
        description,
        category,
        priority,
        created_by_chatbot: true,
        chatbot_conversation_id: chatbotConversationId,
        status: 'open',
      })
      .select('id, ticket_number')
      .single();

    if (error || !ticket) {
      return {
        success: false,
        error: 'Failed to create support ticket',
      };
    }

    return {
      success: true,
      data: ticket,
      message: `Support ticket ${ticket.ticket_number} created successfully. Our team will respond shortly.`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create support ticket',
    };
  }
}

/**
 * Action 7: Reorder Last Order
 * Adds all items from the customer's most recent order to their cart
 */
export async function reorderLastOrder(
  userId: string,
  organizationId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get the most recent order
    const { data: lastOrder, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_items (
          product_id,
          quantity,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError || !lastOrder) {
      return {
        success: false,
        error: 'No previous orders found',
      };
    }

    if (!lastOrder.order_items || lastOrder.order_items.length === 0) {
      return {
        success: false,
        error: 'No items found in last order',
      };
    }

    // Check which products are still in stock
    const productIds = lastOrder.order_items.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, in_stock')
      .in('id', productIds);

    if (productsError) {
      return {
        success: false,
        error: 'Failed to verify product availability',
      };
    }

    const inStockProducts = new Set(
      products?.filter(p => p.in_stock).map(p => p.id) || []
    );

    // Add items to cart
    const itemsToAdd = lastOrder.order_items.filter((item) =>
      inStockProducts.has(item.product_id)
    );

    if (itemsToAdd.length === 0) {
      return {
        success: false,
        error: 'None of the items from your last order are currently in stock',
      };
    }

    const cartItems = itemsToAdd.map((item) => ({
      user_id: userId,
      organization_id: organizationId,
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    // Use upsert to handle existing cart items
    const { error: insertError } = await supabase
      .from('cart_items')
      .upsert(cartItems, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      return {
        success: false,
        error: 'Failed to add items to cart',
      };
    }

    const outOfStockCount = lastOrder.order_items.length - itemsToAdd.length;
    let message = `Added ${itemsToAdd.length} items from order ${lastOrder.order_number} to your cart`;

    if (outOfStockCount > 0) {
      message += `. Note: ${outOfStockCount} item(s) were out of stock and not added.`;
    }

    return {
      success: true,
      data: {
        orderNumber: lastOrder.order_number,
        itemsAdded: itemsToAdd.length,
        itemsOutOfStock: outOfStockCount,
      },
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to reorder last order',
    };
  }
}

/**
 * Execute a chatbot action based on action name and parameters
 */
export async function executeChatbotAction(
  actionName: string,
  userId: string,
  organizationId: string,
  parameters: ChatbotActionParams
): Promise<ActionResult> {
  switch (actionName) {
    case 'check_order_status':
      if (!parameters.orderNumber) {
        return {
          success: false,
          error: 'Order number is required to check order status',
        };
      }
      return checkOrderStatus(userId, organizationId, parameters.orderNumber);

    case 'get_order_history':
      return getOrderHistory(userId, organizationId, parameters.limit);

    case 'check_inventory':
      if (!parameters.query) {
        return {
          success: false,
          error: 'Search query is required to check inventory',
        };
      }
      return checkInventory(organizationId, parameters.query, parameters.limit);

    case 'add_to_cart':
      if (!parameters.productId || !parameters.quantity) {
        return {
          success: false,
          error: 'Product ID and quantity are required to add to cart',
        };
      }
      return addToCart(userId, organizationId, parameters.productId, parameters.quantity);

    case 'get_product_info':
      if (!parameters.productId) {
        return {
          success: false,
          error: 'Product ID is required to get product information',
        };
      }
      return getProductInfo(parameters.productId);

    case 'create_support_ticket':
      if (!parameters.subject || !parameters.description) {
        return {
          success: false,
          error: 'Subject and description are required to create support ticket',
        };
      }
      return createSupportTicket(
        userId,
        organizationId,
        parameters.subject,
        parameters.description,
        parameters.category || 'general',
        parameters.priority || 'medium',
        parameters.chatbotConversationId
      );

    case 'reorder_last_order':
      return reorderLastOrder(userId, organizationId);

    default:
      return {
        success: false,
        error: `Unknown action: ${actionName}`,
      };
  }
}

