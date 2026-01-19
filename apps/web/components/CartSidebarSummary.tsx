"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/b2b";

interface CartProduct {
  id: string;
  name: string;
  base_price: number | null;
}

interface CartItem {
  id: string;
  quantity: number;
  products: CartProduct | null;
}

export function CartSidebarSummary() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, products(id, name, base_price)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load cart items", error);
        setItems([]);
        return;
      }

      setItems((data || []) as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();

    let subscription: { unsubscribe?: () => void } | null = null;

    try {
      if (typeof (supabase as any).channel === "function") {
        subscription = supabase
          .channel("cart:sidebar-summary")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "cart_items" },
            () => {
              loadCart();
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.error("Failed to subscribe to cart changes", err);
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => {
    const price = item.products?.base_price ?? 0;
    return sum + price * (item.quantity || 0);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleViewCart = () => {
    router.push("/cart");
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-b2b-dark">Your cart</h2>
          <p className="text-xs text-b2b-gray-500">
            {loading ? "Checking your cart..." : itemCount === 0 ? "No items added yet" : `${itemCount} item${itemCount === 1 ? "" : "s"} in cart`}
          </p>
        </div>
        {!loading && itemCount > 0 && (
          <span className="rounded-full bg-b2b-gray-100 px-2 py-1 text-xs font-medium text-b2b-gray-700">
            {formatCurrency(subtotal)}
          </span>
        )}
      </div>

      {!loading && itemCount > 0 && (
        <div className="space-y-1 text-xs text-b2b-gray-700">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity} x {item.products?.name ?? "Unnamed product"}
              </span>
              <span className="whitespace-nowrap text-b2b-gray-600">
                {formatCurrency((item.products?.base_price ?? 0) * (item.quantity || 0))}
              </span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-[11px] text-b2b-gray-500">
              + {items.length - 3} more item{items.length - 3 === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleCheckout}
          disabled={itemCount === 0 || loading}
        >
          Proceed to checkout
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-b2b-blue hover:bg-b2b-gray-50"
          onClick={handleViewCart}
          disabled={loading}
        >
          View full cart
        </Button>
      </div>
    </Card>
  );
}

