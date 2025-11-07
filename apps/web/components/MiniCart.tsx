'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Drawer, Button, Badge } from '@/components/b2b';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiShoppingCart, FiTrash2, FiArrowRight, FiX } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    sku: string;
    base_price: number;
    image_url: string | null;
    category: string | null;
  };
}

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniCart: React.FC<MiniCartProps> = ({ isOpen, onClose }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const loadCart = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products (*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCartItems(data);
      }
    } catch (err) {
      console.error('Error loading cart:', err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      loadCart();

      // Set up real-time subscription
      const channel = supabase
        .channel('cart-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
          },
          () => {
            loadCart();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, loadCart, supabase]);

  async function updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) return;

    setUpdating(itemId);
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (!error) {
      setCartItems(
        cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
      );
    }
    setUpdating(null);
  }

  async function removeItem(itemId: string) {
    setUpdating(itemId);
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);

    if (!error) {
      setCartItems(cartItems.filter((i) => i.id !== itemId));
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your cart',
      });
    }
    setUpdating(null);
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.products.base_price * item.quantity,
    0
  );

  // Group items by category for better organization
  const groupedItems = cartItems.reduce((acc, item) => {
    const category = item.products.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Shopping Cart" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-b2b-gray-500">Loading cart...</div>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FiShoppingCart className="h-16 w-16 text-b2b-gray-300 mb-4" />
          <p className="text-b2b-gray-500 mb-4">Your cart is empty</p>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              router.push('/products');
            }}
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <>
          {/* Cart Items - Grouped by Category */}
          <div className="space-y-6 mb-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-b2b-gray-600 uppercase tracking-wide">
                    {category}
                  </h3>
                  <Badge variant="default" size="sm">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-lg border border-b2b-gray-200 hover:border-b2b-blue transition-colors"
                    >
                      {/* Product Image */}
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-b2b-gray-100">
                        {item.products.image_url ? (
                          <Image
                            src={item.products.image_url}
                            alt={item.products.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-b2b-gray-400">
                            <FiShoppingCart className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-b2b-text truncate">
                          {item.products.name}
                        </h4>
                        <p className="text-xs text-b2b-gray-500">
                          SKU: {item.products.sku}
                        </p>
                        <p className="text-sm font-bold text-b2b-blue mt-1">
                          ${item.products.base_price.toFixed(2)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 rounded-lg border border-b2b-gray-300">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id || item.quantity <= 1}
                              className="px-2 py-1 text-b2b-gray-600 hover:text-b2b-blue disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-b2b-text">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id}
                              className="px-2 py-1 text-b2b-gray-600 hover:text-b2b-blue disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                            className="text-b2b-gray-400 hover:text-b2b-error transition-colors disabled:opacity-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-b2b-text">
                          ${(item.products.base_price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary - Sticky Footer */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-b2b-gray-200 pt-4 -mx-6 px-6 -mb-4 pb-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-b2b-gray-600">
                <span>Subtotal ({cartItems.length} items)</span>
                <span className="font-semibold text-b2b-text">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-b2b-gray-500">
                Taxes and shipping calculated at checkout
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onClose();
                  router.push('/cart');
                }}
              >
                View Cart
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                icon={<FiArrowRight />}
                onClick={() => {
                  onClose();
                  router.push('/checkout');
                }}
              >
                Checkout
              </Button>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
};

MiniCart.displayName = 'MiniCart';

