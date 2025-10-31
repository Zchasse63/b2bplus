'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, MapPin, FileText, ArrowLeft, Truck, ShoppingCart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface OrderItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit_price: number
  line_total: number
}

interface ShippingAddress {
  label: string
  contact_name: string
  phone: string
  street_address: string
  street_address2?: string
  city: string
  state: string
  postal_code: string
}

interface Order {
  id: string
  order_number: string
  status: string
  subtotal: number
  tax: number
  shipping_cost: number
  total: number
  po_number?: string
  notes?: string
  submitted_at: string
  shipped_at?: string
  delivered_at?: string
  shipping_tracking_number?: string
  shipping_carrier?: string
  created_at: string
  order_items: OrderItem[]
  shipping_addresses: ShippingAddress
}

const statusColors: Record<string, string> = {
  draft: 'bg-neutral-200 text-neutral-800',
  submitted: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderDetailsPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { toast } = useToast()
  const [reordering, setReordering] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          shipping_addresses (*)
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReorder = async () => {
    setReordering(true)
    try {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder')
      }

      toast({
        title: 'Success!',
        description: data.message,
      })

      // Redirect to cart after a short delay
      setTimeout(() => {
        router.push('/cart')
      }, 1000)
    } catch (error) {
      console.error('Reorder error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reorder. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-500 mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/orders')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-500 mb-2">
                Order {order.order_number}
              </h1>
              <p className="text-muted-foreground">
                Placed on {format(new Date(order.submitted_at || order.created_at), 'MMMM dd, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleReorder}
                disabled={reordering}
                className="bg-primary hover:bg-primary/90"
              >
                {reordering ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Reorder All Items
              </Button>
              <Badge className={statusColors[order.status]} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.unit_price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-lg">
                        ${item.line_total.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-semibold">{order.shipping_addresses.label}</p>
                  <p className="text-muted-foreground">{order.shipping_addresses.contact_name}</p>
                  <p className="text-muted-foreground">{order.shipping_addresses.street_address}</p>
                  {order.shipping_addresses.street_address2 && (
                    <p className="text-muted-foreground">{order.shipping_addresses.street_address2}</p>
                  )}
                  <p className="text-muted-foreground">
                    {order.shipping_addresses.city}, {order.shipping_addresses.state} {order.shipping_addresses.postal_code}
                  </p>
                  <p className="text-muted-foreground">{order.shipping_addresses.phone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            {(order.shipping_tracking_number || order.shipped_at) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.shipped_at && (
                    <p className="text-sm">
                      <span className="font-medium">Shipped:</span>{' '}
                      {format(new Date(order.shipped_at), 'MMMM dd, yyyy')}
                    </p>
                  )}
                  {order.delivered_at && (
                    <p className="text-sm">
                      <span className="font-medium">Delivered:</span>{' '}
                      {format(new Date(order.delivered_at), 'MMMM dd, yyyy')}
                    </p>
                  )}
                  {order.shipping_carrier && (
                    <p className="text-sm">
                      <span className="font-medium">Carrier:</span> {order.shipping_carrier}
                    </p>
                  )}
                  {order.shipping_tracking_number && (
                    <p className="text-sm">
                      <span className="font-medium">Tracking:</span> {order.shipping_tracking_number}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {(order.po_number || order.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.po_number && (
                    <p className="text-sm">
                      <span className="font-medium">PO Number:</span> {order.po_number}
                    </p>
                  )}
                  {order.notes && (
                    <p className="text-sm">
                      <span className="font-medium">Notes:</span> {order.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>
                      {order.shipping_cost === 0 ? 'FREE' : `$${order.shipping_cost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/products')}
                >
                  Order Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
