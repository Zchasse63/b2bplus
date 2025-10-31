'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShoppingCart, Package, AlertCircle, ChevronRight } from 'lucide-react'

type Product = {
  id: string
  sku: string
  name: string
  description: string
  category: string
  subcategory: string | null
  brand: string | null
  base_price: number
  unit_of_measure: string
  units_per_case: number | null
  weight_lbs: number | null
  dimensions_inches: {
    length: number
    width: number
    height: number
  } | null
  in_stock: boolean
  image_url: string | null
  additional_images: string[] | null
  specifications: Record<string, any> | null
  allergens: string[] | null
  nutritional_info: Record<string, any> | null
}

type Props = {
  product: Product
  organizationId: string | null
  relatedProducts: Array<{
    id: string
    name: string
    sku: string
    base_price: number
    image_url: string | null
    category: string
  }>
}

export default function ProductDetail({ product, organizationId, relatedProducts }: Props) {
  const [selectedImage, setSelectedImage] = useState(product.image_url)
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(product.base_price)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  // All available images (main + additional)
  const allImages = [
    product.image_url,
    ...(product.additional_images || [])
  ].filter(Boolean) as string[]

  // Fetch custom price when quantity changes
  useEffect(() => {
    if (!organizationId) {
      setPrice(product.base_price)
      return
    }

    const fetchPrice = async () => {
      setLoading(true)
      
      try {
        // Use our pricing API
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setPrice(product.base_price)
          setLoading(false)
          return
        }

        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            userId: user.id,
            items: [{
              productId: product.id,
              quantity,
              basePrice: product.base_price,
            }],
          }),
        })

        if (response.ok) {
          const pricingData = await response.json()
          if (pricingData.items && pricingData.items.length > 0) {
            setPrice(pricingData.items[0].unit_price)
          } else {
            setPrice(product.base_price)
          }
        } else {
          setPrice(product.base_price)
        }
      } catch (error) {
        console.error('Error fetching price:', error)
        setPrice(product.base_price)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
  }, [quantity, organizationId, product.id, product.base_price])

  const addToCart = async () => {
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    try {
      // Check if already in cart
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
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)

        if (error) throw error

        toast({
          title: 'Cart Updated',
          description: `Updated quantity to ${existingItem.quantity + quantity}`,
        })
      } else {
        // Insert new
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            organization_id: organizationId!,
            quantity
          })

        if (error) throw error

        toast({
          title: 'Added to Cart',
          description: `${product.name} has been added to your cart`,
        })
      }

      // Refresh to update cart count in header
      router.refresh()
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary transition-colors">
            Products
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link 
            href={`/products?category=${product.category}`} 
            className="hover:text-primary transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Left Column: Images */}
          <div>
            {/* Main Image */}
            <Card className="mb-4 overflow-hidden">
              <div className="relative aspect-square bg-neutral-100">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-24 w-24 mb-4" />
                    <p>No image available</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img 
                        ? 'border-primary shadow-md' 
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div>
            {/* Stock status */}
            {!product.in_stock && (
              <Badge variant="destructive" className="mb-3">
                <AlertCircle className="h-3 w-3 mr-1" />
                Out of Stock
              </Badge>
            )}

            <h1 className="text-4xl font-bold text-secondary-500 mb-3">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-4 text-muted-foreground">
              <p>SKU: <span className="font-medium text-foreground">{product.sku}</span></p>
              {product.brand && (
                <>
                  <span>•</span>
                  <p>Brand: <span className="font-medium text-foreground">{product.brand}</span></p>
                </>
              )}
            </div>

            {/* Price */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-5xl font-bold text-primary">
                    ${loading ? '...' : price.toFixed(2)}
                  </span>
                  {price < product.base_price && (
                    <span className="text-xl text-muted-foreground line-through">
                      ${product.base_price.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">per {product.unit_of_measure}</p>
                {product.units_per_case && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.units_per_case} units per {product.unit_of_measure}
                  </p>
                )}
                {price < product.base_price && (
                  <Badge variant="secondary" className="mt-2">
                    Special Pricing Applied
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Add to Cart */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      disabled={!product.in_stock}
                      className="text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>&nbsp;</Label>
                    <Button
                      onClick={addToCart}
                      disabled={adding || !product.in_stock}
                      className="w-full"
                      size="lg"
                    >
                      {adding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Total: <span className="font-semibold text-foreground">
                    ${(price * quantity).toFixed(2)}
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Description */}
            {product.description && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex border-b pb-2">
                  <dt className="w-1/3 text-muted-foreground">Category:</dt>
                  <dd className="w-2/3 font-medium">{product.category}</dd>
                </div>
                {product.subcategory && (
                  <div className="flex border-b pb-2">
                    <dt className="w-1/3 text-muted-foreground">Subcategory:</dt>
                    <dd className="w-2/3 font-medium">{product.subcategory}</dd>
                  </div>
                )}
                {product.weight_lbs && (
                  <div className="flex border-b pb-2">
                    <dt className="w-1/3 text-muted-foreground">Weight:</dt>
                    <dd className="w-2/3 font-medium">{product.weight_lbs} lbs</dd>
                  </div>
                )}
                {product.dimensions_inches && (
                  <div className="flex border-b pb-2">
                    <dt className="w-1/3 text-muted-foreground">Dimensions:</dt>
                    <dd className="w-2/3 font-medium">
                      {product.dimensions_inches.length}" L × {product.dimensions_inches.width}" W × {product.dimensions_inches.height}" H
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex border-b pb-2">
                      <dt className="w-1/3 text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}:
                      </dt>
                      <dd className="w-2/3 font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Allergens */}
          {product.allergens && product.allergens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Allergen Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {product.allergens.map((allergen) => (
                    <Badge key={allergen} variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nutritional Info */}
          {product.nutritional_info && Object.keys(product.nutritional_info).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nutritional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(product.nutritional_info).map(([key, value]) => (
                    <div key={key} className="flex border-b pb-2">
                      <dt className="w-1/2 text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}:
                      </dt>
                      <dd className="w-1/2 font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-secondary-500 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/products/${related.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    {related.image_url && (
                      <div className="relative aspect-square bg-neutral-100">
                        <Image
                          src={related.image_url}
                          alt={related.name}
                          fill
                          className="object-contain p-4 group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {related.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">{related.sku}</p>
                      <p className="font-bold text-primary">${related.base_price.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
