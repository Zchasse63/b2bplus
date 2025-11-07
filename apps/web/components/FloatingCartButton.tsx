'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { MiniCart } from './MiniCart';

export const FloatingCartButton: React.FC = () => {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const supabase = createClient();

  const loadCartCount = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCartCount(0);
        return;
      }

      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setCartCount(count || 0);
    } catch (err) {
      console.error('Error loading cart count:', err);
    }
  }, [supabase]);

  useEffect(() => {
    loadCartCount();

    // Set up real-time subscription
    const channel = supabase
      .channel('cart-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
        },
        () => {
          loadCartCount();
        }
      )
      .subscribe();

    // Show button after a short delay
    setTimeout(() => setIsVisible(true), 500);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCartCount, supabase]);

  if (cartCount === 0) return null;

  return (
    <>
      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={`
          fixed bottom-6 right-6 z-30
          flex items-center gap-2
          bg-b2b-blue text-white
          px-4 py-3 rounded-full
          shadow-b2b-lg hover:shadow-b2b-xl
          transition-all duration-300
          hover:scale-105
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
        `}
      >
        <div className="relative">
          <FiShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-b2b-orange text-xs font-bold">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <span className="font-semibold hidden sm:inline">
          Cart ({cartCount})
        </span>
      </button>

      {/* Mini Cart Drawer */}
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

FloatingCartButton.displayName = 'FloatingCartButton';

