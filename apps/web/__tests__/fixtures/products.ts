export const sampleProducts = [
  {
    id: 'prod_001',
    name: 'Industrial Steel Beam',
    description: 'High-grade structural steel beam',
    sku: 'ISB-001',
    base_price: 299.99,
    stock_quantity: 150,
    category: 'Steel Products',
    created_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'prod_002',
    name: 'Aluminum Sheet',
    description: '4x8 aluminum sheet, 0.125" thick',
    sku: 'AS-4X8-125',
    base_price: 159.99,
    stock_quantity: 200,
    category: 'Aluminum Products',
    created_at: new Date('2024-01-05').toISOString(),
  },
  {
    id: 'prod_003',
    name: 'Copper Wire',
    description: '12 AWG copper wire, 100ft roll',
    sku: 'CW-12-100',
    base_price: 89.99,
    stock_quantity: 500,
    category: 'Electrical',
    created_at: new Date('2024-01-10').toISOString(),
  },
];

export const sampleOrders = [
  {
    id: 'order_001',
    user_id: 'user_test_001',
    organization_id: 'org_test_001',
    status: 'completed',
    total_amount: 799.97,
    created_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'order_002',
    user_id: 'user_test_002',
    organization_id: 'org_test_002',
    status: 'pending',
    total_amount: 449.98,
    created_at: new Date('2024-01-20').toISOString(),
  },
];

export const sampleOrderItems = [
  {
    order_id: 'order_001',
    product_id: 'prod_001',
    quantity: 2,
    unit_price: 299.99,
    total_price: 599.98,
  },
  {
    order_id: 'order_001',
    product_id: 'prod_002',
    quantity: 1,
    unit_price: 159.99,
    total_price: 159.99,
  },
  {
    order_id: 'order_002',
    product_id: 'prod_003',
    quantity: 5,
    unit_price: 89.99,
    total_price: 449.95,
  },
];

export const sampleCartItems = [
  {
    id: 'cart_001',
    user_id: 'user_test_001',
    product_id: 'prod_001',
    quantity: 1,
  },
  {
    id: 'cart_002',
    user_id: 'user_test_002',
    product_id: 'prod_002',
    quantity: 3,
  },
];
