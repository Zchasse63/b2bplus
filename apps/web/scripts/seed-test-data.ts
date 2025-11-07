/**
 * Comprehensive Test Data Seeding Script
 * Seeds ALL aspects of the B2B+ platform for E2E testing
 *
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to generate UUIDs
function uuid() {
  return randomUUID();
}

async function seedTestData() {
  console.log('🌱 Starting comprehensive test data seeding...\n');

  try {
    // ============================================
    // 0. CLEAN UP EXISTING TEST DATA
    // ============================================
    console.log('🧹 Cleaning up existing test data...');

    // Get all demo organizations
    const { data: demoOrgs } = await supabase
      .from('organizations')
      .select('id')
      .or('slug.like.%demo%,name.like.%Demo%');

    if (demoOrgs && demoOrgs.length > 0) {
      const orgIds = demoOrgs.map(o => o.id);

      // Delete in reverse order of dependencies
      await supabase.from('email_campaign_recipients').delete().like('email', '%demo%');
      await supabase.from('email_campaigns').delete().or('name.like.%Demo%,name.like.%Spring%,name.like.%Reorder%');
      await supabase.from('chatbot_conversations').delete().in('organization_id', orgIds);
      await supabase.from('pricing_recommendations').delete().in('organization_id', orgIds);
      await supabase.from('customer_opportunities').delete().in('customer_id', orgIds);
      await supabase.from('historical_order_items').delete();
      await supabase.from('historical_orders').delete();
      await supabase.from('order_items').delete().in('order_id',
        (await supabase.from('orders').select('id').in('organization_id', orgIds)).data?.map(o => o.id) || []
      );
      await supabase.from('orders').delete().in('organization_id', orgIds);
      await supabase.from('sku_mappings').delete().or('old_system.eq.bailey');
      await supabase.from('products').delete().in('organization_id', orgIds);
      await supabase.from('shipping_addresses').delete().in('organization_id', orgIds);
      await supabase.from('vendor_invoices').delete().or('vendor_name.like.%Bailey%,vendor_name.like.%EcoServe%');
      await supabase.from('purchase_orders').delete().or('vendor_name.like.%Bailey%,vendor_name.like.%EcoServe%');
      await supabase.from('vendors').delete().or('vendor_code.eq.BAILEY-001,vendor_code.eq.ECO-002');
      await supabase.from('leads').delete().or('email.like.%demo%,email.like.%prospect%,email.like.%newrestaurant%,email.like.%hotelchain%');
      await supabase.from('organization_members').delete().in('organization_id', orgIds);
      await supabase.from('organizations').delete().in('id', orgIds);

      console.log(`  ✓ Cleaned up ${demoOrgs.length} demo organizations and related data\n`);
    } else {
      console.log('  ✓ No existing test data to clean up\n');
    }

    // ============================================
    // 1. CREATE TEST USERS
    // ============================================
    console.log('👤 Creating test users...');

    const testUsers = [
      {
        email: 'customer@demo.com',
        password: 'customer123',
        full_name: 'Demo Customer',
      },
      {
        email: 'admin@demo.com',
        password: 'admin123',
        full_name: 'Demo Admin',
      },
      {
        email: 'test@e2etest.com',
        password: 'TestPassword123!',
        full_name: 'E2E Test User',
      },
    ];

    const createdUsers: any[] = [];

    for (const user of testUsers) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users.find(u => u.email === user.email);

      let userId: string;

      if (userExists) {
        console.log(`  ✓ User ${user.email} already exists`);
        userId = userExists.id;
      } else {
        // Create user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
          },
        });

        if (authError) {
          console.error(`  ✗ Error creating user ${user.email}:`, authError.message);
          continue;
        }

        userId = authData.user.id;
        console.log(`  ✓ Created user ${user.email}`);
      }

      createdUsers.push({ ...user, id: userId });

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user.email,
          full_name: user.full_name,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.log(`  ⚠ Could not create profile for ${user.email}: ${profileError.message}`);
      } else {
        console.log(`  ✓ Created profile for ${user.email}`);
      }
    }

    if (createdUsers.length === 0) {
      throw new Error('No users were created. Cannot continue seeding.');
    }

    const customerUser = createdUsers.find(u => u.email === 'customer@demo.com');
    const adminUser = createdUsers.find(u => u.email === 'admin@demo.com');

    if (!customerUser) {
      throw new Error('Customer user was not created');
    }

    // ============================================
    // 2. CREATE MULTIPLE ORGANIZATIONS (COMPREHENSIVE)
    // ============================================
    console.log('\n🏢 Creating organizations...');

    // Get the customer's organization (created automatically by trigger)
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', customerUser.id)
      .single();

    const orgId = customerProfile?.current_organization_id;

    if (!orgId) {
      throw new Error('Customer organization not found');
    }

    console.log('  ✓ Using customer organization');

    // Create additional test organizations of different types
    const additionalOrgs = [
      {
        id: uuid(),
        name: 'Grand Hotel & Spa',
        slug: 'grand-hotel-spa',
        type: 'hotel',
        pricing_tier: 2,
        approval_status: 'approved',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'City General Hospital',
        slug: 'city-general-hospital',
        type: 'hospital',
        pricing_tier: 3,
        approval_status: 'approved',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'Lincoln Elementary School',
        slug: 'lincoln-elementary',
        type: 'school',
        pricing_tier: 1,
        approval_status: 'approved',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'Pending Restaurant',
        slug: 'pending-restaurant',
        type: 'restaurant',
        pricing_tier: 1,
        approval_status: 'pending',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { error: orgsError } = await supabase
      .from('organizations')
      .insert(additionalOrgs);

    if (orgsError) {
      console.error('  ✗ Error creating additional organizations:', orgsError.message);
    } else {
      console.log(`  ✓ Created ${additionalOrgs.length} additional organizations`);
    }

    // Add admin user to all approved organizations
    const approvedOrgs = additionalOrgs.filter(o => o.approval_status === 'approved');
    const adminMemberships = approvedOrgs.map(org => ({
      id: uuid(),
      organization_id: org.id,
      user_id: adminUser.id,
      role: 'admin',
      created_at: new Date().toISOString(),
    }));

    if (adminMemberships.length > 0) {
      await supabase.from('organization_members').insert(adminMemberships);
      console.log(`  ✓ Added admin to ${adminMemberships.length} organizations`);
    }

    // ============================================
    // 3. CREATE PRODUCTS
    // ============================================
    console.log('\n📦 Creating products...');

    const products = [
      {
        id: uuid(),
        organization_id: orgId,
        name: '12oz Paper Cup',
        sku: 'CUP-12OZ-001',
        description: 'Disposable 12oz paper cup for hot beverages',
        category: 'Cups',
        base_price: 0.15,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=12oz+Cup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: '16oz Paper Cup',
        sku: 'CUP-16OZ-001',
        description: 'Disposable 16oz paper cup for hot beverages',
        category: 'Cups',
        base_price: 0.18,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=16oz+Cup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Plastic Fork',
        sku: 'FORK-001',
        description: 'Heavy duty plastic fork',
        category: 'Utensils',
        base_price: 0.05,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Fork',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Plastic Knife',
        sku: 'KNIFE-001',
        description: 'Heavy duty plastic knife',
        category: 'Utensils',
        base_price: 0.05,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Knife',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Plastic Spoon',
        sku: 'SPOON-001',
        description: 'Heavy duty plastic spoon',
        category: 'Utensils',
        base_price: 0.05,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Spoon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Paper Plate 9"',
        sku: 'PLATE-9IN-001',
        description: '9 inch disposable paper plate',
        category: 'Plates',
        base_price: 0.12,
        unit_of_measure: 'case',
        units_per_case: 500,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=9in+Plate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Paper Napkin',
        sku: 'NAPKIN-001',
        description: 'Standard paper napkin',
        category: 'Napkins',
        base_price: 0.02,
        unit_of_measure: 'case',
        units_per_case: 5000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Napkin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Plastic Lid for 12oz Cup',
        sku: 'LID-12OZ-001',
        description: 'Plastic lid for 12oz cup',
        category: 'Lids',
        base_price: 0.08,
        unit_of_measure: 'case',
        units_per_case: 1000,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=12oz+Lid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Takeout Container Small',
        sku: 'CONTAINER-SM-001',
        description: 'Small plastic takeout container',
        category: 'Containers',
        base_price: 0.25,
        unit_of_measure: 'case',
        units_per_case: 150,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Small+Container',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        name: 'Takeout Container Large',
        sku: 'CONTAINER-LG-001',
        description: 'Large plastic takeout container',
        category: 'Containers',
        base_price: 0.35,
        unit_of_measure: 'case',
        units_per_case: 150,
        in_stock: true,
        image_url: 'https://placehold.co/400x400/png?text=Large+Container',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdProducts, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (productsError) {
      console.error('  ✗ Error creating products:', productsError.message);
      throw productsError;
    }

    console.log(`  ✓ Created ${products.length} products`);

    // ============================================
    // 4. CREATE ORDERS
    // ============================================
    console.log('\n📋 Creating orders...');

    const orders = [
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        order_number: 'ORD-001',
        status: 'delivered',
        subtotal: 450.00,
        tax: 36.00,
        shipping_cost: 15.00,
        total: 501.00,
        submitted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        order_number: 'ORD-002',
        status: 'shipped',
        subtotal: 320.50,
        tax: 25.64,
        shipping_cost: 12.00,
        total: 358.14,
        submitted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        shipped_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        order_number: 'ORD-003',
        status: 'processing',
        subtotal: 275.00,
        tax: 22.00,
        shipping_cost: 10.00,
        total: 307.00,
        submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        order_number: 'ORD-004',
        status: 'submitted',
        subtotal: 180.00,
        tax: 14.40,
        shipping_cost: 8.00,
        total: 202.40,
        submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { data: createdOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
      .select();

    if (ordersError) {
      console.error('  ✗ Error creating orders:', ordersError.message);
      throw ordersError;
    }

    console.log(`  ✓ Created ${orders.length} orders`);

    // ============================================
    // 5. CREATE ORDER ITEMS
    // ============================================
    console.log('\n📦 Creating order items...');

    if (!createdOrders || !createdProducts) {
      console.error('  ✗ Cannot create order items without orders and products');
      throw new Error('Missing orders or products');
    }

    const orderItems = [
      // Order 1 items
      {
        id: uuid(),
        order_id: createdOrders[0].id,
        product_id: createdProducts[0].id,
        sku: createdProducts[0].sku,
        name: createdProducts[0].name,
        quantity: 10,
        unit_price: createdProducts[0].base_price,
        line_total: 10 * createdProducts[0].base_price,
        created_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        order_id: createdOrders[0].id,
        product_id: createdProducts[2].id,
        sku: createdProducts[2].sku,
        name: createdProducts[2].name,
        quantity: 20,
        unit_price: createdProducts[2].base_price,
        line_total: 20 * createdProducts[2].base_price,
        created_at: new Date().toISOString(),
      },
      // Order 2 items
      {
        id: uuid(),
        order_id: createdOrders[1].id,
        product_id: createdProducts[1].id,
        sku: createdProducts[1].sku,
        name: createdProducts[1].name,
        quantity: 8,
        unit_price: createdProducts[1].base_price,
        line_total: 8 * createdProducts[1].base_price,
        created_at: new Date().toISOString(),
      },
      // Order 3 items
      {
        id: uuid(),
        order_id: createdOrders[2].id,
        product_id: createdProducts[8].id,
        sku: createdProducts[8].sku,
        name: createdProducts[8].name,
        quantity: 5,
        unit_price: createdProducts[8].base_price,
        line_total: 5 * createdProducts[8].base_price,
        created_at: new Date().toISOString(),
      },
      // Order 4 items
      {
        id: uuid(),
        order_id: createdOrders[3].id,
        product_id: createdProducts[6].id,
        sku: createdProducts[6].sku,
        name: createdProducts[6].name,
        quantity: 50,
        unit_price: createdProducts[6].base_price,
        line_total: 50 * createdProducts[6].base_price,
        created_at: new Date().toISOString(),
      },
    ];

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('  ✗ Error creating order items:', orderItemsError.message);
      throw orderItemsError;
    }

    console.log(`  ✓ Created ${orderItems.length} order items`);

    // ============================================
    // 6. CREATE CUSTOMER OPPORTUNITIES
    // ============================================
    console.log('\n💡 Creating customer opportunities...');

    const opportunities = [
      {
        id: uuid(),
        customer_id: customerUser.id, // User ID, not organization ID
        opportunity_type: 'cross_sell',
        product_id: createdProducts[0].id, // 12oz Cup
        related_product_id: createdProducts[7].id, // Lid for 12oz Cup
        confidence_score: 0.85,
        potential_revenue: 120.00,
        ai_reasoning: 'Customer frequently orders cups but never orders lids. High probability of lid purchase.',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        customer_id: customerUser.id,
        opportunity_type: 'upsell',
        product_id: createdProducts[8].id, // Small Container
        related_product_id: createdProducts[9].id, // Large Container
        confidence_score: 0.72,
        potential_revenue: 85.00,
        ai_reasoning: 'Customer orders small containers. Recommend upgrading to large containers for better value.',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        customer_id: customerUser.id,
        opportunity_type: 'reorder',
        product_id: createdProducts[6].id, // Napkins
        confidence_score: 0.65,
        potential_revenue: 50.00,
        ai_reasoning: 'Customer has not ordered napkins in 60 days. Previous regular purchaser.',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { error: opportunitiesError } = await supabase
      .from('customer_opportunities')
      .insert(opportunities);

    if (opportunitiesError) {
      console.error('  ✗ Error creating opportunities:', opportunitiesError.message);
      throw opportunitiesError;
    }

    console.log(`  ✓ Created ${opportunities.length} opportunities`);

    // ============================================
    // 7. CREATE PRICING RECOMMENDATIONS
    // ============================================
    console.log('\n💰 Creating pricing recommendations...');

    const pricingRecommendations = [
      {
        id: uuid(),
        organization_id: orgId,
        product_id: createdProducts[0].id,
        recommendation_type: 'competitive_match',
        current_price: createdProducts[0].base_price,
        recommended_price: createdProducts[0].base_price * 1.13,
        price_change_percentage: 13.0,
        reasoning: 'Market analysis shows 13% price increase is optimal. Competitor pricing supports this adjustment.',
        confidence_score: 0.78,
        expected_impact: 'Estimated revenue increase of $250/month',
        status: 'pending',
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        product_id: createdProducts[1].id,
        recommendation_type: 'volume_discount',
        current_price: createdProducts[1].base_price,
        recommended_price: createdProducts[1].base_price * 0.95,
        price_change_percentage: -5.0,
        reasoning: 'Slight price decrease recommended to increase volume. Customer price sensitivity analysis suggests this will boost sales.',
        confidence_score: 0.65,
        expected_impact: 'Estimated revenue increase of $180/month through volume',
        status: 'pending',
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { error: pricingError } = await supabase
      .from('pricing_recommendations')
      .insert(pricingRecommendations);

    if (pricingError) {
      console.error('  ✗ Error creating pricing recommendations:', pricingError.message);
      // Don't throw - this is optional
    } else {
      console.log(`  ✓ Created ${pricingRecommendations.length} pricing recommendations`);
    }

    // ============================================
    // 8. CREATE CHATBOT CONVERSATIONS
    // ============================================
    console.log('\n💬 Creating chatbot conversations...');

    const sessionId = `session-${Date.now()}`;
    const conversations = [
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        session_id: sessionId,
        message_role: 'user',
        message_content: 'What are my recent orders?',
        model_version: 'gemini-2.5-flash',
        tokens_used: 12,
        confidence_score: 0.95,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        user_id: customerUser.id,
        session_id: sessionId,
        message_role: 'assistant',
        message_content: 'You have 4 recent orders. Your most recent order (ORD-004) was submitted yesterday for $202.40.',
        model_version: 'gemini-2.5-flash',
        tokens_used: 45,
        confidence_score: 0.92,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2000).toISOString(),
      },
    ];

    const { error: conversationsError } = await supabase
      .from('chatbot_conversations')
      .insert(conversations);

    if (conversationsError) {
      console.error('  ✗ Error creating conversations:', conversationsError.message);
      // Don't throw - this is optional
    } else {
      console.log(`  ✓ Created ${conversations.length} chatbot messages`);
    }

    // ============================================
    // 9. CREATE VENDORS
    // ============================================
    console.log('\n🏭 Creating vendors...');

    const vendors = [
      {
        id: uuid(),
        name: 'Bailey Packaging Co.',
        vendor_code: 'BAILEY-001',
        email: 'orders@baileypackaging.com',
        phone: '555-0100',
        website: 'https://baileypackaging.com',
        address_line1: '123 Industrial Pkwy',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'USA',
        payment_terms: 'Net 30',
        default_payment_method: 'ACH',
        is_active: true,
        is_trusted: true,
        notes: 'Primary packaging supplier - legacy system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'EcoServe Supplies',
        vendor_code: 'ECO-002',
        email: 'sales@ecoserve.com',
        phone: '555-0200',
        website: 'https://ecoserve.com',
        address_line1: '456 Green St',
        city: 'Portland',
        state: 'OR',
        postal_code: '97201',
        country: 'USA',
        payment_terms: 'Net 60',
        default_payment_method: 'Check',
        is_active: true,
        is_trusted: false,
        notes: 'Eco-friendly products supplier',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdVendors, error: vendorsError } = await supabase
      .from('vendors')
      .insert(vendors)
      .select();

    if (vendorsError) {
      console.error('  ✗ Error creating vendors:', vendorsError.message);
      throw vendorsError;
    }

    console.log(`  ✓ Created ${createdVendors.length} vendors`);

    // ============================================
    // 10. CREATE PURCHASE ORDERS
    // ============================================
    console.log('\n📋 Creating purchase orders...');

    const purchaseOrders = [
      {
        id: uuid(),
        po_number: 'PO-2025-001',
        vendor_id: createdVendors[0].id,
        vendor_name: 'Bailey Packaging Co.',
        po_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'received',
        subtotal: 2500.00,
        tax_amount: 200.00,
        shipping_amount: 150.00,
        total_amount: 2850.00,
        line_items: JSON.stringify([
          { sku: 'CUP-12OZ-WHT-1000', product_name: '12oz White Paper Cup', quantity: 10, unit_price: 150.00, total: 1500.00 },
          { sku: 'LID-12OZ-WHT-1000', product_name: 'Lid for 12oz Cup', quantity: 10, unit_price: 100.00, total: 1000.00 },
        ]),
        payment_terms: 'Net 30',
        payment_status: 'paid',
        notes: 'Regular monthly order',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        po_number: 'PO-2025-002',
        vendor_id: createdVendors[1].id,
        vendor_name: 'EcoServe Supplies',
        po_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        subtotal: 1800.00,
        tax_amount: 144.00,
        shipping_amount: 100.00,
        total_amount: 2044.00,
        line_items: JSON.stringify([
          { sku: 'NAP-ECO-6000', product_name: 'Eco-Friendly Napkins', quantity: 20, unit_price: 90.00, total: 1800.00 },
        ]),
        payment_terms: 'Net 60',
        payment_status: 'unpaid',
        notes: 'First order from new eco-friendly supplier',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdPOs, error: posError } = await supabase
      .from('purchase_orders')
      .insert(purchaseOrders)
      .select();

    if (posError) {
      console.error('  ✗ Error creating purchase orders:', posError.message);
      throw posError;
    }

    console.log(`  ✓ Created ${createdPOs.length} purchase orders`);

    // ============================================
    // 11. CREATE VENDOR INVOICES
    // ============================================
    console.log('\n📄 Creating vendor invoices...');

    const vendorInvoices = [
      {
        id: uuid(),
        invoice_number: 'INV-BAILEY-2025-001',
        vendor_id: createdVendors[0].id,
        vendor_name: 'Bailey Packaging Co.',
        invoice_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 2500.00,
        tax_amount: 200.00,
        shipping_amount: 150.00,
        total_amount: 2850.00,
        line_items: JSON.stringify([
          { sku: 'CUP-12OZ-WHT-1000', product_name: '12oz White Paper Cup', quantity: 10, unit_price: 150.00, total: 1500.00 },
          { sku: 'LID-12OZ-WHT-1000', product_name: 'Lid for 12oz Cup', quantity: 10, unit_price: 100.00, total: 1000.00 },
        ]),
        file_url: 'https://storage.example.com/invoices/bailey-001.pdf',
        file_name: 'bailey-001.pdf',
        file_size: 125000,
        extraction_status: 'completed',
        extraction_confidence: 0.98,
        extracted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
        matched_po_id: createdPOs[0].id,
        match_status: 'matched',
        match_confidence: 0.98,
        match_notes: 'AI-matched to PO-2025-001 with high confidence',
        matched_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
        approval_status: 'auto_approved',
        approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 180000).toISOString(),
        payment_status: 'paid',
        paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        payment_method: 'ACH',
        payment_reference: 'ACH-2025-001',
        notes: 'AI-extracted and auto-matched to PO-2025-001',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        invoice_number: 'INV-ECO-2025-001',
        vendor_id: createdVendors[1].id,
        vendor_name: 'EcoServe Supplies',
        invoice_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 57 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 1800.00,
        tax_amount: 144.00,
        shipping_amount: 100.00,
        total_amount: 2044.00,
        line_items: JSON.stringify([
          { sku: 'NAP-ECO-6000', product_name: 'Eco-Friendly Napkins', quantity: 20, unit_price: 90.00, total: 1800.00 },
        ]),
        file_url: 'https://storage.example.com/invoices/eco-001.pdf',
        file_name: 'eco-001.pdf',
        file_size: 98000,
        extraction_status: 'completed',
        extraction_confidence: 0.95,
        extracted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
        matched_po_id: createdPOs[1].id,
        match_status: 'matched',
        match_confidence: 0.95,
        match_notes: 'AI-matched to PO-2025-002',
        matched_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
        approval_status: 'pending',
        payment_status: 'unpaid',
        notes: 'Pending approval - new vendor',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdVendorInvoices, error: vendorInvoicesError } = await supabase
      .from('vendor_invoices')
      .insert(vendorInvoices)
      .select();

    if (vendorInvoicesError) {
      console.error('  ✗ Error creating vendor invoices:', vendorInvoicesError.message);
      throw vendorInvoicesError;
    }

    console.log(`  ✓ Created ${createdVendorInvoices.length} vendor invoices`);

    // ============================================
    // 12. CREATE SHIPPING ADDRESSES
    // ============================================
    console.log('\n🏠 Creating shipping addresses...');

    const shippingAddresses = [
      {
        id: uuid(),
        organization_id: orgId,
        label: 'Main Location',
        contact_name: 'Demo Customer',
        phone: '555-0100',
        street_address: '123 Restaurant Row',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US',
        delivery_instructions: 'Use back entrance',
        is_default: true,
        created_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        organization_id: orgId,
        label: 'Warehouse',
        contact_name: 'Warehouse Manager',
        phone: '555-0200',
        street_address: '456 Storage Blvd',
        city: 'Brooklyn',
        state: 'NY',
        postal_code: '11201',
        country: 'US',
        delivery_instructions: 'Loading dock hours: 8am-5pm',
        is_default: false,
        created_at: new Date().toISOString(),
      },
    ];

    const { data: createdAddresses, error: addressesError } = await supabase
      .from('shipping_addresses')
      .insert(shippingAddresses)
      .select();

    if (addressesError) {
      console.error('  ✗ Error creating shipping addresses:', addressesError.message);
      throw addressesError;
    }

    console.log(`  ✓ Created ${createdAddresses.length} shipping addresses`);

    // ============================================
    // 13. CREATE CAMPAIGNS
    // ============================================
    console.log('\n📧 Creating campaigns...');

    const campaigns = [
      {
        id: uuid(),
        name: 'Spring Promotion 2025',
        subject: 'Spring Sale - 15% Off Eco-Friendly Products!',
        html_content: '<h1>Spring is here!</h1><p>Get 15% off all eco-friendly products.</p>',
        text_content: 'Spring is here! Get 15% off all eco-friendly products.',
        target_audience: JSON.stringify({ customer_type: 'restaurant', min_orders: 5 }),
        status: 'sent',
        scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'Reorder Reminder Campaign',
        subject: 'Time to Restock - AI Prediction',
        html_content: '<h1>Time to restock!</h1><p>Based on your order history, you may need to reorder soon.</p>',
        text_content: 'Time to restock! Based on your order history, you may need to reorder soon.',
        target_audience: JSON.stringify({ has_reorder_prediction: true }),
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'Summer Product Launch - Draft',
        subject: 'Introducing Our New Summer Collection',
        html_content: '<h1>New Summer Products!</h1><p>Check out our latest eco-friendly summer products.</p>',
        text_content: 'New Summer Products! Check out our latest eco-friendly summer products.',
        target_audience: JSON.stringify({ customer_type: 'all' }),
        status: 'draft',
        campaign_type: 'general',
        total_recipients: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdCampaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .insert(campaigns)
      .select();

    if (campaignsError) {
      console.error('  ✗ Error creating campaigns:', campaignsError.message);
      throw campaignsError;
    }

    console.log(`  ✓ Created ${createdCampaigns.length} campaigns`);

    // ============================================
    // 14. CREATE CAMPAIGN RECIPIENTS
    // ============================================
    console.log('\n👥 Creating campaign recipients...');

    const campaignRecipients = [
      {
        id: uuid(),
        campaign_id: createdCampaigns[0].id,
        customer_id: customerUser.id,
        email: customerUser.email,
        status: 'clicked',
        sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
        opened_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        clicked_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        sendgrid_message_id: 'msg_demo_spring_001',
        created_at: new Date().toISOString(),
      },
    ];

    const { data: createdRecipients, error: recipientsError } = await supabase
      .from('email_campaign_recipients')
      .insert(campaignRecipients)
      .select();

    if (recipientsError) {
      console.error('  ✗ Error creating campaign recipients:', recipientsError.message);
      throw recipientsError;
    }

    console.log(`  ✓ Created ${createdRecipients.length} campaign recipients`);

    // ============================================
    // 14.5. CREATE CUSTOMER PURCHASE ANALYTICS
    // ============================================
    console.log('\n📊 Creating customer purchase analytics...');

    // Get a product ID for the analytics
    const { data: firstProduct } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .single();

    const customerAnalytics = [
      {
        id: uuid(),
        customer_id: customerUser.id,
        product_id: firstProduct?.id,
        first_purchase_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        last_purchase_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_orders: 12,
        total_quantity: 450,
        total_revenue: 15420.50,
        avg_order_quantity: 37.5,
        avg_order_value: 1285.04,
        purchase_frequency_days: 15,
        last_90_days_quantity: 120,
        last_90_days_revenue: 4200.00,
        status: 'active',
        churn_risk_score: 0.35,
        opportunity_score: 0.75,
        metadata: JSON.stringify({
          preferred_categories: ['Paper Products', 'Cleaning Supplies'],
          seasonal_trends: { spring: 'high', summer: 'medium', fall: 'high', winter: 'low' },
        }),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdAnalytics, error: analyticsError } = await supabase
      .from('customer_purchase_analytics')
      .insert(customerAnalytics)
      .select();

    if (analyticsError) {
      console.error('  ✗ Error creating customer analytics:', analyticsError.message);
      throw analyticsError;
    }

    console.log(`  ✓ Created ${createdAnalytics.length} customer analytics records`);

    // ============================================
    // 15. CREATE LEADS (PUBLIC CHATBOT)
    // ============================================
    console.log('\n🎯 Creating leads...');

    const leads = [
      {
        id: uuid(),
        company_name: 'New Restaurant Downtown',
        contact_name: 'John Prospect',
        email: 'prospect1@newrestaurant.com',
        phone: '555-1234',
        state: 'NY',
        city: 'New York',
        status: 'new',
        source: 'chatbot',
        lead_score: 65,
        notes: 'Interested in bulk paper products for new restaurant opening. Asked about minimum order quantities and delivery times via chatbot.',
        tags: ['restaurant', 'new_business', 'chatbot_lead', 'bulk_order'],
        last_contacted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        company_name: 'Hotel Chain Corp',
        contact_name: 'Sarah Manager',
        contact_title: 'Procurement Manager',
        email: 'manager@hotelchain.com',
        phone: '555-5678',
        state: 'FL',
        city: 'Miami',
        status: 'qualified',
        source: 'chatbot',
        lead_score: 85,
        notes: 'Large hotel chain looking for eco-friendly supplies. Requested quote for 50+ locations.',
        tags: ['hotel', 'high_value', 'eco_friendly', 'chatbot_lead', 'multi_location'],
        last_contacted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_email_sent_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        last_email_opened_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(leads)
      .select();

    if (leadsError) {
      console.error('  ✗ Error creating leads:', leadsError.message);
      throw leadsError;
    }

    console.log(`  ✓ Created ${createdLeads.length} leads`);

    // ============================================
    // 16. CREATE SKU MAPPINGS (BAILEY LEGACY SYSTEM)
    // ============================================
    console.log('\n🔗 Creating SKU mappings...');

    const skuMappings = [
      {
        id: uuid(),
        old_sku: 'BAILEY-CUP-12-W',
        old_system: 'bailey',
        current_product_id: createdProducts[0].id, // 12oz Cup
        current_sku: createdProducts[0].sku,
        confidence_score: 0.98,
        mapping_method: 'ai_embedding',
        verified: true,
        metadata: JSON.stringify({
          original_description: '12oz White Paper Cup - Bailey System',
          original_category: 'Cups',
          match_reason: 'AI-matched with high confidence using product embeddings',
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        old_sku: 'BAILEY-LID-12',
        old_system: 'bailey',
        current_product_id: createdProducts[7].id, // Lid for 12oz Cup
        current_sku: createdProducts[7].sku,
        confidence_score: 0.95,
        mapping_method: 'ai_embedding',
        verified: true,
        metadata: JSON.stringify({
          original_description: 'Lid for 12oz Cup - Bailey System',
          original_category: 'Lids',
          match_reason: 'AI-matched lid product',
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuid(),
        old_sku: 'BAILEY-NAP-WHT',
        old_system: 'bailey',
        current_product_id: createdProducts[6].id, // Napkins
        current_sku: createdProducts[6].sku,
        confidence_score: 0.92,
        mapping_method: 'ai_embedding',
        verified: false,
        metadata: JSON.stringify({
          original_description: 'White Napkins - Bailey System',
          original_category: 'Napkins',
          match_reason: 'AI-matched napkins - pending verification',
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: createdMappings, error: mappingsError } = await supabase
      .from('sku_mappings')
      .insert(skuMappings)
      .select();

    if (mappingsError) {
      console.error('  ✗ Error creating SKU mappings:', mappingsError.message);
      throw mappingsError;
    }

    console.log(`  ✓ Created ${createdMappings.length} SKU mappings`);

    // ============================================
    // 17. CREATE HISTORICAL ORDER ITEMS
    // ============================================
    console.log('\n📜 Creating historical order items...');

    const historicalOrders = [
      {
        id: uuid(),
        customer_id: customerUser.id,
        customer_email: customerUser.email,
        customer_name: 'Demo Customer',
        customer_company: 'Demo Restaurant',
        order_number: 'HIST-001',
        order_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source_system: 'bailey',
        total_amount: 450.00,
        status: 'completed',
        metadata: JSON.stringify({ imported_from: 'bailey_system', original_id: 'BAILEY-ORD-001' }),
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        customer_id: customerUser.id,
        customer_email: customerUser.email,
        customer_name: 'Demo Customer',
        customer_company: 'Demo Restaurant',
        order_number: 'HIST-002',
        order_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        source_system: 'bailey',
        total_amount: 520.00,
        status: 'completed',
        metadata: JSON.stringify({ imported_from: 'bailey_system', original_id: 'BAILEY-ORD-002' }),
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { data: createdHistOrders, error: histOrdersError } = await supabase
      .from('historical_orders')
      .insert(historicalOrders)
      .select();

    if (histOrdersError) {
      console.error('  ✗ Error creating historical orders:', histOrdersError.message);
      throw histOrdersError;
    }

    const historicalOrderItems = [
      {
        id: uuid(),
        historical_order_id: createdHistOrders[0].id,
        old_sku: 'BAILEY-CUP-12-W',
        product_description: '12oz White Paper Cup',
        current_product_id: createdProducts[0].id,
        quantity: 3,
        unit_price: 150.00,
        total_price: 450.00,
        category: 'Cups',
        metadata: JSON.stringify({ original_system: 'bailey' }),
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        historical_order_id: createdHistOrders[1].id,
        old_sku: 'BAILEY-CUP-16-W',
        product_description: '16oz White Paper Cup',
        current_product_id: createdProducts[1].id,
        quantity: 4,
        unit_price: 130.00,
        total_price: 520.00,
        category: 'Cups',
        metadata: JSON.stringify({ original_system: 'bailey' }),
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { data: createdHistItems, error: histItemsError } = await supabase
      .from('historical_order_items')
      .insert(historicalOrderItems)
      .select();

    if (histItemsError) {
      console.error('  ✗ Error creating historical order items:', histItemsError.message);
      throw histItemsError;
    }

    console.log(`  ✓ Created ${createdHistOrders.length} historical orders with ${createdHistItems.length} items`);

    console.log('\n✅ Test data seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('  Customer: customer@demo.com / customer123');
    console.log('  Admin: admin@demo.com / admin123');
    console.log('  E2E Test: test@e2etest.com / TestPassword123!');
    console.log('\n📊 Seeded Data Summary:');
    console.log('\n  👤 Users & Organizations:');
    console.log(`     - ${createdUsers.length} users`);
    console.log(`     - 1 organization`);
    console.log(`     - ${createdAddresses.length} shipping addresses`);
    console.log('\n  📦 Products & Orders:');
    console.log(`     - ${products.length} products`);
    console.log(`     - ${orders.length} orders`);
    console.log(`     - ${orderItems.length} order items`);
    console.log(`     - ${createdHistOrders.length} historical orders`);
    console.log(`     - ${createdHistItems.length} historical order items`);
    console.log('\n  🤖 AI Features:');
    console.log(`     - ${opportunities.length} customer opportunities`);
    console.log(`     - ${pricingRecommendations.length} pricing recommendations`);
    console.log(`     - ${conversations.length} chatbot conversations`);
    console.log(`     - ${createdMappings.length} SKU mappings`);
    console.log('\n  🏭 Vendor Management:');
    console.log(`     - ${createdVendors.length} vendors`);
    console.log(`     - ${createdPOs.length} purchase orders`);
    console.log(`     - ${createdVendorInvoices.length} vendor invoices`);
    console.log('\n  📧 Marketing & Sales:');
    console.log(`     - ${createdCampaigns.length} campaigns`);
    console.log(`     - ${createdRecipients.length} campaign recipients`);
    console.log(`     - ${createdLeads.length} leads`);
    console.log('\n🎯 Ready for AI E2E Testing:');
    console.log('  ✅ Invoice Processing (vendor invoices + POs)');
    console.log('  ✅ Pricing Optimization (historical orders)');
    console.log('  ✅ Reorder Predictions (order history)');
    console.log('  ✅ SKU Mapping (Bailey legacy SKUs)');
    console.log('  ✅ Campaign Personalization (campaigns + recipients)');
    console.log('  ✅ Customer Insights (purchase analytics)');
    console.log('  ✅ Lead Qualification (public chatbot leads)');

  } catch (error) {
    console.error('\n❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData();

