'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PromoCodeInput from './PromoCodeInput'
import type { CartItem, Product } from '@b2b-plus/supabase'

interface CartItemWithProduct extends CartItem {
  products: Product
}

interface CartViewProps {
  initialCartItems: CartItemWithProduct[]
  organizationId?: string | null
  onCartUpdate?: () => void
}

interface CartItemPricing {
  itemId: string
  unit_price: number
  line_total: number
  discount_amount: number
  pricing_source: string
}

export default function CartViewWithPricing({ initialCartItems, organizationId, onCartUpdate }: CartViewProps) {
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [itemPricing, setItemPricing] = useState<Record<string, CartItemPricing>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [promoCode, setPromoCode] = useState<string | undefined>()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchAllPricing()
    } else {
      setPricingLoading(false)
    }
  }, [cartItems, promoCode])

  const fetchAllPricing = async () => {
    setPricingLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.current_organization_id) return

      // Fetch pricing for all items
      const pricingPromises = cartItems.map(async (item) => {
        try {
          const response = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: item.product_id,
              quantity: item.quantity,
              customer_organization_id: profile.current_organization_id,
              supplier_organization_id: item.products.organization_id,
              promo_code: promoCode,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            return {
              itemId: item.id,
              ...data.pricing
            }
          }
        } catch (error) {
          console.error(`Error fetching pricing for item ${item.id}:`, error)
        }
        
        // Fallback to base price
        return {
          itemId: item.id,
          unit_price: item.products.base_price,
          line_total: item.products.base_price * item.quantity,
          discount_amount: 0,
          pricing_source: 'base'
        }
      })

      const pricingResults = await Promise.all(pricingPromises)
      const pricingMap = pricingResults.reduce((acc, pricing) => {
        acc[pricing.itemId] = pricing
        return acc
      }, {} as Record<string, CartItemPricing>)

      setItemPricing(pricingMap)
    } catch (error) {
      console.error('Error fetching pricing:', error)
    } finally {
      setPricingLoading(false)
    }
  }

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

  const handleApplyPromoCode = async (code: string) => {
    // Validate promo code exists
    const { data: promoCodeData, error } = await supabase
      .from('promotional_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error || !promoCodeData) {
      return {
        success: false,
        message: 'Invalid or expired promo code'
      }
    }

    // Check if code is still valid
    const now = new Date()
    const validFrom = new Date(promoCodeData.valid_from)
    const validUntil = promoCodeData.valid_until ? new Date(promoCodeData.valid_until) : null

    if (now < validFrom || (validUntil && now > validUntil)) {
      return {
        success: false,
        message: 'This promo code is not currently valid'
      }
    }

    // Check usage limits
    if (promoCodeData.max_uses && promoCodeData.uses_count >= promoCodeData.max_uses) {
      return {
        success: false,
        message: 'This promo code has reached its usage limit'
      }
    }

    setPromoCode(code)
    return {
      success: true,
      message: 'Promo code applied successfully!'
    }
  }

  const handleRemovePromoCode = () => {
    setPromoCode(undefined)
  }

  const calculateSubtotal = () => {
    return Object.values(itemPricing).reduce((total, pricing) => {
      return total + pricing.line_total
    }, 0)
  }

  const calculateTotalDiscount = () => {
    return Object.values(itemPricing).reduce((total, pricing) => {
      return total + pricing.discount_amount
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

  const subtotal = calculateSubtotal()
  const totalDiscount = calculateTotalDiscount()

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow">
        {cartItems.map((item, index) => {
          const pricing = itemPricing[item.id]
          const isLoadingPrice = pricingLoading || !pricing

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
                    {isLoadingPrice ? (
                      <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-gray-600">
                          ${pricing.unit_price.toFixed(2)} / {item.products.unit_of_measure}
                        </p>
                        {pricing.discount_amount > 0 && (
                          <p className="mt-1 text-xs text-green-600">
                            Saved ${pricing.discount_amount.toFixed(2)} • {pricing.pricing_source}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    {isLoadingPrice ? (
                      <div className="h-6 w-20 animate-pulse rounded bg-gray-200"></div>
                    ) : (
                      <p className="text-lg font-bold text-gray-900">
                        ${pricing.line_total.toFixed(2)}
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

      {/* Promo Code Section */}
      <PromoCodeInput
        onApply={handleApplyPromoCode}
        onRemove={handleRemovePromoCode}
        appliedCode={promoCode}
      />

      {/* Order Summary */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h3>
        
        <div className="space-y-2 border-b border-gray-200 pb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              {pricingLoading ? '...' : `$${subtotal.toFixed(2)}`}
            </span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Savings</span>
              <span className="font-medium text-green-600">
                -${totalDiscount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-medium text-gray-900">Total</span>
          <span className="text-2xl font-bold text-gray-900">
            {pricingLoading ? '...' : `$${subtotal.toFixed(2)}`}
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
            disabled={pricingLoading}
            className="flex-1 rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  )
}
