'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Product } from '@b2b-plus/supabase'

interface CartItemWithProduct extends CartItem {
  products: Product
}

interface CartViewProps {
  initialCartItems: CartItemWithProduct[]
}

export default function CartView({ initialCartItems }: CartViewProps) {
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setLoading(itemId)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      setCartItems(cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Failed to update quantity')
    } finally {
      setLoading(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setLoading(itemId)
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setCartItems(cartItems.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setLoading(null)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.products.base_price * item.quantity)
    }, 0)
  }

  if (cartItems.length === 0) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow">
        <h2 className="text-xl font-semibold text-gray-900">Your cart is empty</h2>
        <p className="mt-2 text-gray-600">Add some products to get started</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow">
        {cartItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex gap-4 p-6 ${
              index !== cartItems.length - 1 ? 'border-b border-gray-200' : ''
            }`}
          >
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
              {item.products.image_url ? (
                <Image
                  src={item.products.image_url}
                  alt={item.products.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.products.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    SKU: {item.products.sku}
                    {item.products.brand && ` • ${item.products.brand}`}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    ${item.products.base_price.toFixed(2)} / {item.products.unit_of_measure}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ${(item.products.base_price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={loading === item.id || item.quantity <= 1}
                    className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={loading === item.id}
                    className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  disabled={loading === item.id}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <span className="text-lg font-medium text-gray-900">Subtotal</span>
          <span className="text-2xl font-bold text-gray-900">
            ${calculateTotal().toFixed(2)}
          </span>
        </div>
        <div className="mt-6 flex gap-4">
          <Link
            href="/products"
            className="flex-1 rounded-md border border-gray-300 px-6 py-3 text-center font-medium text-gray-700 hover:bg-gray-50"
          >
            Continue Shopping
          </Link>
          <button
            onClick={() => router.push('/checkout')}
            className="flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  )
}

