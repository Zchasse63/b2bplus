'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader, Card, Button, Input, Textarea, Modal, Badge } from '@/components/b2b'
import { toast } from '@/hooks/use-toast'
import { FiShoppingBag, FiMapPin, FiCreditCard, FiCheckCircle, FiShield, FiLock } from 'react-icons/fi'
import Image from 'next/image'
import { orderCreateSchema } from '@/lib/validation/schemas'

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
  const [paymentTerms, setPaymentTerms] = useState<string>('net_30')
  const [pricing, setPricing] = useState<any>(null)
  const [successModal, setSuccessModal] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const loadCheckoutData = useCallback(async () => {
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
  }, [router, supabase])

  useEffect(() => {
    loadCheckoutData()
  }, [loadCheckoutData])

  const handleSubmitOrder = async () => {
    setSubmitting(true)

    try {
      // Prepare order data for validation
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
        })),
        shippingAddressId: selectedAddressId,
        poNumber: poNumber || undefined,
        notes: notes || undefined,
      }

      // Validate with Zod
      const validation = orderCreateSchema.safeParse(orderData)

      if (!validation.success) {
        const fieldErrors = validation.error.flatten().fieldErrors
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.[0]}`)
          .join(', ')

        toast({
          title: 'Validation Error',
          description: errorMessages,
          variant: 'destructive',
        })
        setSubmitting(false)
        return
      }

      // Use validated data
      const validatedData = validation.data

      // SECURITY: Use server-side endpoint that validates all pricing
      // This prevents price manipulation attacks
      const response = await fetch('/api/checkout/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddressId: validatedData.shippingAddressId,
          poNumber: validatedData.poNumber || null,
          notes: validatedData.notes || null,
          paymentTerms: paymentTerms || 'net_30',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order')
      }

      setOrderNumber(data.order.order_number)
      setSuccessModal(true)

    } catch (error) {
      console.error('Error submitting order:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit order. Please try again.',
        variant: 'destructive',
      })
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

  // NOTE: These calculations are for DISPLAY ONLY
  // Real pricing is calculated server-side during order submission
  // This prevents price manipulation attacks
  const subtotal = pricing?.totalPrice || cartItems.reduce((sum, item) =>
    sum + (item.products.base_price * item.quantity), 0
  )
  const tax = subtotal * 0.08
  const shippingCost = subtotal > 500 ? 0 : 50
  const total = subtotal + tax + shippingCost

  return (
    <div className="mt-3 animate-fadeIn">
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
                  Payment Terms
                </label>
                <p className="mb-2 text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
                  Select your preferred payment terms
                </p>
                <select
                  id="payment-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-b2b-dark transition-colors hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-800 dark:text-white dark:hover:border-brand-500"
                >
                  <option value="net_30">Net 30 Days</option>
                  <option value="net_60">Net 60 Days</option>
                  <option value="net_90">Net 90 Days</option>
                  <option value="prepaid">Prepaid</option>
                  <option value="credit_card">Credit Card (Future)</option>
                </select>
                <p className="mt-2 text-xs text-b2b-gray-500 dark:text-b2b-gray-500">
                  {paymentTerms === 'net_30' && 'Payment due within 30 days of invoice date'}
                  {paymentTerms === 'net_60' && 'Payment due within 60 days of invoice date'}
                  {paymentTerms === 'net_90' && 'Payment due within 90 days of invoice date'}
                  {paymentTerms === 'prepaid' && 'Payment required before shipment'}
                  {paymentTerms === 'credit_card' && 'Credit card payment (coming soon)'}
                </p>
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
