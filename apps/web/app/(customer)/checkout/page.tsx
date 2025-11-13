'use client';

import { motion } from 'framer-motion';
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader, Card, Button, Input, Textarea, Modal, Badge } from '@/components/b2b'
import { FiShoppingBag, FiMapPin, FiCreditCard, FiCheckCircle, FiShield, FiLock } from 'react-icons/fi'
import Image from 'next/image'
import { fadeIn, fast } from '@/lib/animations';

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
  const [successModal, setSuccessModal] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const supabase = createClient()
  const router = useRouter()

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

      // Check organization approval status
      const { data: orgMember, error: orgMemberError } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations!inner(
            id,
            name,
            approval_status,
            rejection_reason
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (orgMemberError || !orgMember) {
        throw new Error('Organization membership not found')
      }

      const org = orgMember.organization as any

      if (org.approval_status === 'pending') {
        throw new Error('Your organization is still pending approval. You cannot place orders at this time.')
      }

      if (org.approval_status === 'rejected') {
        const rejectionReason = org.rejection_reason
          ? ` Reason: ${org.rejection_reason}`
          : ''
        throw new Error(`Your organization registration was rejected.${rejectionReason}`)
      }

      if (org.approval_status !== 'approved') {
        throw new Error('Your organization has not been approved for ordering.')
      }

      // Load cart items
      const { data: cart, error: cartError } = await supabase
        .from('cart_items')
        .select('*, products (*)')
        .eq('user_id', user.id)

      if (cartError) throw cartError

      if (!cart || cart.length === 0) {
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
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      alert('Please select a shipping address')
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

      // Send push notification for order submission
      try {
        await fetch('/api/notifications/order-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            status: 'submitted',
          }),
        })
      } catch (notifError) {
        // Don't fail the order if notification fails
        console.error('Failed to send order notification:', notifError)
      }

      setOrderNumber(order.order_number)
      setSuccessModal(true)

    } catch (error) {
      console.error('Error submitting order:', error)
      alert('Failed to submit order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500 dark:text-b2b-gray-500">Loading checkout...</div>
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
    <div className="mt-3">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-b2b-dark dark:text-white">Checkout</h1>
            <p className="mt-1 text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
              Review your order and complete your purchase
            </p>
          </div>
          <FiShoppingBag className="h-8 w-8 text-b2b-yellow" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Shipping Address */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <FiMapPin className="h-5 w-5 text-b2b-yellow" />
              <h2 className="text-lg font-bold text-b2b-dark dark:text-white">Shipping Address</h2>
            </div>
            <div className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-b2b-gray-500 dark:text-b2b-gray-500">
                  No shipping addresses found. Please add one in settings.
                </p>
              ) : (
                addresses.map(address => (
                  <div
                    key={address.id}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      selectedAddressId === address.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 hover:border-brand-300 dark:border-navy-700 dark:hover:border-brand-500'
                    }`}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-b2b-dark dark:text-white">{address.label}</p>
                        <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">{address.contact_name}</p>
                        <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">{address.street_address}</p>
                        {address.street_address2 && (
                          <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">{address.street_address2}</p>
                        )}
                        <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">{address.phone}</p>
                      </div>
                      {address.is_default && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Order Details */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <FiCreditCard className="h-5 w-5 text-b2b-yellow" />
              <h2 className="text-lg font-bold text-b2b-dark dark:text-white">Order Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-b2b-dark dark:text-white">
                  Purchase Order Number
                </label>
                <p className="mb-2 text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
                  Enter your PO number for tracking and reference
                </p>
                <Input
                  id="po-number"
                  placeholder="e.g., PO-2025-001"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  maxLength={50}
                />
                {poNumber && (
                  <p className="mt-1 text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
                    {poNumber.length}/50 characters
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-b2b-dark dark:text-white">
                  Order Notes (Optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-6">
            <div className="mb-4 flex items-center gap-2">
              <FiShoppingBag className="h-5 w-5 text-b2b-yellow" />
              <h2 className="text-lg font-bold text-b2b-dark dark:text-white">Order Summary</h2>
            </div>

            {/* Cart Items */}
            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.products.image_url && (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-700">
                      <Image
                        src={item.products.image_url}
                        alt={item.products.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-b2b-dark dark:text-white">
                      {item.products.name}
                    </p>
                    <p className="text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
                      Qty: {item.quantity} × ${item.products.base_price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-b2b-dark dark:text-white">
                    ${(item.quantity * item.products.base_price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-navy-700">
              <div className="flex justify-between text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-b2b-dark dark:text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Tax (8%)</span>
                <span className="font-medium text-b2b-dark dark:text-white">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                <span>Shipping</span>
                <span className="font-medium text-b2b-dark dark:text-white">
                  {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              {subtotal < 500 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Add ${(500 - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-navy-700">
                <span className="text-b2b-dark dark:text-white">Total</span>
                <span className="text-b2b-yellow">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 mb-4 p-4 bg-b2b-green-50 dark:bg-b2b-green-900/10 rounded-lg border border-b2b-green-200 dark:border-b2b-green-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiShield className="h-5 w-5 text-b2b-green" />
                <p className="text-sm font-semibold text-b2b-green">
                  Your information is secure
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs text-b2b-gray-600 dark:text-b2b-gray-400">
                <div className="flex items-center gap-1">
                  <FiLock className="h-3 w-3" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiShield className="h-3 w-3" />
                  <span>PCI Compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiCheckCircle className="h-3 w-3" />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-0 w-full"
              onClick={handleSubmitOrder}
              disabled={submitting || !selectedAddressId}
              loading={submitting}
              icon={<FiLock />}
            >
              {submitting ? 'Placing Order...' : 'Place Secure Order'}
            </Button>

            <p className="mt-3 text-center text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
              By placing this order, you agree to our terms and conditions
            </p>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => {
          setSuccessModal(false)
          router.push('/orders')
        }}
        title="Order Placed Successfully!"
        size="md"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <FiCheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-b2b-dark dark:text-white">
            Thank you for your order!
          </h3>
          <p className="mb-4 text-b2b-gray-500 dark:text-b2b-gray-500">
            Your order <span className="font-semibold text-b2b-yellow">{orderNumber}</span> has been
            submitted successfully.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSuccessModal(false)
                router.push('/products')
              }}
            >
              Continue Shopping
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setSuccessModal(false)
                router.push('/orders')
              }}
            >
              View Orders
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
