export const mockToolResponses = {
  search_products: {
    products: [
      {
        id: 'prod_001',
        name: 'Industrial Steel Beam',
        description: 'High-grade structural steel beam',
        price: 299.99,
        inStock: true,
      },
      {
        id: 'prod_002',
        name: 'Aluminum Sheet',
        description: '4x8 aluminum sheet, 0.125" thick',
        price: 159.99,
        inStock: true,
      },
    ],
  },
  get_order_status: {
    orderId: 'order_001',
    status: 'completed',
    totalAmount: 799.97,
    items: [
      {
        productName: 'Industrial Steel Beam',
        quantity: 2,
        price: 599.98,
      },
    ],
    estimatedDelivery: '2024-01-20',
  },
  update_cart: {
    success: true,
    cartId: 'cart_001',
    itemCount: 3,
    totalAmount: 549.97,
  },
  get_customer_context: {
    userId: 'user_test_001',
    organizationName: 'Acme Manufacturing',
    recentOrders: 5,
    totalSpent: 12499.50,
    preferredCategories: ['Steel Products', 'Aluminum Products'],
  },
  calculate_pricing: {
    basePrice: 299.99,
    quantity: 10,
    discount: 0.1,
    subtotal: 2999.90,
    discountAmount: 299.99,
    finalPrice: 2699.91,
    tierApplied: 'Volume Discount 10%',
  },
};

export const mockDocumentAnalysis = {
  invoice: {
    type: 'invoice',
    invoiceNumber: 'INV-2024-001',
    date: '2024-01-15',
    vendor: 'Steel Supplier Inc',
    total: 2499.99,
    lineItems: [
      {
        description: 'Steel Beam 20ft',
        quantity: 5,
        unitPrice: 299.99,
        total: 1499.95,
      },
      {
        description: 'Aluminum Sheet 4x8',
        quantity: 10,
        unitPrice: 100.00,
        total: 1000.00,
      },
    ],
    confidence: 0.95,
  },
  purchaseOrder: {
    type: 'purchase_order',
    poNumber: 'PO-2024-123',
    date: '2024-01-10',
    customer: 'Acme Manufacturing',
    items: [
      {
        sku: 'ISB-001',
        description: 'Industrial Steel Beam',
        quantity: 20,
        unitPrice: 299.99,
      },
    ],
    totalAmount: 5999.80,
    confidence: 0.92,
  },
  spreadsheet: {
    type: 'excel',
    sheets: ['Products', 'Orders', 'Customers'],
    rowCount: 250,
    columnCount: 12,
    hasHeaders: true,
    dataPreview: {
      Products: [
        ['SKU', 'Name', 'Price', 'Stock'],
        ['ISB-001', 'Industrial Steel Beam', 299.99, 150],
        ['AS-4X8-125', 'Aluminum Sheet', 159.99, 200],
      ],
    },
    confidence: 0.98,
  },
};
