export const sampleConversations = [
  {
    id: 'conv_001',
    user_id: 'user_test_001',
    title: 'Product Inquiry',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'conv_002',
    user_id: 'user_test_001',
    title: 'Order Status',
    created_at: new Date('2024-01-16').toISOString(),
    updated_at: new Date('2024-01-16').toISOString(),
  },
];

export const sampleMessages = [
  {
    id: 'msg_001',
    conversation_id: 'conv_001',
    role: 'user',
    content: 'What products do you sell?',
    created_at: new Date('2024-01-15T10:00:00').toISOString(),
  },
  {
    id: 'msg_002',
    conversation_id: 'conv_001',
    role: 'assistant',
    content: 'We sell a variety of industrial products including steel beams, aluminum sheets, and copper wire.',
    created_at: new Date('2024-01-15T10:00:05').toISOString(),
  },
  {
    id: 'msg_003',
    conversation_id: 'conv_001',
    role: 'user',
    content: 'Tell me more about steel beams',
    created_at: new Date('2024-01-15T10:01:00').toISOString(),
  },
  {
    id: 'msg_004',
    conversation_id: 'conv_002',
    role: 'user',
    content: 'What is the status of my recent order?',
    created_at: new Date('2024-01-16T14:30:00').toISOString(),
  },
];

export const sampleLeads = [
  {
    id: 'lead_001',
    email: 'potential@customer.com',
    company_name: 'Potential Corp',
    status: 'new',
    source: 'chatbot',
    created_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'lead_002',
    email: 'interested@business.com',
    company_name: 'Interested Industries',
    status: 'contacted',
    source: 'chatbot',
    created_at: new Date('2024-01-16').toISOString(),
  },
];

export const mockAIResponses = {
  productInquiry: 'We offer a comprehensive range of industrial materials including steel beams, aluminum sheets, copper wire, and more. Each product meets industry standards and comes with detailed specifications.',
  orderStatus: 'I can help you check your order status. Your most recent order (#12345) is currently in processing and is expected to ship within 2 business days.',
  technicalQuestion: 'The Industrial Steel Beam (ISB-001) is made from high-grade structural steel with a yield strength of 50 ksi. It measures 20 feet in length and weighs approximately 200 lbs.',
  pricingQuestion: 'Current pricing for bulk orders varies based on quantity. For orders over 50 units, we offer tiered discounts: 10% off for 50-99 units, 15% off for 100-249 units, and 20% off for 250+ units.',
  greeting: 'Hello! I\'m your AI assistant. How can I help you today? I can assist with product information, order tracking, pricing inquiries, and more.',
};
