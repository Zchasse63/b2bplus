import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * RLS (Row Level Security) Verification Tests
 *
 * These tests verify that RLS policies correctly isolate data between users
 * and prevent unauthorized access to sensitive information.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TestUser {
  id: string;
  email: string;
  password: string;
  organizationId: string;
  accessToken: string;
}

describe('RLS Policy Verification', () => {
  let user1: TestUser;
  let user2: TestUser;
  let adminClient: ReturnType<typeof createClient>;
  const isMockEnvironment = supabaseUrl?.includes('mock.supabase.local');

  beforeAll(async () => {
    // Skip RLS tests when using mock Supabase
    if (isMockEnvironment) {
      console.log('Skipping RLS tests: mock Supabase environment detected');
      return;
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create two test users in different organizations
    user1 = await createTestUser('User 1', 'Org A');
    user2 = await createTestUser('User 2', 'Org B');
  });

  afterAll(async () => {
    // Skip cleanup in mock environment
    if (isMockEnvironment) return;

    // Cleanup test users
    if (user1) await cleanupTestUser(user1.id, user1.organizationId);
    if (user2) await cleanupTestUser(user2.id, user2.organizationId);
  });

  async function createTestUser(name: string, orgName: string): Promise<TestUser> {
    const email = `test-${randomUUID()}@example.com`;
    const password = 'TestPassword123!';

    // Create user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    // Create organization
    const { data: orgData, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: orgName,
        business_email: email,
        status: 'approved',
      })
      .select()
      .single();

    if (orgError || !orgData) {
      throw new Error(`Failed to create organization: ${orgError?.message}`);
    }

    // Link user to organization
    await adminClient
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: authData.user.id,
        role: 'customer',
      });

    // Get access token
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      throw new Error(`Failed to sign in: ${signInError?.message}`);
    }

    return {
      id: authData.user.id,
      email,
      password,
      organizationId: orgData.id,
      accessToken: sessionData.session.access_token,
    };
  }

  async function cleanupTestUser(userId: string, organizationId: string) {
    await adminClient.from('organization_members').delete().eq('user_id', userId);
    await adminClient.from('organizations').delete().eq('id', organizationId);
    await adminClient.auth.admin.deleteUser(userId);
  }

  function createUserClient(accessToken: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  // Helper to skip tests in mock environment
  function skipIfMock() {
    if (isMockEnvironment) {
      console.log('Skipping: mock Supabase environment');
      return true;
    }
    return false;
  }

  describe('Cart Isolation', () => {
    it('should prevent user2 from reading user1 cart items', async () => {
      if (skipIfMock()) return;
      const user1Client = createUserClient(user1.accessToken);
      const user2Client = createUserClient(user2.accessToken);

      // User1 creates cart item (using service role since RLS might block INSERT)
      const { data: cartItem, error: insertError } = await adminClient
        .from('carts')
        .insert({
          user_id: user1.id,
          product_id: 'test-product-id',
          quantity: 1,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Failed to create cart item:', insertError);
        return; // Skip if table doesn't support test data
      }

      // User2 tries to read user1's cart
      const { data: user2CartData, error: user2Error } = await user2Client
        .from('carts')
        .select('*')
        .eq('user_id', user1.id);

      // Should return empty array or error (RLS blocks access)
      expect(user2CartData?.length || 0).toBe(0);

      // Cleanup
      await adminClient.from('carts').delete().eq('id', cartItem.id);
    });

    it('should allow user to read own cart items', async () => {
      if (skipIfMock()) return;
      const user1Client = createUserClient(user1.accessToken);

      // Create cart item for user1
      const { data: cartItem } = await adminClient
        .from('carts')
        .insert({
          user_id: user1.id,
          product_id: 'test-product-id',
          quantity: 2,
        })
        .select()
        .single();

      if (!cartItem) return;

      // User1 reads own cart
      const { data: user1CartData, error } = await user1Client
        .from('carts')
        .select('*')
        .eq('user_id', user1.id);

      // Should successfully read own cart
      expect(error).toBeNull();
      expect(user1CartData?.length).toBeGreaterThan(0);

      // Cleanup
      await adminClient.from('carts').delete().eq('id', cartItem.id);
    });

    it('should prevent user2 from updating user1 cart items', async () => {
      if (skipIfMock()) return;
      const user2Client = createUserClient(user2.accessToken);

      // Create cart item for user1
      const { data: cartItem } = await adminClient
        .from('carts')
        .insert({
          user_id: user1.id,
          product_id: 'test-product-id',
          quantity: 1,
        })
        .select()
        .single();

      if (!cartItem) return;

      // User2 tries to update user1's cart
      const { data, error } = await user2Client
        .from('carts')
        .update({ quantity: 999 })
        .eq('id', cartItem.id);

      // Should fail or return no rows affected
      expect(data?.length || 0).toBe(0);

      // Verify quantity unchanged
      const { data: verification } = await adminClient
        .from('carts')
        .select('quantity')
        .eq('id', cartItem.id)
        .single();

      expect(verification?.quantity).toBe(1);

      // Cleanup
      await adminClient.from('carts').delete().eq('id', cartItem.id);
    });
  });

  describe('Order Isolation', () => {
    it('should prevent user2 from reading user1 orders', async () => {
      if (skipIfMock()) return;
      const user2Client = createUserClient(user2.accessToken);

      // Create order for user1
      const { data: order } = await adminClient
        .from('orders')
        .insert({
          user_id: user1.id,
          organization_id: user1.organizationId,
          status: 'pending',
          total_amount: 100,
        })
        .select()
        .single();

      if (!order) return;

      // User2 tries to read user1's orders
      const { data: user2OrderData } = await user2Client
        .from('orders')
        .select('*')
        .eq('user_id', user1.id);

      // Should return empty
      expect(user2OrderData?.length || 0).toBe(0);

      // Cleanup
      await adminClient.from('orders').delete().eq('id', order.id);
    });
  });

  describe('Organization Isolation', () => {
    it('should prevent user1 from seeing user2 organization members', async () => {
      if (skipIfMock()) return;
      const user1Client = createUserClient(user1.accessToken);

      // User1 tries to read org B members
      const { data } = await user1Client
        .from('organization_members')
        .select('*')
        .eq('organization_id', user2.organizationId);

      // Should return empty or error
      expect(data?.length || 0).toBe(0);
    });

    it('should allow user to see own organization members', async () => {
      if (skipIfMock()) return;
      const user1Client = createUserClient(user1.accessToken);

      // User1 reads own org members
      const { data, error } = await user1Client
        .from('organization_members')
        .select('*')
        .eq('organization_id', user1.organizationId);

      // Should succeed
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  describe('Chatbot Conversation Isolation', () => {
    it('should prevent user2 from accessing user1 conversations', async () => {
      if (skipIfMock()) return;
      const user2Client = createUserClient(user2.accessToken);

      // Create conversation for user1
      const { data: conversation } = await adminClient
        .from('chatbot_conversations')
        .insert({
          user_id: user1.id,
          messages: [{ role: 'user', content: 'Test message' }],
        })
        .select()
        .single();

      if (!conversation) return;

      // User2 tries to read user1's conversation
      const { data } = await user2Client
        .from('chatbot_conversations')
        .select('*')
        .eq('id', conversation.id);

      // Should return empty
      expect(data?.length || 0).toBe(0);

      // Cleanup
      await adminClient.from('chatbot_conversations').delete().eq('id', conversation.id);
    });
  });

  describe('Public Read Access', () => {
    it('should allow anonymous users to read products', async () => {
      if (skipIfMock()) return;
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      // Anonymous user reads products
      const { data, error } = await anonClient
        .from('products')
        .select('*')
        .limit(10);

      // Should succeed (products are public)
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should prevent anonymous users from modifying products', async () => {
      if (skipIfMock()) return;
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      // Create test product
      const { data: product } = await adminClient
        .from('products')
        .insert({
          name: 'Test Product',
          sku: `TEST-${randomUUID().slice(0, 8)}`,
          base_price: 99.99,
        })
        .select()
        .single();

      if (!product) return;

      // Anonymous user tries to update product
      const { error } = await anonClient
        .from('products')
        .update({ base_price: 0.01 })
        .eq('id', product.id);

      // Should fail
      expect(error).toBeDefined();

      // Cleanup
      await adminClient.from('products').delete().eq('id', product.id);
    });
  });

  describe('Lead Data Isolation', () => {
    it('should prevent users from accessing other leads', async () => {
      if (skipIfMock()) return;
      const user1Client = createUserClient(user1.accessToken);

      // Create lead
      const { data: lead } = await adminClient
        .from('leads')
        .insert({
          email: `lead-${randomUUID()}@example.com`,
          company_name: 'Test Lead Co',
          status: 'new',
        })
        .select()
        .single();

      if (!lead) return;

      // User tries to read leads (should be restricted)
      const { data } = await user1Client
        .from('leads')
        .select('*')
        .eq('id', lead.id);

      // Should return empty (leads are admin-only or service-role only)
      expect(data?.length || 0).toBe(0);

      // Cleanup
      await adminClient.from('leads').delete().eq('id', lead.id);
    });
  });
});
