'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Card from '@/components/horizon/card';
import Button from '@/components/horizon/button/Button';
import Modal from '@/components/horizon/modal/Modal';
import Image from 'next/image';
import { MdDelete, MdShoppingCart, MdArrowForward, MdRemoveCircle } from 'react-icons/md';

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
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadCart();
  }, []);

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

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.products.base_price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading cart...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="mt-3 animate-fadeIn">
        <Card extra="p-12 text-center">
          <MdShoppingCart className="mx-auto mb-4 h-24 w-24 text-gray-300 dark:text-gray-600" />
          <h2 className="mb-2 text-2xl font-bold text-navy-700 dark:text-white">
            Your cart is empty
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
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
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card extra="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Shopping Cart</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button
            variant="primary"
            icon={<MdArrowForward />}
            onClick={() => router.push('/checkout')}
          >
            Proceed to Checkout
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card extra="p-6">
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
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <MdShoppingCart className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-navy-700 dark:text-white">
                        {item.products.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {item.products.sku}
                      </p>
                      <p className="mt-1 text-lg font-bold text-brand-500 dark:text-brand-400">
                        ${item.products.base_price.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-white/10">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 text-gray-600 hover:text-brand-500 dark:text-gray-400"
                        >
                          -
                        </button>
                        <span className="min-w-[2rem] text-center font-semibold text-navy-700 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 text-gray-600 hover:text-brand-500 dark:text-gray-400"
                        >
                          +
                        </button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<MdDelete />}
                        onClick={() => setDeleteModal({ open: true, item })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="text-xl font-bold text-navy-700 dark:text-white">
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
          <Card extra="p-6 sticky top-4">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
              Order Summary
            </h2>
            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-white/10">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax (8%)</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xl font-bold text-navy-700 dark:text-white">
              <span>Total</span>
              <span className="text-brand-500 dark:text-brand-400">${total.toFixed(2)}</span>
            </div>
            <Button
              variant="primary"
              className="mt-6 w-full"
              icon={<MdArrowForward />}
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
              variant="danger"
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
