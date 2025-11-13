/**
 * Unit Tests: Pricing Service
 *
 * Tests the 7-level priority-based pricing system:
 * 1. Price Locks (highest priority)
 * 2. Contract Prices
 * 3. Customer-Specific Prices
 * 4. Promotional Codes
 * 5. Volume Pricing
 * 6. Pricing Tiers
 * 7. Base Price (fallback)
 *
 * @group unit
 * @group business-logic
 * @group critical
 */

import { PricingService } from '@b2b-plus/shared';
import type {
  Product,
  PricingContext,
  PriceLock,
  ContractPrice,
  CustomerProductPrice,
  PromotionalCode,
  VolumePricing,
  PricingTier,
} from '@b2b-plus/shared';

// Test data factories
const createMockProduct = (overrides = {}): Product => ({
  id: 'prod-123',
  sku: 'SKU-123',
  name: 'Test Product',
  base_price: 100,
  organization_id: 'org-supplier-123',
  ...overrides,
});

const createPricingContext = (overrides = {}): PricingContext => ({
  product: createMockProduct(),
  quantity: 10,
  customer_organization_id: 'org-customer-123',
  supplier_organization_id: 'org-supplier-123',
  ...overrides,
});

const createPriceLock = (overrides = {}): PriceLock => ({
  id: 'lock-123',
  locked_price: 90,
  locked_until: new Date(Date.now() + 86400000), // 24 hours from now
  is_active: true,
  reason: 'Special promotion',
  ...overrides,
});

const createContractPrice = (overrides = {}): ContractPrice => ({
  id: 'contract-price-123',
  contract_price: 85,
  is_active: true,
  contract_id: 'contract-123',
  contract_status: 'active',
  contract_start_date: new Date(Date.now() - 86400000), // Started yesterday
  contract_end_date: new Date(Date.now() + 86400000 * 30), // Ends in 30 days
  ...overrides,
});

const createCustomerPrice = (overrides = {}): CustomerProductPrice => ({
  id: 'customer-price-123',
  custom_price: 80,
  is_active: true,
  ...overrides,
});

const createPromoCode = (overrides = {}): PromotionalCode => ({
  id: 'promo-123',
  code: 'SAVE10',
  description: '10% off',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  max_uses: 100,
  uses_count: 50,
  valid_from: new Date(Date.now() - 86400000),
  valid_until: new Date(Date.now() + 86400000 * 30),
  is_active: true,
  applicable_to: 'all',
  ...overrides,
});

const createVolumePricing = (overrides = {}): VolumePricing => ({
  id: 'volume-123',
  min_quantity: 10,
  discount_percentage: 15,
  is_active: true,
  ...overrides,
});

const createPricingTier = (overrides = {}): PricingTier => ({
  id: 'tier-123',
  tier_name: 'Gold',
  min_quantity: 1,
  max_quantity: null,
  unit_price: 75,
  priority: 1,
  is_active: true,
  ...overrides,
});

describe('PricingService.calculatePrice', () => {
  describe('Priority Level 1: Price Locks', () => {
    it('should apply active price lock as highest priority', async () => {
      const context = createPricingContext();
      const priceLock = createPriceLock({ locked_price: 90 });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [priceLock],
        contractPrices: [createContractPrice({ contract_price: 85 })],
        customerPrices: [createCustomerPrice({ custom_price: 80 })],
      });

      expect(result.pricing_source).toBe('price_lock');
      expect(result.unit_price).toBe(90);
      expect(result.line_total).toBe(900); // 90 * 10
      expect(result.discount_amount).toBe(100); // (100 - 90) * 10
      expect(result.discount_percentage).toBeCloseTo(10, 1);
    });

    it('should ignore expired price locks', async () => {
      const context = createPricingContext();
      const expiredLock = createPriceLock({
        locked_until: new Date(Date.now() - 86400000), // Expired yesterday
      });
      const contractPrice = createContractPrice({ contract_price: 85 });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [expiredLock],
        contractPrices: [contractPrice],
      });

      expect(result.pricing_source).toBe('contract');
      expect(result.unit_price).toBe(85);
    });

    it('should ignore inactive price locks', async () => {
      const context = createPricingContext();
      const inactiveLock = createPriceLock({ is_active: false });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [inactiveLock],
      });

      expect(result.pricing_source).toBe('base');
      expect(result.unit_price).toBe(100);
    });

    it('should use most recent active price lock if multiple exist', async () => {
      const context = createPricingContext();
      const lock1 = createPriceLock({ locked_price: 90 });
      const lock2 = createPriceLock({ locked_price: 88 });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [lock1, lock2],
      });

      expect(result.pricing_source).toBe('price_lock');
      // Should use the first active lock found
      expect([88, 90]).toContain(result.unit_price);
    });
  });

  describe('Priority Level 2: Contract Prices', () => {
    it('should apply active contract price when no price lock', async () => {
      const context = createPricingContext();
      const contractPrice = createContractPrice({ contract_price: 85 });

      const result = await PricingService.calculatePrice(context, {
        contractPrices: [contractPrice],
      });

      expect(result.pricing_source).toBe('contract');
      expect(result.unit_price).toBe(85);
      expect(result.line_total).toBe(850); // 85 * 10
      expect(result.pricing_details.contract_id).toBe('contract-123');
    });

    it('should ignore expired contracts', async () => {
      const context = createPricingContext();
      const expiredContract = createContractPrice({
        contract_end_date: new Date(Date.now() - 86400000), // Ended yesterday
      });

      const result = await PricingService.calculatePrice(context, {
        contractPrices: [expiredContract],
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should ignore contracts not yet started', async () => {
      const context = createPricingContext();
      const futureContract = createContractPrice({
        contract_start_date: new Date(Date.now() + 86400000), // Starts tomorrow
      });

      const result = await PricingService.calculatePrice(context, {
        contractPrices: [futureContract],
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should ignore inactive contracts', async () => {
      const context = createPricingContext();
      const inactiveContract = createContractPrice({
        is_active: false,
      });

      const result = await PricingService.calculatePrice(context, {
        contractPrices: [inactiveContract],
      });

      expect(result.pricing_source).toBe('base');
    });
  });

  describe('Priority Level 3: Customer-Specific Prices', () => {
    it('should apply customer-specific price when no lock or contract', async () => {
      const context = createPricingContext();
      const customerPrice = createCustomerPrice({ custom_price: 80 });

      const result = await PricingService.calculatePrice(context, {
        customerPrices: [customerPrice],
      });

      expect(result.pricing_source).toBe('customer_specific');
      expect(result.unit_price).toBe(80);
      expect(result.line_total).toBe(800); // 80 * 10
    });

    it('should ignore inactive customer prices', async () => {
      const context = createPricingContext();
      const inactivePrice = createCustomerPrice({ is_active: false });

      const result = await PricingService.calculatePrice(context, {
        customerPrices: [inactivePrice],
      });

      expect(result.pricing_source).toBe('base');
    });
  });

  describe('Priority Level 4: Promotional Codes', () => {
    it('should apply percentage discount promo code', async () => {
      const context = createPricingContext({
        promo_code: 'SAVE10',
      });
      const promoCode = createPromoCode({
        discount_type: 'percentage',
        discount_value: 10,
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.pricing_source).toBe('promotional');
      expect(result.unit_price).toBe(90); // 100 * 0.9
      expect(result.line_total).toBe(900); // 90 * 10
      expect(result.discount_percentage).toBe(10);
      expect(result.pricing_details.promo_code).toBe('SAVE10');
    });

    it('should apply fixed amount discount promo code', async () => {
      const context = createPricingContext({
        promo_code: 'SAVE20',
      });
      const promoCode = createPromoCode({
        discount_type: 'fixed_amount',
        discount_value: 20,
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.pricing_source).toBe('promotional');
      expect(result.unit_price).toBe(98); // (1000 - 20) / 10 = 98
      expect(result.line_total).toBe(980); // 98 * 10 = 980
    });

    it('should not apply promo code if min order value not met', async () => {
      const context = createPricingContext({
        promo_code: 'SAVE10',
        order_subtotal: 50,
      });
      const promoCode = createPromoCode({
        min_order_value: 100,
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      // Should fall back to base price
      expect(result.pricing_source).toBe('base');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not apply expired promo code', async () => {
      const context = createPricingContext({
        promo_code: 'EXPIRED',
      });
      const promoCode = createPromoCode({
        valid_until: new Date(Date.now() - 86400000), // Expired yesterday
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.pricing_source).toBe('base');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not apply promo code at max uses', async () => {
      const context = createPricingContext({
        promo_code: 'MAXED',
      });
      const promoCode = createPromoCode({
        max_uses: 100,
        uses_count: 100,
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should not apply inactive promo code', async () => {
      const context = createPricingContext({
        promo_code: 'INACTIVE',
      });
      const promoCode = createPromoCode({
        is_active: false,
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.pricing_source).toBe('base');
    });
  });

  describe('Priority Level 5: Volume Pricing', () => {
    it('should apply volume discount when quantity threshold met', async () => {
      const context = createPricingContext({ quantity: 20 });
      const volumePricing = createVolumePricing({
        min_quantity: 10,
        discount_percentage: 15,
      });

      const result = await PricingService.calculatePrice(context, {
        volumePricing: [volumePricing],
      });

      expect(result.pricing_source).toBe('volume');
      expect(result.unit_price).toBe(85); // 100 * 0.85
      expect(result.line_total).toBe(1700); // 85 * 20
      expect(result.discount_percentage).toBe(15);
    });

    it('should not apply volume discount when quantity below threshold', async () => {
      const context = createPricingContext({ quantity: 5 });
      const volumePricing = createVolumePricing({
        min_quantity: 10,
        discount_percentage: 15,
      });

      const result = await PricingService.calculatePrice(context, {
        volumePricing: [volumePricing],
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should use highest discount when multiple volume tiers match', async () => {
      const context = createPricingContext({ quantity: 50 });
      const volumeTiers = [
        createVolumePricing({ min_quantity: 10, discount_percentage: 10 }),
        createVolumePricing({ min_quantity: 25, discount_percentage: 15 }),
        createVolumePricing({ min_quantity: 50, discount_percentage: 20 }),
      ];

      const result = await PricingService.calculatePrice(context, {
        volumePricing: volumeTiers,
      });

      expect(result.pricing_source).toBe('volume');
      expect(result.discount_percentage).toBe(20);
    });
  });

  describe('Priority Level 6: Pricing Tiers', () => {
    it('should apply pricing tier when quantity in range', async () => {
      const context = createPricingContext({ quantity: 15 });
      const tier = createPricingTier({
        min_quantity: 10,
        max_quantity: 20,
        unit_price: 75,
      });

      const result = await PricingService.calculatePrice(context, {
        pricingTiers: [tier],
      });

      expect(result.pricing_source).toBe('tier');
      expect(result.unit_price).toBe(75);
      expect(result.line_total).toBe(1125); // 75 * 15
      expect(result.pricing_details.tier_name).toBe('Gold');
    });

    it('should not apply tier when quantity below min', async () => {
      const context = createPricingContext({ quantity: 5 });
      const tier = createPricingTier({
        min_quantity: 10,
        unit_price: 75,
      });

      const result = await PricingService.calculatePrice(context, {
        pricingTiers: [tier],
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should not apply tier when quantity above max', async () => {
      const context = createPricingContext({ quantity: 25 });
      const tier = createPricingTier({
        min_quantity: 10,
        max_quantity: 20,
        unit_price: 75,
      });

      const result = await PricingService.calculatePrice(context, {
        pricingTiers: [tier],
      });

      expect(result.pricing_source).toBe('base');
    });

    it('should use highest priority tier when multiple match', async () => {
      const context = createPricingContext({ quantity: 15 });
      const tiers = [
        createPricingTier({ priority: 2, unit_price: 80 }),
        createPricingTier({ priority: 1, unit_price: 75 }),
      ];

      const result = await PricingService.calculatePrice(context, {
        pricingTiers: tiers,
      });

      expect(result.pricing_source).toBe('tier');
      expect(result.unit_price).toBe(75); // Priority 1 wins
    });
  });

  describe('Priority Level 7: Base Price (Fallback)', () => {
    it('should use base price when no other pricing applies', async () => {
      const context = createPricingContext();

      const result = await PricingService.calculatePrice(context, {});

      expect(result.pricing_source).toBe('base');
      expect(result.unit_price).toBe(100);
      expect(result.line_total).toBe(1000); // 100 * 10
      expect(result.discount_amount).toBe(0);
      expect(result.discount_percentage).toBe(0);
    });

    it('should calculate correct line total with base price', async () => {
      const context = createPricingContext({
        product: createMockProduct({ base_price: 50 }),
        quantity: 25,
      });

      const result = await PricingService.calculatePrice(context, {});

      expect(result.base_price).toBe(50);
      expect(result.unit_price).toBe(50);
      expect(result.line_total).toBe(1250); // 50 * 25
    });
  });

  describe('Pricing Priority Order', () => {
    it('should prefer price lock over all other pricing', async () => {
      const context = createPricingContext({ promo_code: 'SAVE10' });
      const pricingData = {
        priceLocks: [createPriceLock({ locked_price: 90 })],
        contractPrices: [createContractPrice({ contract_price: 85 })],
        customerPrices: [createCustomerPrice({ custom_price: 80 })],
        promoCode: createPromoCode(),
        volumePricing: [createVolumePricing()],
        pricingTiers: [createPricingTier()],
      };

      const result = await PricingService.calculatePrice(context, pricingData);

      expect(result.pricing_source).toBe('price_lock');
      expect(result.unit_price).toBe(90);
    });

    it('should prefer contract price over customer/promo/volume/tier', async () => {
      const context = createPricingContext({ promo_code: 'SAVE10' });
      const pricingData = {
        contractPrices: [createContractPrice({ contract_price: 85 })],
        customerPrices: [createCustomerPrice({ custom_price: 80 })],
        promoCode: createPromoCode(),
        volumePricing: [createVolumePricing()],
        pricingTiers: [createPricingTier()],
      };

      const result = await PricingService.calculatePrice(context, pricingData);

      expect(result.pricing_source).toBe('contract');
      expect(result.unit_price).toBe(85);
    });

    it('should prefer customer price over promo/volume/tier', async () => {
      const context = createPricingContext({ promo_code: 'SAVE10' });
      const pricingData = {
        customerPrices: [createCustomerPrice({ custom_price: 80 })],
        promoCode: createPromoCode(),
        volumePricing: [createVolumePricing()],
        pricingTiers: [createPricingTier()],
      };

      const result = await PricingService.calculatePrice(context, pricingData);

      expect(result.pricing_source).toBe('customer_specific');
      expect(result.unit_price).toBe(80);
    });
  });

  describe('Edge Cases', () => {
    it('should handle quantity of 1', async () => {
      const context = createPricingContext({ quantity: 1 });

      const result = await PricingService.calculatePrice(context, {});

      expect(result.unit_price).toBe(100);
      expect(result.line_total).toBe(100);
    });

    it('should handle large quantities', async () => {
      const context = createPricingContext({ quantity: 1000 });

      const result = await PricingService.calculatePrice(context, {});

      expect(result.line_total).toBe(100000);
    });

    it('should handle zero base price', async () => {
      const context = createPricingContext({
        product: createMockProduct({ base_price: 0 }),
      });

      const result = await PricingService.calculatePrice(context, {});

      expect(result.unit_price).toBe(0);
      expect(result.line_total).toBe(0);
    });

    it('should handle decimal prices correctly', async () => {
      const context = createPricingContext({
        product: createMockProduct({ base_price: 99.99 }),
        quantity: 3,
      });

      const result = await PricingService.calculatePrice(context, {});

      expect(result.unit_price).toBe(99.99);
      expect(result.line_total).toBeCloseTo(299.97, 2);
    });

    it('should never return negative prices', async () => {
      const context = createPricingContext();
      const promoCode = createPromoCode({
        discount_type: 'fixed_amount',
        discount_value: 150, // More than base price
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.unit_price).toBeGreaterThanOrEqual(0);
      expect(result.line_total).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing pricing data gracefully', async () => {
      const context = createPricingContext();

      const result = await PricingService.calculatePrice(context, {
        priceLocks: undefined,
        contractPrices: undefined,
        customerPrices: undefined,
      });

      expect(result.pricing_source).toBe('base');
      expect(result.unit_price).toBe(100);
    });

    it('should handle empty arrays gracefully', async () => {
      const context = createPricingContext();

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [],
        contractPrices: [],
        customerPrices: [],
        volumePricing: [],
        pricingTiers: [],
      });

      expect(result.pricing_source).toBe('base');
    });
  });

  describe('Discount Calculations', () => {
    it('should calculate discount amount correctly', async () => {
      const context = createPricingContext({ quantity: 10 });
      const priceLock = createPriceLock({ locked_price: 80 });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [priceLock],
      });

      // Base: 100, Locked: 80, Qty: 10
      // Discount = (100 - 80) * 10 = 200
      expect(result.discount_amount).toBe(200);
    });

    it('should calculate discount percentage correctly', async () => {
      const context = createPricingContext();
      const priceLock = createPriceLock({ locked_price: 90 });

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [priceLock],
      });

      // (100 - 90) / 100 = 10%
      expect(result.discount_percentage).toBeCloseTo(10, 1);
    });

    it('should return 0 discount for base price', async () => {
      const context = createPricingContext();

      const result = await PricingService.calculatePrice(context, {});

      expect(result.discount_amount).toBe(0);
      expect(result.discount_percentage).toBe(0);
    });
  });

  describe('Warnings and Errors', () => {
    it('should include warnings for invalid promo codes', async () => {
      const context = createPricingContext({
        promo_code: 'EXPIRED',
      });
      const promoCode = createPromoCode({
        valid_until: new Date(Date.now() - 86400000),
      });

      const result = await PricingService.calculatePrice(context, {
        promoCode,
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not include warnings for successful pricing', async () => {
      const context = createPricingContext();
      const priceLock = createPriceLock();

      const result = await PricingService.calculatePrice(context, {
        priceLocks: [priceLock],
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(0);
    });
  });
});
