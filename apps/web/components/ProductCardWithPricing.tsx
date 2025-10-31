'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePricing } from '@/hooks/usePricing'
import type { Product } from '@b2b-plus/supabase'

interface ProductCardProps {
  product: Product
}

export default function ProductCardWithPricing({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  // Use the pricing hook to get dynamic pricing
  const { pricing, loading: pricingLoading, error: pricingError } = usePricing({
    productId: product.id,
    quantity,
  })

  const handleAddToCart = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage({ type: 'error', text: 'Please sign in to add items to cart' })
        setLoading(false)
        return
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.current_organization_id) {
        setMessage({ type: 'error', text: 'No organization found' })
        setLoading(false)
        return
      }

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)

        if (error) throw error
      } else {
        // Insert new cart item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            organization_id: profile.current_organization_id,
            product_id: product.id,
            quantity,
          })

        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Added to cart!' })
      setQuantity(1)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setMessage({ type: 'error', text: 'Failed to add to cart' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Calculate display price
  const displayPrice = pricing?.unit_price ?? product.base_price
  const hasDiscount = pricing && pricing.discount_amount > 0
  const savingsAmount = pricing?.discount_amount ?? 0
  const savingsPercentage = pricing?.discount_percentage ?? 0

  // Get pricing source label
  const getPricingSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      base: 'Regular Price',
      tier: 'Tier Pricing',
      volume: 'Volume Discount',
      promotional: 'Promotional',
      contract: 'Contract Price',
      customer: 'Special Price',
      price_lock: 'Price Lock',
    }
    return labels[source] || 'Special Price'
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-lg">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-48 w-full bg-gray-200">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image
            </div>
          )}
          
          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute right-2 top-2 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              Save {savingsPercentage.toFixed(0)}%
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            {product.category}
          </span>
        </div>
        
        <Link href={`/products/${product.id}`} className="block hover:text-blue-600 transition-colors">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{product.name}</h3>
        </Link>
        
        {product.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">{product.description}</p>
        )}
        
        {/* Pricing Section */}
        <div className="mb-3">
          {pricingLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>
              <span className="text-sm text-gray-500">Loading price...</span>
            </div>
          ) : pricingError ? (
            <div className="text-sm text-red-600">Price unavailable</div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    ${displayPrice.toFixed(2)}
                  </span>
                  <span className="ml-1 text-sm text-gray-500">/ {product.unit_of_measure}</span>
                </div>
                {product.units_per_case && (
                  <span className="text-xs text-gray-500">{product.units_per_case} units</span>
                )}
              </div>
              
              {/* Show original price if discounted */}
              {hasDiscount && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-gray-500 line-through">
                    ${product.base_price.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    Save ${savingsAmount.toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* Pricing source badge */}
              {pricing && pricing.pricing_source !== 'base' && (
                <div className="mt-2">
                  <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    {getPricingSourceLabel(pricing.pricing_source)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-3 text-xs text-gray-500">
          SKU: {product.sku}
          {product.brand && ` • ${product.brand}`}
        </div>

        {message && (
          <div className={`mb-3 rounded p-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            onClick={(e) => e.stopPropagation()}
            className="w-20 rounded border border-gray-300 px-3 py-2 text-center"
          />
          <button
            onClick={(e) => {
              e.preventDefault()
              handleAddToCart()
            }}
            disabled={loading || pricingLoading}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
