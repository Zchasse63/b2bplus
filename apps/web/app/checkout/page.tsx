'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShoppingBag, MapPin, CreditCard } from 'lucide-react'

interface CartItem {
  id: string
  quantity: number
  product_id: string
  products: {
    id: string
    name: string
    sku: string
    base_price: number
    image_url: string
  }
}

interface ShippingAddress {
  id: string
  label: string
  contact_name: string
  phone: string
  street_address: string
  street_address2?: string
  city: string
  state: string
  postal_code: string
  is_default: boolean
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [poNumber, setPoNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [pricing, setPricing] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.current_organization_id) {
        throw new Error('No organization found')
      }

      // Load cart items
      const { data: cart, error: cartError } = await supabase
        .from('cart_items')
        .select('*, products (*)')
        .eq('user_id', user.id)

      if (cartError) throw cartError
      
      if (!cart || cart.length === 0) {
        toast({
          title: 'Empty Cart',
          description: 'Your cart is empty. Add some products first.',
          variant: 'destructive',
        })
        router.push('/products')
        return
      }

      setCartItems(cart)

      // Load shipping addresses
      const { data: addressData, error: addressError } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('organization_id', profile.current_organization_id)
        .order('is_default', { ascending: false })

      if (addressError) throw addressError
      setAddresses(addressData || [])
      
      // Select default address
      const defaultAddress = addressData?.find(a => a.is_default)
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
      }

      // Calculate pricing
      const items = cart.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        basePrice: item.products.base_price,
      }))

      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: profile.current_organization_id,
          userId: user.id,
          items,
        }),
      })

      if (response.ok) {
        const pricingData = await response.json()
        setPricing(pricingData)
      }

    } catch (error) {
      console.error('Error loading checkout data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load checkout data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      toast({
        title: 'Address Required',
        description: 'Please select a shipping address',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      // Calculate totals
      const subtotal = pricing?.totalPrice || cartItems.reduce((sum, item) => 
        sum + (item.products.base_price * item.quantity), 0
      )
      const tax = subtotal * 0.08 // 8% tax rate
      const shippingCost = subtotal > 500 ? 0 : 50 // Free shipping over $500
      const total = subtotal + tax + shippingCost

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          organization_id: profile?.current_organization_id,
          user_id: user.id,
          status: 'submitted',
          subtotal,
          tax,
          shipping_cost: shippingCost,
          total,
          shipping_address_id: selectedAddressId,
          po_number: poNumber || null,
          notes: notes || null,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        sku: item.products.sku,
        name: item.products.name,
        quantity: item.quantity,
        unit_price: item.products.base_price,
        line_total: item.products.base_price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (clearError) throw clearError

      toast({
        title: 'Order Placed!',
        description: `Order ${order.order_number} has been submitted successfully.`,
      })

      router.push(`/orders/${order.id}`)

    } catch (error) {
      console.error('Error submitting order:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit order. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const subtotal = pricing?.totalPrice || cartItems.reduce((sum, item) => 
    sum + (item.products.base_price * item.quantity), 0
  )
  const tax = subtotal * 0.08
  const shippingCost = subtotal > 500 ? 0 : 50
  const total = subtotal + tax + shippingCost

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-secondary-500 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.length === 0 ? (
                  <p className="text-muted-foreground">No shipping addresses found. Please add one in settings.</p>
                ) : (
                  addresses.map(address => (
                    <div
                      key={address.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary-50'
                          : 'border-neutral-200 hover:border-primary'
                      }`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{address.label}</p>
                          <p className="text-sm text-muted-foreground">{address.contact_name}</p>
                          <p className="text-sm text-muted-foreground">{address.street_address}</p>
                          {address.street_address2 && (
                            <p className="text-sm text-muted-foreground">{address.street_address2}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                        </div>
                        {address.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="po-number">PO Number (Optional)</Label>
                  <Input
                    id="po-number"
                    placeholder="Enter purchase order number"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Any special instructions?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.products.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × ${item.products.base_price.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">
                        ${(item.quantity * item.products.base_price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  {subtotal < 500 && (
                    <p className="text-xs text-muted-foreground">
                      Add ${(500 - subtotal).toFixed(2)} more for free shipping
                    </p>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={submitting || !selectedAddressId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
