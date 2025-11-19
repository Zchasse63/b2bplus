/**
 * Unified Billing Service
 * 
 * Centralized service for all pricing, tax, and shipping calculations.
 * Single source of truth for billing logic across the application.
 */

export interface LineItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  description?: string
}

export interface BillingInput {
  lineItems: LineItem[]
  organizationId: string
  shippingAddress?: {
    state: string
    country: string
  }
  taxExempt?: boolean
}

export interface BillingOutput {
  subtotal: number
  taxAmount: number
  shippingAmount: number
  total: number
  lineItems: Array<LineItem & { lineTotal: number }>
  breakdown: {
    subtotal: number
    tax: number
    shipping: number
    total: number
  }
}

/**
 * Calculate order total with pricing, tax, and shipping
 */
export async function calculateOrderTotal(
  input: BillingInput
): Promise<BillingOutput> {
  // Calculate subtotal
  const subtotal = input.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  // Calculate tax
  const taxAmount = input.taxExempt
    ? 0
    : await calculateTax(subtotal, input.shippingAddress)

  // Calculate shipping
  const shippingAmount = await calculateShipping(
    subtotal,
    input.shippingAddress
  )

  const total = subtotal + taxAmount + shippingAmount

  return {
    subtotal,
    taxAmount,
    shippingAmount,
    total,
    lineItems: input.lineItems.map(item => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    })),
    breakdown: {
      subtotal,
      tax: taxAmount,
      shipping: shippingAmount,
      total,
    },
  }
}

/**
 * Calculate tax based on location
 */
async function calculateTax(
  subtotal: number,
  shippingAddress?: { state: string; country: string }
): Promise<number> {
  // Default tax rate (8.5%)
  let taxRate = 0.085

  // Apply state-specific rates
  if (shippingAddress?.state) {
    const stateTaxRates: Record<string, number> = {
      CA: 0.0725,
      NY: 0.08,
      TX: 0.0625,
      // Add more states as needed
    }
    taxRate = stateTaxRates[shippingAddress.state] || taxRate
  }

  return Math.round(subtotal * taxRate * 100) / 100
}

/**
 * Calculate shipping cost
 */
async function calculateShipping(
  subtotal: number,
  shippingAddress?: { state: string; country: string }
): Promise<number> {
  // Free shipping over $100
  if (subtotal >= 100) {
    return 0
  }

  // Base shipping cost
  let shippingCost = 10

  // International shipping
  if (shippingAddress?.country && shippingAddress.country !== 'US') {
    shippingCost = 25
  }

  return shippingCost
}

/**
 * Batch calculate pricing for multiple items
 */
export async function batchCalculatePricing(
  items: Array<{ productId: string; quantity: number }>
): Promise<Array<{ productId: string; quantity: number; total: number }>> {
  // This would fetch product prices from database
  // For now, return placeholder
  return items.map(item => ({
    ...item,
    total: item.quantity * 50, // Placeholder price
  }))
}

