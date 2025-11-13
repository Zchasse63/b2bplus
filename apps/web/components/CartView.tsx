'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Product } from '@b2b-plus/supabase'

interface CartItemWithProduct extends CartItem {
  products: Product
}

interface PricingInfo {
  unit_price: number
  line_total: number
  base_price: number
  discount_amount: number
  discount_percentage: number
  pricing_source: string
}

interface CartViewProps {
  initialCartItems: CartItemWithProduct[]
}

export default function CartView({ initialCartItems }: CartViewProps) {
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [loading, setLoading] = useState<string | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [itemPricing, setItemPricing] = useState<Record<string, PricingInfo>>({})
  const [pricingError, setPricingError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Fetch pricing for all cart items
  useEffect(() => {
    const fetchPricing = async () => {
      setPricingLoading(true)
      setPricingError(null)
      const pricing: Record<string, PricingInfo> = {}

      try {
        // Get current user and organization
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setPricingError('Not authenticated')
          setPricingLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .single()

        if (!profile?.current_organization_id) {
          setPricingError('No organization found')
          setPricingLoading(false)
          return
        }

        // Fetch pricing for each cart item
        for (const item of cartItems) {
          try {
            const response = await fetch('/api/pricing/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: item.product_id,
                quantity: item.quantity,
                customer_organization_id: profile.current_organization_id,
                supplier_organization_id: item.products.organization_id,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.pricing) {
                pricing[item.id] = data.pricing
              } else {
                // Fallback to base price if API fails
                pricing[item.id] = {
                  unit_price: item.products.base_price,
                  line_total: item.products.base_price * item.quantity,
                  base_price: item.products.base_price,
                  discount_amount: 0,
                  discount_percentage: 0,
                  pricing_source: 'base',
                }
              }
            } else {
              // Fallback to base price
              pricing[item.id] = {
                unit_price: item.products.base_price,
                line_total: item.products.base_price * item.quantity,
                base_price: item.products.base_price,
                discount_amount: 0,
                discount_percentage: 0,
                pricing_source: 'base',
              }
            }
          } catch (error) {
            console.error(`Failed to fetch pricing for item ${item.id}:`, error)
            // Fallback to base price
            pricing[item.id] = {
              unit_price: item.products.base_price,
              line_total: item.products.base_price * item.quantity,
              base_price: item.products.base_price,
              discount_amount: 0,
              discount_percentage: 0,
              pricing_source: 'base',
            }
          }
        }

        setItemPricing(pricing)
      } catch (error) {
        console.error('Failed to fetch pricing:', error)
        setPricingError('Failed to calculate pricing')
      } finally {
        setPricingLoading(false)
      }
    }

    if (cartItems.length > 0) {
      fetchPricing()
    } else {
      setPricingLoading(false)
    }
  }, [cartItems, supabase])

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setLoading(itemId)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
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
      setItemPricing(prev => {
        const newPricing = { ...prev }
        delete newPricing[itemId]
        return newPricing
      })
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setLoading(null)
    }
  }

  const calculateTotal = () => {
    return Object.values(itemPricing).reduce((total: number, pricing: PricingInfo) => {
      return total + (pricing?.line_total || 0)
    }, 0)
  }

  const calculateTotalDiscount = () => {
    return Object.values(itemPricing).reduce((total: number, pricing: PricingInfo) => {
      return total + (pricing?.discount_amount || 0)
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

  if (pricingError) {
    return (
      <div className="rounded-lg bg-red-50 p-6 border border-red-200">
        <h2 className="text-lg font-semibold text-red-900">Pricing Error</h2>
        <p className="mt-2 text-red-700">{pricingError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow">
        {pricingLoading && (
          <div className="p-6 text-center text-gray-600">
            Loading prices...
          </div>
        )}
        {!pricingLoading && cartItems.map((item, index) => {
          const pricing = itemPricing[item.id]
          const hasDiscount = pricing && pricing.discount_amount > 0

          return (
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
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        ${item.products.base_price.toFixed(2)} / {item.products.unit_of_measure}
                      </span>
                      {pricing && pricing.pricing_source !== 'base' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {pricing.pricing_source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {hasDiscount && (
                      <p className="text-sm text-gray-500 line-through">
                        ${(item.products.base_price * item.quantity).toFixed(2)}
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900">
                      ${pricing ? pricing.line_total.toFixed(2) : (item.products.base_price * item.quantity).toFixed(2)}
                    </p>
                    {hasDiscount && (
                      <p className="text-sm text-green-600 font-semibold">
                        Save ${pricing.discount_amount.toFixed(2)} ({pricing.discount_percentage.toFixed(0)}%)
                      </p>
                    )}
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
          )
        })}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        {pricingLoading ? (
          <div className="text-center text-gray-600 py-4">
            Calculating totals...
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  ${(calculateTotal() + calculateTotalDiscount()).toFixed(2)}
                </span>
              </div>
              {calculateTotalDiscount() > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="font-semibold">Total Savings</span>
                  <span className="font-semibold">-${calculateTotalDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-lg font-medium text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
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
                className="flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={pricingLoading}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
