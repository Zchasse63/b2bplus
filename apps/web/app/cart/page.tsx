'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Button, Modal, ProductCard, Input, Badge } from '@/components/b2b';
import Image from 'next/image';
import { FiTrash2, FiShoppingCart, FiArrowRight, FiMinusCircle, FiTag, FiCheck, FiX } from 'react-icons/fi';
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
    in_stock: boolean;
  };
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: CartItem }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadCart();
  }, []);

  // Fetch recommendations based on cart items
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (cartItems.length === 0) {
        setLoadingRecommendations(false);
        return;
      }

      try {
        // Get recommendations for the first product in cart
        const firstProductId = cartItems[0].product_id;
        const response = await fetch(`/api/recommendations?productId=${firstProductId}&type=also_bought&limit=4`);

        if (response.ok) {
          const data = await response.json();
          if (data.recommendations && data.recommendations.length > 0) {
            // Fetch full product details
            const productIds = data.recommendations.map((r: any) => r.recommended_product_id);
            const { data: products } = await supabase
              .from('products')
              .select('id, name, sku, base_price, image_url, category')
              .in('id', productIds)
              .not('id', 'in', `(${cartItems.map(item => item.product_id).join(',')})`); // Exclude items already in cart

            setRecommendations(products || []);
          }
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [cartItems]);

  async function loadCart() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products (*)')
        .eq('user_id', user.id);

      if (!error && data) {
        setCartItems(data);
      }
    } catch (err) {
      console.error('Error loading cart:', err);
    }
    setLoading(false);
  }

  async function updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (!error) {
      setCartItems(
        cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
      );
    }
  }

  async function handleDelete(item: CartItem) {
    setDeleting(true);
    const { error } = await supabase.from('cart_items').delete().eq('id', item.id);

    if (!error) {
      setCartItems(cartItems.filter((i) => i.id !== item.id));
      setDeleteModal({ open: false });
    }
    setDeleting(false);
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a promo code',
        variant: 'destructive',
      });
      return;
    }

    setApplyingPromo(true);

    // Simulate promo code validation (replace with actual API call)
    // Valid codes: SAVE10 (10%), SAVE20 (20%), FREESHIP (free shipping)
    const validCodes: Record<string, number> = {
      'SAVE10': 0.10,
      'SAVE20': 0.20,
      'WELCOME15': 0.15,
    };

    setTimeout(() => {
      const discount = validCodes[promoCode.toUpperCase()];

      if (discount) {
        setAppliedPromo({ code: promoCode.toUpperCase(), discount });
        toast({
          title: 'Success!',
          description: `Promo code "${promoCode.toUpperCase()}" applied successfully`,
        });
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The promo code you entered is not valid',
          variant: 'destructive',
        });
      }

      setApplyingPromo(false);
    }, 500);
  }

  function removePromoCode() {
    setAppliedPromo(null);
    setPromoCode('');
    toast({
      title: 'Promo Code Removed',
      description: 'The promo code has been removed from your order',
    });
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.products.base_price * item.quantity,
    0
  );
  const discount = appliedPromo ? subtotal * appliedPromo.discount : 0;
  const subtotalAfterDiscount = subtotal - discount;
  const shipping = subtotalAfterDiscount >= 500 ? 0 : 50;
  const tax = subtotalAfterDiscount * 0.08;
  const total = subtotalAfterDiscount + shipping + tax;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500 dark:text-b2b-gray-500">Loading cart...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="mt-3 animate-fadeIn">
        <Card padding="lg" className="text-center">
          <FiShoppingCart className="mx-auto mb-4 h-24 w-24 text-gray-300 dark:text-b2b-gray-500" />
          <h2 className="mb-2 text-2xl font-bold text-b2b-dark dark:text-white">
            Your cart is empty
          </h2>
          <p className="mb-6 text-b2b-gray-500 dark:text-b2b-gray-500">
            Add some products to your cart to get started
          </p>
          <Button variant="primary" onClick={() => router.push('/products')}>
            Browse Products
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Gradient Header */}
      <PageHeader
        title="Shopping Cart"
        subtitle={`${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'} in your cart`}
        
        actions={
          <Button
            variant="secondary"
            icon={<FiArrowRight />}
            onClick={() => router.push('/checkout')}
          >
            Proceed to Checkout
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md dark:border-white/10"
                >
                  {/* Product Image */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-700">
                    {item.products.image_url ? (
                      <Image
                        src={item.products.image_url}
                        alt={item.products.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-b2b-gray-500">
                        <FiShoppingCart className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-b2b-dark dark:text-white">
                        {item.products.name}
                      </h3>
                      <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                        SKU: {item.products.sku}
                      </p>
                      <p className="mt-1 text-lg font-bold text-b2b-yellow dark:text-brand-400">
                        ${item.products.base_price.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-white/10">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 text-b2b-gray-500 hover:text-b2b-yellow dark:text-b2b-gray-500"
                        >
                          -
                        </button>
                        <span className="min-w-[2rem] text-center font-semibold text-b2b-dark dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 text-b2b-gray-500 hover:text-b2b-yellow dark:text-b2b-gray-500"
                        >
                          +
                        </button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<FiTrash2 />}
                        onClick={() => setDeleteModal({ open: true, item })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="text-xl font-bold text-b2b-dark dark:text-white">
                      ${(item.products.base_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="mb-4 text-xl font-bold text-b2b-dark dark:text-white">
              Order Summary
            </h2>

            {/* Promo Code Section */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
              {!appliedPromo ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-b2b-gray-600 dark:text-b2b-gray-400">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      onKeyPress={(e) => e.key === 'Enter' && applyPromoCode()}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={applyPromoCode}
                      loading={applyingPromo}
                      icon={<FiTag />}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-b2b-green-50 dark:bg-b2b-green-900/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiCheck className="h-5 w-5 text-b2b-green" />
                    <div>
                      <p className="text-sm font-semibold text-b2b-green">
                        {appliedPromo.code}
                      </p>
                      <p className="text-xs text-b2b-gray-600 dark:text-b2b-gray-400">
                        {(appliedPromo.discount * 100).toFixed(0)}% discount applied
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-b2b-gray-500 hover:text-b2b-error transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Free Shipping Progress Bar */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
              {subtotal < 500 ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-b2b-gray-600">Free Shipping Progress</span>
                    <span className="font-semibold text-b2b-blue">
                      ${(500 - subtotal).toFixed(2)} to go
                    </span>
                  </div>
                  <div className="w-full bg-b2b-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-b2b-blue to-b2b-green h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((subtotal / 500) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-b2b-gray-500 mt-2">
                    Add ${(500 - subtotal).toFixed(2)} more to qualify for free shipping!
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-b2b-green">
                  <FiCheck className="h-5 w-5" />
                  <span className="font-semibold">You qualify for free shipping!</span>
                </div>
              )}
            </div>

            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-white/10">
              <div className="flex justify-between text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-b2b-green">
                  <span>Discount ({appliedPromo.code})</span>
                  <span className="font-semibold">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Shipping</span>
                <span className="font-semibold">
                  {subtotal >= 500 ? (
                    <span className="text-b2b-green">FREE</span>
                  ) : (
                    '$50.00'
                  )}
                </span>
              </div>
              <div className="flex justify-between text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Tax (8%)</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xl font-bold text-b2b-dark dark:text-white">
              <span>Total</span>
              <span className="text-b2b-blue dark:text-brand-400">${total.toFixed(2)}</span>
            </div>
            {appliedPromo && (
              <p className="mt-2 text-sm text-b2b-green text-center">
                You saved ${discount.toFixed(2)}!
              </p>
            )}
            <Button
              variant="primary"
              className="mt-6 w-full"
              icon={<FiArrowRight />}
              onClick={() => router.push('/checkout')}
            >
              Checkout
            </Button>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => router.push('/products')}
            >
              Continue Shopping
            </Button>
          </Card>
        </div>
      </div>

      {/* AI-Powered Recommendations */}
      {!loadingRecommendations && recommendations.length > 0 && (
        <div className="mt-8">
          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-b2b-dark dark:text-white">
                You Might Also Like
              </h2>
              <span className="rounded-lg bg-b2b-yellow/10 px-3 py-1 text-sm font-semibold text-b2b-yellow">
                AI Recommended
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((rec) => (
                <ProductCard
                  key={rec.id}
                  id={rec.id}
                  name={rec.name}
                  price={rec.base_price}
                  image={rec.image_url || undefined}
                  category={rec.category || undefined}
                  inStock={rec.in_stock}
                  onAddToCart={() => loadCart()}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        title="Remove Item"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to remove{' '}
            <span className="font-semibold">{deleteModal.item?.products.name}</span> from your cart?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary" className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteModal.item && handleDelete(deleteModal.item)}
              loading={deleting}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
