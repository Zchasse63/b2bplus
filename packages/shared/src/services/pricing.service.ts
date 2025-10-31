/**
 * Centralized Pricing Service
 * 
 * This service handles all pricing calculations for the B2B+ platform.
 * It implements a priority-based pricing system that considers multiple
 * pricing strategies and applies them in the correct order.
 * 
 * Pricing Priority (highest to lowest):
 * 1. Price Locks (time-limited guaranteed prices)
 * 2. Contract Prices (negotiated contract rates)
 * 3. Customer-Specific Prices (custom pricing for specific customers)
 * 4. Promotional Codes (temporary discounts)
 * 5. Volume Pricing (quantity-based discounts)
 * 6. Pricing Tiers (customer tier-based pricing)
 * 7. Base Price (default product price)
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  base_price: number;
  organization_id: string;
}

export interface PricingTier {
  id: string;
  tier_name: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  priority: number;
  is_active: boolean;
}

export interface VolumePricing {
  id: string;
  min_quantity: number;
  discount_percentage: number;
  is_active: boolean;
}

export interface CustomerProductPrice {
  id: string;
  custom_price: number;
  is_active: boolean;
}

export interface ContractPrice {
  id: string;
  contract_price: number;
  is_active: boolean;
  contract_id: string;
  contract_status: string;
  contract_start_date: Date;
  contract_end_date: Date;
}

export interface PriceLock {
  id: string;
  locked_price: number;
  locked_until: Date;
  is_active: boolean;
  reason?: string;
}

export interface PromotionalCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  min_order_value: number;
  max_uses: number;
  uses_count: number;
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
  applicable_to: 'all' | 'specific';
  applicable_product_ids?: string[];
  applicable_category_ids?: string[];
}

export interface PricingContext {
  product: Product;
  quantity: number;
  customer_organization_id: string;
  supplier_organization_id: string;
  promo_code?: string;
  order_subtotal?: number;
}

export interface PricingResult {
  unit_price: number;
  line_total: number;
  base_price: number;
  discount_amount: number;
  discount_percentage: number;
  pricing_source: 'price_lock' | 'contract' | 'customer_specific' | 'promotional' | 'volume' | 'tier' | 'base';
  pricing_details: {
    applied_discount?: string;
    tier_name?: string;
    contract_id?: string;
    promo_code?: string;
    volume_discount?: number;
  };
  warnings?: string[];
}

export class PricingService {
  /**
   * Calculate the final price for a product based on all available pricing strategies
   */
  static async calculatePrice(
    context: PricingContext,
    pricingData: {
      priceLocks?: PriceLock[];
      contractPrices?: ContractPrice[];
      customerPrices?: CustomerProductPrice[];
      promoCode?: PromotionalCode;
      volumePricing?: VolumePricing[];
      pricingTiers?: PricingTier[];
    }
  ): Promise<PricingResult> {
    const warnings: string[] = [];
    const basePrice = context.product.base_price;
    
    // 1. Check for Price Locks (highest priority)
    const priceLock = this.findActivePriceLock(pricingData.priceLocks);
    if (priceLock) {
      const unitPrice = priceLock.locked_price;
      const lineTotal = unitPrice * context.quantity;
      const discountAmount = (basePrice - unitPrice) * context.quantity;
      const discountPercentage = ((basePrice - unitPrice) / basePrice) * 100;
      
      return {
        unit_price: unitPrice,
        line_total: lineTotal,
        base_price: basePrice,
        discount_amount: Math.max(0, discountAmount),
        discount_percentage: Math.max(0, discountPercentage),
        pricing_source: 'price_lock',
        pricing_details: {
          applied_discount: priceLock.reason || 'Price lock applied'
        },
        warnings
      };
    }
    
    // 2. Check for Contract Prices
    const contractPrice = this.findActiveContractPrice(pricingData.contractPrices);
    if (contractPrice) {
      const unitPrice = contractPrice.contract_price;
      const lineTotal = unitPrice * context.quantity;
      const discountAmount = (basePrice - unitPrice) * context.quantity;
      const discountPercentage = ((basePrice - unitPrice) / basePrice) * 100;
      
      return {
        unit_price: unitPrice,
        line_total: lineTotal,
        base_price: basePrice,
        discount_amount: Math.max(0, discountAmount),
        discount_percentage: Math.max(0, discountPercentage),
        pricing_source: 'contract',
        pricing_details: {
          contract_id: contractPrice.contract_id,
          applied_discount: 'Contract pricing applied'
        },
        warnings
      };
    }
    
    // 3. Check for Customer-Specific Prices
    const customerPrice = this.findActiveCustomerPrice(pricingData.customerPrices);
    if (customerPrice) {
      const unitPrice = customerPrice.custom_price;
      const lineTotal = unitPrice * context.quantity;
      const discountAmount = (basePrice - unitPrice) * context.quantity;
      const discountPercentage = ((basePrice - unitPrice) / basePrice) * 100;
      
      return {
        unit_price: unitPrice,
        line_total: lineTotal,
        base_price: basePrice,
        discount_amount: Math.max(0, discountAmount),
        discount_percentage: Math.max(0, discountPercentage),
        pricing_source: 'customer_specific',
        pricing_details: {
          applied_discount: 'Customer-specific pricing applied'
        },
        warnings
      };
    }
    
    // 4. Check for Promotional Codes
    if (pricingData.promoCode && context.promo_code) {
      const promoResult = this.applyPromotionalCode(
        basePrice,
        context.quantity,
        pricingData.promoCode,
        context.order_subtotal || 0,
        context.product.id
      );
      
      if (promoResult.applied) {
        return {
          unit_price: promoResult.unit_price,
          line_total: promoResult.line_total,
          base_price: basePrice,
          discount_amount: promoResult.discount_amount,
          discount_percentage: promoResult.discount_percentage,
          pricing_source: 'promotional',
          pricing_details: {
            promo_code: pricingData.promoCode.code,
            applied_discount: `Promo code: ${pricingData.promoCode.description}`
          },
          warnings: promoResult.warnings
        };
      }
      
      warnings.push(...promoResult.warnings);
    }
    
    // 5. Check for Volume Pricing
    const volumeDiscount = this.findVolumeDiscount(pricingData.volumePricing, context.quantity);
    if (volumeDiscount) {
      const discountPercentage = volumeDiscount.discount_percentage;
      const unitPrice = basePrice * (1 - discountPercentage / 100);
      const lineTotal = unitPrice * context.quantity;
      const discountAmount = (basePrice - unitPrice) * context.quantity;
      
      return {
        unit_price: unitPrice,
        line_total: lineTotal,
        base_price: basePrice,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        pricing_source: 'volume',
        pricing_details: {
          volume_discount: discountPercentage,
          applied_discount: `${discountPercentage}% volume discount for ${context.quantity}+ units`
        },
        warnings
      };
    }
    
    // 6. Check for Pricing Tiers
    const tier = this.findPricingTier(pricingData.pricingTiers, context.quantity);
    if (tier) {
      const unitPrice = tier.unit_price;
      const lineTotal = unitPrice * context.quantity;
      const discountAmount = (basePrice - unitPrice) * context.quantity;
      const discountPercentage = ((basePrice - unitPrice) / basePrice) * 100;
      
      return {
        unit_price: unitPrice,
        line_total: lineTotal,
        base_price: basePrice,
        discount_amount: Math.max(0, discountAmount),
        discount_percentage: Math.max(0, discountPercentage),
        pricing_source: 'tier',
        pricing_details: {
          tier_name: tier.tier_name,
          applied_discount: `${tier.tier_name} tier pricing`
        },
        warnings
      };
    }
    
    // 7. Default to Base Price
    const lineTotal = basePrice * context.quantity;
    
    return {
      unit_price: basePrice,
      line_total: lineTotal,
      base_price: basePrice,
      discount_amount: 0,
      discount_percentage: 0,
      pricing_source: 'base',
      pricing_details: {},
      warnings
    };
  }
  
  /**
   * Find an active price lock
   */
  private static findActivePriceLock(priceLocks?: PriceLock[]): PriceLock | null {
    if (!priceLocks || priceLocks.length === 0) return null;
    
    const now = new Date();
    const activeLock = priceLocks.find(lock => 
      lock.is_active && 
      new Date(lock.locked_until) > now
    );
    
    return activeLock || null;
  }
  
  /**
   * Find an active contract price
   */
  private static findActiveContractPrice(contractPrices?: ContractPrice[]): ContractPrice | null {
    if (!contractPrices || contractPrices.length === 0) return null;
    
    const now = new Date();
    const activeContract = contractPrices.find(contract => 
      contract.is_active && 
      contract.contract_status === 'active' &&
      new Date(contract.contract_start_date) <= now &&
      new Date(contract.contract_end_date) >= now
    );
    
    return activeContract || null;
  }
  
  /**
   * Find an active customer-specific price
   */
  private static findActiveCustomerPrice(customerPrices?: CustomerProductPrice[]): CustomerProductPrice | null {
    if (!customerPrices || customerPrices.length === 0) return null;
    
    const activePrice = customerPrices.find(price => price.is_active);
    return activePrice || null;
  }
  
  /**
   * Apply a promotional code
   */
  private static applyPromotionalCode(
    basePrice: number,
    quantity: number,
    promoCode: PromotionalCode,
    orderSubtotal: number,
    productId: string
  ): {
    applied: boolean;
    unit_price: number;
    line_total: number;
    discount_amount: number;
    discount_percentage: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const now = new Date();
    
    // Check if promo code is active
    if (!promoCode.is_active) {
      warnings.push('Promotional code is not active');
      return {
        applied: false,
        unit_price: basePrice,
        line_total: basePrice * quantity,
        discount_amount: 0,
        discount_percentage: 0,
        warnings
      };
    }
    
    // Check validity period
    if (new Date(promoCode.valid_from) > now) {
      warnings.push('Promotional code is not yet valid');
      return {
        applied: false,
        unit_price: basePrice,
        line_total: basePrice * quantity,
        discount_amount: 0,
        discount_percentage: 0,
        warnings
      };
    }
    
    if (new Date(promoCode.valid_until) < now) {
      warnings.push('Promotional code has expired');
      return {
        applied: false,
        unit_price: basePrice,
        line_total: basePrice * quantity,
        discount_amount: 0,
        discount_percentage: 0,
        warnings
      };
    }
    
    // Check usage limits
    if (promoCode.uses_count >= promoCode.max_uses) {
      warnings.push('Promotional code has reached maximum usage limit');
      return {
        applied: false,
        unit_price: basePrice,
        line_total: basePrice * quantity,
        discount_amount: 0,
        discount_percentage: 0,
        warnings
      };
    }
    
    // Check minimum order value
    if (orderSubtotal < promoCode.min_order_value) {
      warnings.push(`Order must be at least $${promoCode.min_order_value} to use this promo code`);
      return {
        applied: false,
        unit_price: basePrice,
        line_total: basePrice * quantity,
        discount_amount: 0,
        discount_percentage: 0,
        warnings
      };
    }
    
    // Check product/category applicability
    if (promoCode.applicable_to === 'specific') {
      const isApplicable = 
        (promoCode.applicable_product_ids && promoCode.applicable_product_ids.includes(productId));
      
      if (!isApplicable) {
        warnings.push('Promotional code is not applicable to this product');
        return {
          applied: false,
          unit_price: basePrice,
          line_total: basePrice * quantity,
          discount_amount: 0,
          discount_percentage: 0,
          warnings
        };
      }
    }
    
    // Apply discount
    let unitPrice = basePrice;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    if (promoCode.discount_type === 'percentage') {
      discountPercentage = promoCode.discount_value;
      unitPrice = basePrice * (1 - discountPercentage / 100);
      discountAmount = (basePrice - unitPrice) * quantity;
    } else if (promoCode.discount_type === 'fixed_amount') {
      // Fixed amount discount is applied to the line total, not per unit
      const lineTotal = basePrice * quantity;
      const discountedLineTotal = Math.max(0, lineTotal - promoCode.discount_value);
      unitPrice = discountedLineTotal / quantity;
      discountAmount = promoCode.discount_value;
      discountPercentage = (discountAmount / lineTotal) * 100;
    }
    // Note: 'free_shipping' is handled at the order level, not product level
    
    return {
      applied: true,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      discount_amount: discountAmount,
      discount_percentage: discountPercentage,
      warnings
    };
  }
  
  /**
   * Find applicable volume discount
   */
  private static findVolumeDiscount(volumePricing?: VolumePricing[], quantity?: number): VolumePricing | null {
    if (!volumePricing || volumePricing.length === 0 || !quantity) return null;
    
    // Find all applicable volume discounts
    const applicable = volumePricing.filter(vp => 
      vp.is_active && quantity >= vp.min_quantity
    );
    
    if (applicable.length === 0) return null;
    
    // Return the one with the highest discount
    return applicable.reduce((max, current) => 
      current.discount_percentage > max.discount_percentage ? current : max
    );
  }
  
  /**
   * Find applicable pricing tier
   */
  private static findPricingTier(pricingTiers?: PricingTier[], quantity?: number): PricingTier | null {
    if (!pricingTiers || pricingTiers.length === 0 || !quantity) return null;
    
    // Find all applicable tiers
    const applicable = pricingTiers.filter(tier => 
      tier.is_active &&
      quantity >= tier.min_quantity &&
      (tier.max_quantity === null || quantity <= tier.max_quantity)
    );
    
    if (applicable.length === 0) return null;
    
    // Return the tier with the highest priority (lowest priority number)
    return applicable.reduce((highest, current) => 
      current.priority < highest.priority ? current : highest
    );
  }
  
  /**
   * Validate a promotional code before applying it
   */
  static validatePromoCode(
    promoCode: PromotionalCode,
    orderSubtotal: number,
    productIds: string[]
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const now = new Date();
    
    if (!promoCode.is_active) {
      errors.push('Promotional code is not active');
    }
    
    if (new Date(promoCode.valid_from) > now) {
      errors.push('Promotional code is not yet valid');
    }
    
    if (new Date(promoCode.valid_until) < now) {
      errors.push('Promotional code has expired');
    }
    
    if (promoCode.uses_count >= promoCode.max_uses) {
      errors.push('Promotional code has reached maximum usage limit');
    }
    
    if (orderSubtotal < promoCode.min_order_value) {
      errors.push(`Order must be at least $${promoCode.min_order_value} to use this promo code`);
    }
    
    if (promoCode.applicable_to === 'specific') {
      const hasApplicableProduct = productIds.some(id => 
        promoCode.applicable_product_ids?.includes(id)
      );
      
      if (!hasApplicableProduct) {
        errors.push('Promotional code is not applicable to any products in your cart');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
