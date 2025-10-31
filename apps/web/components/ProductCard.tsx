'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@b2b-plus/supabase'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, Package } from 'lucide-react'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleAddToCart = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to add items to cart",
        })
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
        toast({
          variant: "destructive",
          title: "Error",
          description: "No organization found",
        })
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

      toast({
        title: "Added to Cart",
        description: `${quantity} ${product.name} added to your cart`,
      })
      setQuantity(1)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to cart",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg group">
      <div className="relative h-48 w-full bg-neutral-100 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12" />
          </div>
        )}
      </div>
      
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="shrink-0">
            {product.category}
          </Badge>
          {product.units_per_case && (
            <span className="text-xs text-muted-foreground">
              {product.units_per_case} units/case
            </span>
          )}
        </div>
        
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-primary">
              ${product.base_price.toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">
              / {product.unit_of_measure}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>SKU: {product.sku}</div>
          {product.brand && <div>Brand: {product.brand}</div>}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20"
        />
        <Button
          onClick={handleAddToCart}
          disabled={loading}
          className="flex-1 gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {loading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  )
}
