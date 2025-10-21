import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

/**
 * Global setup for Playwright tests
 * Ensures test users exist in the database before running tests
 */
export default async function globalSetup() {
  console.log('Running global setup...')

  // Load environment variables from .env.local
  const envPath = path.resolve(__dirname, '../../.env.local')
  console.log('Loading environment from:', envPath)
  dotenv.config({ path: envPath })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Supabase URL:', supabaseUrl ? '✓ Configured' : '✗ Missing')
  console.log('Service Key:', supabaseServiceKey ? '✓ Configured' : '✗ Missing')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Supabase credentials not configured. Skipping test user setup.')
    console.warn('   Tests requiring authentication may fail.')
    console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable.')
    return
  }

  try {
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test user credentials
    const testUsers = [
      {
        email: process.env.TEST_USER_EMAIL || 'test@testmail.app',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
        name: 'Test User',
      },
      {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@testmail.app',
        password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
        name: 'Admin User',
      },
    ]

    console.log('Checking/creating test users...')

    const testOrgId = '11111111-1111-1111-1111-111111111111' // Acme Restaurant Group

    for (const user of testUsers) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find((u) => u.email === user.email)

      let userId: string | null = null

      if (!existingUser) {
        console.log(`Creating test user: ${user.email}`)

        // Create user with admin API
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email for test users
          user_metadata: {
            full_name: user.name,
          },
        })

        if (error) {
          console.error(`Failed to create user ${user.email}:`, error.message)
        } else {
          console.log(`✓ Created test user: ${user.email}`)
          userId = data.user?.id || null
        }
      } else {
        console.log(`✓ Test user already exists: ${user.email}`)
        console.log(`  Updating password for: ${user.email}`)
        userId = existingUser.id

        // Update existing user's password to ensure it matches test credentials
        const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: user.password,
          email_confirm: true,
        })

        if (error) {
          console.error(`Failed to update password for ${user.email}:`, error.message)
        } else {
          console.log(`✓ Password updated for: ${user.email}`)
        }
      }

      // Add test data for regular test user only
      if (userId && user.email === (process.env.TEST_USER_EMAIL || 'test@testmail.app')) {
        console.log('Setting up test data for test user...')

        // Add shipping addresses
        console.log('  Adding shipping addresses...')
        const { data: existingAddresses } = await supabase
          .from('shipping_addresses')
          .select('id')
          .eq('organization_id', testOrgId)
          .limit(1)

        if (!existingAddresses || existingAddresses.length === 0) {
          const { data: addressData, error: addressError } = await supabase
            .from('shipping_addresses')
            .insert([
              {
                organization_id: testOrgId,
                label: 'Main Office',
                contact_name: 'Test User',
                phone: '+1-555-0100',
                street_address: '123 Test Street',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94102',
                country: 'US',
                is_default: true,
              },
              {
                organization_id: testOrgId,
                label: 'Warehouse',
                contact_name: 'Test User',
                phone: '+1-555-0101',
                street_address: '456 Warehouse Ave',
                city: 'Oakland',
                state: 'CA',
                postal_code: '94601',
                country: 'US',
                is_default: false,
              },
            ])
            .select()

          if (addressError) {
            console.error('  Failed to create shipping addresses:', addressError.message)
          } else {
            console.log(`  ✓ Created ${addressData?.length || 0} shipping addresses`)
          }
        } else {
          console.log('  ✓ Shipping addresses already exist')
        }

        // Add test orders
        console.log('  Adding test orders...')
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId)
          .limit(1)

        if (!existingOrders || existingOrders.length === 0) {
          // Get a shipping address to use
          const { data: addresses } = await supabase
            .from('shipping_addresses')
            .select('id')
            .eq('organization_id', testOrgId)
            .limit(1)

          const shippingAddressId = addresses?.[0]?.id

          if (shippingAddressId) {
            // Get some products to use in orders
            const { data: products } = await supabase
              .from('products')
              .select('id, base_price, sku, name')
              .eq('organization_id', testOrgId)
              .limit(3)

            if (products && products.length > 0) {
              // Create completed order
              const completedOrderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-0001`
              const { data: completedOrder, error: orderError1 } = await supabase
                .from('orders')
                .insert({
                  organization_id: testOrgId,
                  user_id: userId,
                  order_number: completedOrderNumber,
                  status: 'delivered',
                  subtotal: 150.00,
                  tax: 12.00,
                  shipping_cost: 10.00,
                  total: 172.00,
                  shipping_address_id: shippingAddressId,
                  submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                })
                .select()
                .single()

              if (!orderError1 && completedOrder) {
                // Add order items
                await supabase.from('order_items').insert({
                  order_id: completedOrder.id,
                  product_id: products[0].id,
                  sku: products[0].sku,
                  name: products[0].name,
                  quantity: 2,
                  unit_price: products[0].base_price,
                  line_total: products[0].base_price * 2,
                })
              }

              // Create pending order
              const pendingOrderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-0002`
              const { data: pendingOrder, error: orderError2 } = await supabase
                .from('orders')
                .insert({
                  organization_id: testOrgId,
                  user_id: userId,
                  order_number: pendingOrderNumber,
                  status: 'processing',
                  subtotal: 75.00,
                  tax: 6.00,
                  shipping_cost: 10.00,
                  total: 91.00,
                  shipping_address_id: shippingAddressId,
                  submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                })
                .select()
                .single()

              if (!orderError2 && pendingOrder) {
                // Add order items
                await supabase.from('order_items').insert({
                  order_id: pendingOrder.id,
                  product_id: products[1]?.id || products[0].id,
                  sku: products[1]?.sku || products[0].sku,
                  name: products[1]?.name || products[0].name,
                  quantity: 1,
                  unit_price: products[1]?.base_price || products[0].base_price,
                  line_total: products[1]?.base_price || products[0].base_price,
                })
              }

              if (!orderError1 && !orderError2) {
                console.log('  ✓ Created 2 test orders')
              } else {
                console.error('  Failed to create orders:', orderError1 || orderError2)
              }
            } else {
              console.warn('  ⚠️  No products found to create test orders')
            }
          } else {
            console.warn('  ⚠️  No shipping address found to create test orders')
          }
        } else {
          console.log('  ✓ Test orders already exist')
        }
      }
    }

    console.log('Global setup complete!')
  } catch (error: any) {
    console.error('Error in global setup:', error.message)
    console.warn('Tests may fail due to missing test users.')
  }
}

