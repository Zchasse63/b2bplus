# B2B+ Comprehensive Seed Data Strategy

This document outlines the strategy for seeding comprehensive test data across all tables in the B2B+ platform to enable realistic UI/UX testing.

## Current State

The database currently has minimal seed data:
- **Organizations:** 5 (3 from seed script + 2 additional)
- **Profiles:** 6 users
- **Products:** 17 (7 for Acme Distributor, 10 for Acme Restaurant Group)
- **Orders:** 4
- **Cart Items:** 1
- **Shipping Addresses:** 5

## Seed Data Goals

The goal is to create a realistic, comprehensive dataset that enables:
1. **Multi-organization testing** - Test data for all organization types
2. **User journey testing** - Complete workflows from browsing to ordering
3. **Feature validation** - Data for all implemented features
4. **UI/UX evaluation** - Realistic data volumes and variety
5. **Edge case testing** - Boundary conditions and special scenarios

## Seed Data Plan by Table

### Core Tables (Already Seeded)

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `organizations` | 5 | 8 | Add 3 more diverse organizations |
| `profiles` | 6 | 15 | Add more users with varying roles |
| `organization_members` | ~6 | 20+ | Link users to multiple organizations |
| `products` | 17 | 100+ | Add products for all organizations |
| `shipping_addresses` | 5 | 15 | Multiple addresses per organization |

### Order & Cart Tables

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `orders` | 4 | 50+ | Historical orders across all statuses |
| `order_items` | ~4 | 150+ | Multiple items per order |
| `cart_items` | 1 | 20+ | Active carts for multiple users |
| `carts` | Unknown | 10+ | Shopping cart sessions |

### Pricing & Promotions

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `pricing_tiers` | 0 | 20+ | Volume-based pricing for products |
| `volume_pricing` | 0 | 30+ | Tiered pricing rules |
| `promotional_codes` | 0 | 15+ | Active and expired promo codes |
| `promo_code_usage` | 0 | 30+ | Historical promo code usage |
| `customer_product_prices` | 0 | 50+ | Custom pricing for specific customers |
| `price_locks` | 0 | 10+ | Locked prices for contracts |
| `contracts` | 0 | 8+ | Customer contracts |
| `contract_prices` | 0 | 40+ | Contract-specific pricing |

### Container Optimization

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `container_types` | 4 | 10+ | Various container sizes |
| `container_sessions` | 0 | 25+ | Historical optimization sessions |

### Notifications & Communications

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `notifications_queue` | 0 | 40+ | Pending and sent notifications |
| `email_queue` | 0 | 30+ | Email delivery queue |
| `sms_queue` | 0 | 20+ | SMS delivery queue |
| `email_bounces` | 0 | 5+ | Bounced email records |
| `sms_opt_outs` | 0 | 3+ | SMS opt-out records |

### Marketing & Campaigns

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `campaigns` | 0 | 12+ | Various campaign types |
| `campaign_templates` | 0 | 8+ | Reusable campaign templates |
| `campaign_segments` | 0 | 15+ | Audience segments |
| `campaign_recipients` | 0 | 100+ | Campaign delivery records |
| `campaign_clicks` | 0 | 50+ | Click tracking |
| `campaign_conversions` | 0 | 20+ | Conversion tracking |
| `campaign_links` | 0 | 30+ | Trackable links |

### Order Templates & Approvals

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `order_templates` | 0 | 15+ | Saved order templates |
| `template_shares` | 0 | 10+ | Shared templates |
| `approval_workflows` | 0 | 5+ | Approval process definitions |
| `order_approvals` | 0 | 20+ | Orders pending approval |
| `approval_history` | 0 | 30+ | Approval decision history |

### Organization Management

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `organization_invitations` | 0 | 10+ | Pending and accepted invitations |
| `organization_branding` | 0 | 5+ | Custom branding per organization |
| `organization_activity_logs` | 0 | 100+ | Activity tracking |

### User Preferences & Consent

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `consent_records` | ~20 | 60+ | User consent tracking |
| `customer_preferences` | 0 | 15+ | User preference settings |
| `preference_change_history` | 0 | 30+ | Preference change audit trail |
| `unsubscribe_tokens` | 0 | 5+ | Unsubscribe tokens |

### Security & Compliance

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `mfa_settings` | 0 | 5+ | MFA configuration |
| `mfa_factors` | 0 | 8+ | MFA methods |
| `mfa_challenges` | 0 | 15+ | MFA challenge history |
| `mfa_backup_codes` | 0 | 20+ | Backup codes |
| `audit_logs` | 0 | 200+ | Comprehensive audit trail |
| `data_export_requests` | 0 | 5+ | GDPR export requests |
| `data_deletion_requests` | 0 | 2+ | GDPR deletion requests |

### Webhooks & Events

| Table | Current Count | Target Count | Notes |
| :--- | :--- | :--- | :--- |
| `message_webhook_events` | 0 | 40+ | Webhook delivery tracking |
| `discount_stacking_rules` | 0 | 5+ | Discount combination rules |

## Seed Data Scenarios

### Scenario 1: Active Restaurant Chain
**Organization:** Acme Restaurant Group (existing)
- **Users:** 5 users (owner, admin, 2 members, 1 viewer)
- **Products:** 50+ products across all categories
- **Orders:** 20+ orders in various states
- **Active Carts:** 3 users with items in cart
- **Templates:** 5 order templates
- **Pricing:** Custom pricing tiers and volume discounts
- **Campaigns:** 3 active campaigns

### Scenario 2: Hotel Chain
**Organization:** Grand Hotel Chain (existing)
- **Users:** 4 users
- **Products:** 40+ hospitality-focused products
- **Orders:** 15+ orders
- **Contracts:** 2 active contracts with locked pricing
- **Approval Workflow:** Multi-step approval process
- **Notifications:** Email and SMS notifications enabled

### Scenario 3: Hospital System
**Organization:** City Hospital (existing)
- **Users:** 3 users
- **Products:** 30+ medical/cafeteria products
- **Orders:** 10+ orders
- **Templates:** 3 recurring order templates
- **Compliance:** Full audit trail and consent records

### Scenario 4: New Distributor
**Organization:** Acme Distributor (existing)
- **Products:** Full catalog of 100+ products
- **Pricing:** Complex pricing tiers
- **Customers:** Serves all other organizations

### Scenario 5: School District
**Organization:** New - Metro School District
- **Users:** 4 users
- **Products:** 25+ cafeteria products
- **Orders:** 8+ orders
- **Budget Controls:** Approval workflows

### Scenario 6: Catering Company
**Organization:** New - Elite Catering Co.
- **Users:** 3 users
- **Products:** 35+ catering-focused products
- **Orders:** 12+ orders
- **Container Optimization:** Heavy use of 3D packing

## Implementation Approach

The seed data will be implemented in the following order:

1. **Organizations & Users** - Expand user base and organizations
2. **Products** - Add comprehensive product catalog
3. **Pricing & Contracts** - Set up pricing structures
4. **Historical Orders** - Create order history
5. **Active Carts** - Populate shopping carts
6. **Templates & Workflows** - Set up reusable templates
7. **Campaigns & Marketing** - Add marketing data
8. **Notifications** - Populate notification queues
9. **Container Sessions** - Add optimization history
10. **Audit & Compliance** - Add audit trails and consent

## Data Realism Principles

To ensure the seed data is realistic:

1. **Temporal Distribution** - Orders and activities spread across the last 6 months
2. **Realistic Quantities** - Order quantities match typical business patterns
3. **Price Variation** - Different pricing for different customer tiers
4. **Status Distribution** - Mix of completed, pending, and cancelled orders
5. **User Behavior** - Realistic patterns of cart abandonment, template usage
6. **Seasonal Patterns** - Higher order volumes during peak seasons
7. **Product Popularity** - Some products ordered more frequently than others

## Expected Outcomes

After seeding, the database will have:
- **Total Records:** 1,500+ across all tables
- **Organizations:** 8 diverse organizations
- **Users:** 15+ users with varied roles
- **Products:** 100+ products
- **Orders:** 50+ orders with complete history
- **Complete Feature Coverage:** Data for all implemented features

This will enable comprehensive UI/UX testing and provide a realistic environment for evaluating the platform's performance and user experience.
