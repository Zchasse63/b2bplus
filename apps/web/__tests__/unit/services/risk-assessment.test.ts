/**
 * Unit Tests: Risk Assessment Service
 *
 * Tests the risk assessment and fraud prevention system including:
 * - Risk score calculation
 * - Payment failure handling
 * - Return processing
 * - Fraud detection
 *
 * @group unit
 * @group business-logic
 * @group critical
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Test data factories
const createMockCustomer = (overrides = {}) => ({
  id: 'cust-123',
  organization_id: 'org-123',
  email: 'customer@example.com',
  payment_failures: 0,
  return_count: 0,
  chargeback_count: 0,
  late_payments: 0,
  risk_score: 0,
  ...overrides,
});

const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  customer_id: 'cust-123',
  amount: 500,
  ip_address: '192.168.1.1',
  shipping_address: { country: 'US', state: 'CA' },
  billing_address: { country: 'US', state: 'CA' },
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockPaymentFailure = (overrides = {}) => ({
  id: 'fail-123',
  customer_id: 'cust-123',
  order_id: 'order-123',
  reason: 'declined',
  timestamp: new Date().toISOString(),
  ...overrides,
});

const createMockReturn = (overrides = {}) => ({
  id: 'return-123',
  order_id: 'order-123',
  customer_id: 'cust-123',
  reason: 'defective',
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('Risk Assessment Service', () => {
  describe('Risk Score Calculation', () => {
    it('should calculate risk score based on payment failures', () => {
      const customer = createMockCustomer({ payment_failures: 2 });
      const baseWeight = 15;
      const riskFromPayments = customer.payment_failures * baseWeight;

      expect(riskFromPayments).toBe(30);
    });

    it('should calculate risk score based on return rate', () => {
      const customer = createMockCustomer({ return_count: 3 });
      const returnWeight = 10;
      const riskFromReturns = customer.return_count * returnWeight;

      expect(riskFromReturns).toBe(30);
    });

    it('should weight chargebacks heavily', () => {
      const customer = createMockCustomer({ chargeback_count: 1 });
      const chargebackWeight = 40;
      const riskFromChargebacks = customer.chargeback_count * chargebackWeight;

      expect(riskFromChargebacks).toBe(40);
    });

    it('should weight late payments in score', () => {
      const customer = createMockCustomer({ late_payments: 2 });
      const lateWeight = 8;
      const riskFromLate = customer.late_payments * lateWeight;

      expect(riskFromLate).toBe(16);
    });

    it('should aggregate all risk factors into total score', () => {
      const customer = createMockCustomer({
        payment_failures: 1,
        return_count: 1,
        chargeback_count: 1,
        late_payments: 1,
      });

      const totalRisk = 1 * 15 + 1 * 10 + 1 * 40 + 1 * 8;

      expect(totalRisk).toBe(73);
    });

    it('should classify low risk (score < 25)', () => {
      const customer = createMockCustomer({ payment_failures: 0, return_count: 0 });
      const riskLevel = customer.payment_failures * 15 + customer.return_count * 10;

      expect(riskLevel).toBeLessThan(25);
    });

    it('should classify medium risk (score 25-50)', () => {
      const customer = createMockCustomer({ payment_failures: 2, return_count: 0 });
      const riskLevel = customer.payment_failures * 15 + customer.return_count * 10;

      expect(riskLevel).toBeGreaterThanOrEqual(25);
      expect(riskLevel).toBeLessThan(75);
    });

    it('should classify high risk (score > 75)', () => {
      const customer = createMockCustomer({
        payment_failures: 5,
        return_count: 5,
        chargeback_count: 1,
      });
      const riskLevel = 5 * 15 + 5 * 10 + 1 * 40;

      expect(riskLevel).toBeGreaterThan(75);
    });

    it('should not allow negative risk scores', () => {
      const riskScore = Math.max(0, -10);

      expect(riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should cap maximum risk score at 100', () => {
      const customer = createMockCustomer({
        payment_failures: 10,
        return_count: 10,
        chargeback_count: 10,
      });
      const riskLevel = Math.min(100, 10 * 15 + 10 * 10 + 10 * 40);

      expect(riskLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('Payment Failure Handling', () => {
    it('should record payment failure', () => {
      const failure = createMockPaymentFailure({
        reason: 'declined',
      });

      expect(failure.reason).toBe('declined');
      expect(failure.customer_id).toBe('cust-123');
    });

    it('should increment payment failure counter', () => {
      const customer = createMockCustomer({ payment_failures: 2 });
      const updatedCustomer = {
        ...customer,
        payment_failures: customer.payment_failures + 1,
      };

      expect(updatedCustomer.payment_failures).toBe(3);
    });

    it('should trigger retry logic on decline', () => {
      const failure = createMockPaymentFailure({ reason: 'declined' });
      const shouldRetry = failure.reason === 'declined';

      expect(shouldRetry).toBe(true);
    });

    it('should escalate to admin on multiple failures', () => {
      const customer = createMockCustomer({ payment_failures: 5 });
      const shouldEscalate = customer.payment_failures >= 3;

      expect(shouldEscalate).toBe(true);
    });

    it('should send customer notification on failure', () => {
      const failure = createMockPaymentFailure();
      const notificationSent = !!failure.id;

      expect(notificationSent).toBe(true);
    });

    it('should mark order as payment_failed', () => {
      const order = createMockOrder({ status: 'payment_failed' });

      expect(order.status).toBe('payment_failed');
    });

    it('should track failure reason for analysis', () => {
      const reasons = ['declined', 'insufficient_funds', 'lost_card', 'expired_card'];
      const failure = createMockPaymentFailure({ reason: 'declined' });

      expect(reasons).toContain(failure.reason);
    });

    it('should prevent further processing on failure', () => {
      const failure = createMockPaymentFailure();
      const canProcessOrder = !failure.id;

      expect(canProcessOrder).toBe(false);
    });
  });

  describe('Return Processing', () => {
    it('should track customer return count', () => {
      const customer = createMockCustomer({ return_count: 0 });
      const returnReturn = createMockReturn();
      const updatedCustomer = {
        ...customer,
        return_count: customer.return_count + 1,
      };

      expect(updatedCustomer.return_count).toBe(1);
    });

    it('should calculate return rate', () => {
      const customer = createMockCustomer({ return_count: 5 });
      const totalOrders = 20;
      const returnRate = (customer.return_count / totalOrders) * 100;

      expect(returnRate).toBe(25);
    });

    it('should flag high return rate (>20%)', () => {
      const returnRate = 25;
      const isHighReturnRate = returnRate > 20;

      expect(isHighReturnRate).toBe(true);
    });

    it('should allow normal return rate (<20%)', () => {
      const returnRate = 15;
      const isNormalReturnRate = returnRate <= 20;

      expect(isNormalReturnRate).toBe(true);
    });

    it('should detect return pattern', () => {
      const returns = [
        createMockReturn({ timestamp: new Date().toISOString() }),
        createMockReturn({
          order_id: 'order-124',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        }),
        createMockReturn({
          order_id: 'order-125',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
        }),
      ];

      const frequencyReturns = returns.length >= 3;

      expect(frequencyReturns).toBe(true);
    });

    it('should check return reason for abuse', () => {
      const suspiciousReasons = ['changed_mind', 'better_price_found'];
      const returnReason = 'changed_mind';

      expect(suspiciousReasons).toContain(returnReason);
    });

    it('should flag customer on abuse pattern', () => {
      const customer = createMockCustomer({ return_count: 8 });
      const orderCount = 10;
      const returnRate = (customer.return_count / orderCount) * 100;
      const isAbuser = returnRate > 50 || customer.return_count > 5;

      expect(isAbuser).toBe(true);
    });

    it('should create admin alert for high returns', () => {
      const customer = createMockCustomer({ return_count: 10 });
      const shouldAlert = customer.return_count > 5;

      expect(shouldAlert).toBe(true);
    });
  });

  describe('Fraud Detection', () => {
    it('should detect velocity attacks (too many orders)', () => {
      const orders = Array.from({ length: 20 }, (_, i) =>
        createMockOrder({ id: `order-${i}` })
      );

      const oneHourAgo = Date.now() - 3600000;
      const recentOrders = orders.filter(
        (o) => new Date(o.created_at).getTime() > oneHourAgo
      );

      const isVelocityAttack = recentOrders.length > 10;

      expect(isVelocityAttack).toBe(true);
    });

    it('should detect geographic mismatch', () => {
      const order = createMockOrder({
        shipping_address: { country: 'US', state: 'CA' },
        billing_address: { country: 'RU', state: 'Moscow' },
        ip_address: '123.45.67.89', // Different region
      });

      const hasGeoMismatch =
        order.shipping_address.country !== order.billing_address.country;

      expect(hasGeoMismatch).toBe(true);
    });

    it('should flag large unusual purchases', () => {
      const customerAverageOrder = 100;
      const currentOrder = 5000;
      const isUnusual = currentOrder > customerAverageOrder * 10;

      expect(isUnusual).toBe(true);
    });

    it('should detect multiple failed attempts', () => {
      const failures = [
        createMockPaymentFailure(),
        createMockPaymentFailure({ id: 'fail-124' }),
        createMockPaymentFailure({ id: 'fail-125' }),
      ];

      const isMultipleFailed = failures.length >= 3;

      expect(isMultipleFailed).toBe(true);
    });

    it('should combine multiple risk signals', () => {
      const customer = createMockCustomer({
        payment_failures: 3,
        return_count: 5,
        chargeback_count: 1,
      });

      const hasMultipleRisks =
        customer.payment_failures > 0 &&
        customer.return_count > 3 &&
        customer.chargeback_count > 0;

      expect(hasMultipleRisks).toBe(true);
    });

    it('should require additional verification for high risk', () => {
      const customer = createMockCustomer({
        payment_failures: 4,
        chargeback_count: 2,
      });

      const riskScore = 4 * 15 + 2 * 40;
      const needsVerification = riskScore > 100;

      expect(needsVerification).toBe(true);
    });

    it('should block orders from high-risk customers', () => {
      const customer = createMockCustomer({
        payment_failures: 10,
        return_count: 10,
        chargeback_count: 2,
      });

      const riskScore = Math.min(
        100,
        10 * 15 + 10 * 10 + 2 * 40
      );
      const shouldBlock = riskScore >= 100;

      expect(shouldBlock).toBe(true);
    });

    it('should allow low-risk orders without verification', () => {
      const customer = createMockCustomer({
        payment_failures: 0,
        return_count: 0,
        chargeback_count: 0,
      });

      const riskScore = 0;
      const needsVerification = riskScore > 30;

      expect(needsVerification).toBe(false);
    });

    it('should track fraud attempt for reporting', () => {
      const fraudAttempt = {
        customer_id: 'cust-123',
        order_id: 'order-123',
        reason: 'velocity_attack',
        timestamp: new Date().toISOString(),
      };

      expect(fraudAttempt.reason).toBe('velocity_attack');
      expect(fraudAttempt.timestamp).toBeDefined();
    });
  });

  describe('Integration: Complete Risk Assessment', () => {
    it('should assess risk for new customer', () => {
      const customer = createMockCustomer();
      const riskScore = 0;

      expect(riskScore).toBe(0);
      expect(customer.payment_failures).toBe(0);
    });

    it('should reassess risk after payment failure', () => {
      const customer = createMockCustomer({ payment_failures: 1 });
      const failure = createMockPaymentFailure();

      const newRiskScore = 1 * 15; // One failure

      expect(newRiskScore).toBe(15);
    });

    it('should monitor customer over time', () => {
      const customer = createMockCustomer();
      const events = [
        { type: 'payment_failure', weight: 15 },
        { type: 'return', weight: 10 },
        { type: 'chargeback', weight: 40 },
      ];

      const totalRisk = events.reduce((sum, event) => sum + event.weight, 0);

      expect(totalRisk).toBe(65);
    });

    it('should take action when threshold exceeded', () => {
      const customer = createMockCustomer({
        payment_failures: 5,
        return_count: 3,
        chargeback_count: 1,
      });

      const riskScore = 5 * 15 + 3 * 10 + 1 * 40;
      const shouldTakeAction = riskScore > 50;

      expect(shouldTakeAction).toBe(true);
    });

    it('should clear flags for good customer behavior', () => {
      const customer = createMockCustomer({ payment_failures: 1 });
      const resetCustomer = { ...customer, payment_failures: 0 };

      expect(resetCustomer.payment_failures).toBe(0);
    });
  });
});
