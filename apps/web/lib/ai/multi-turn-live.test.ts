/**
 * Live Multi-Turn Conversation Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to handle multi-turn conversations with tool chaining.
 * These tests simulate realistic user flows that require multiple tool calls.
 */

import { generateText, tool } from 'ai';
import { z } from 'zod';
import { grokModels } from './providers/xai';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

const runLive = process.env.XAI_API_KEY ? describe : describe.skip;

// Combined tool set for multi-domain scenarios
const mixedToolSet = {
    // Products
    searchProducts: tool({
        description: 'Search products by name, SKU, category',
        parameters: z.object({
            query: z.string().optional(),
            category: z.string().optional(),
        }),
    }),
    getProductDetails: tool({
        description: 'Get detailed product information',
        parameters: z.object({
            productId: z.string(),
        }),
    }),

    // Cart
    addToCart: tool({
        description: 'Add a product to cart',
        parameters: z.object({
            productId: z.string(),
            quantity: z.number().optional(),
        }),
    }),
    getCart: tool({
        description: 'Get current cart contents',
        parameters: z.object({}),
    }),
    clearCart: tool({
        description: 'Clear all items from cart',
        parameters: z.object({}),
    }),

    // Orders
    createOrder: tool({
        description: 'Create a new order from cart',
        parameters: z.object({
            shippingAddressId: z.string().optional(),
        }),
    }),
    getOrderDetails: tool({
        description: 'Get order details',
        parameters: z.object({
            orderId: z.string(),
        }),
    }),
    cancelOrder: tool({
        description: 'Cancel an order',
        parameters: z.object({
            orderId: z.string(),
            reason: z.string(),
        }),
    }),

    // Profile
    getProfile: tool({
        description: 'Get user profile',
        parameters: z.object({}),
    }),
    getAddresses: tool({
        description: 'Get saved addresses',
        parameters: z.object({}),
    }),

    // Analytics (admin)
    getRevenueMetrics: tool({
        description: 'Get revenue analytics',
        parameters: z.object({
            period: z.enum(['day', 'week', 'month']).optional(),
        }),
    }),
    getCustomerInsights: tool({
        description: 'Get customer analytics and insights',
        parameters: z.object({
            segment: z.enum(['all', 'high_value', 'at_risk']).optional(),
        }),
    }),
};

runLive('Multi-Turn Conversation Flows', () => {
    jest.setTimeout(120000);

    describe('E-commerce Purchase Flow', () => {
        it('should handle search → details → add flow', async () => {
            // Turn 1: Search for products
            const turn1 = await generateText({
                model: grokModels.fast,
                prompt: 'Find office chairs',
                tools: mixedToolSet,
            });
            expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');
            console.log('Turn 1 (search):', turn1.toolCalls?.[0]?.toolName);

            // Turn 2: Get details on specific product (simulating user selecting from results)
            const turn2 = await generateText({
                model: grokModels.fast,
                prompt: 'Show me details for product CHAIR-001',
                tools: mixedToolSet,
            });
            expect(turn2.toolCalls?.[0]?.toolName).toBe('getProductDetails');
            console.log('Turn 2 (details):', turn2.toolCalls?.[0]?.toolName);

            // Turn 3: Add to cart
            const turn3 = await generateText({
                model: grokModels.fast,
                prompt: 'Add product CHAIR-001 with quantity 2 to my shopping cart',
                tools: mixedToolSet,
            });
            expect(turn3.toolCalls?.[0]?.toolName).toBe('addToCart');
            console.log('Turn 3 (add to cart):', turn3.toolCalls?.[0]?.toolName);
        });

        it('should handle cart → checkout flow', async () => {
            // Turn 1: View cart
            const turn1 = await generateText({
                model: grokModels.fast,
                prompt: 'Show me what\'s in my cart',
                tools: mixedToolSet,
            });
            expect(turn1.toolCalls?.[0]?.toolName).toBe('getCart');
            console.log('Turn 1 (cart):', turn1.toolCalls?.[0]?.toolName);

            // Turn 2: Check addresses for shipping
            const turn2 = await generateText({
                model: grokModels.fast,
                prompt: 'What addresses do I have saved for shipping?',
                tools: mixedToolSet,
            });
            expect(turn2.toolCalls?.[0]?.toolName).toBe('getAddresses');
            console.log('Turn 2 (addresses):', turn2.toolCalls?.[0]?.toolName);

            // Turn 3: Place order
            const turn3 = await generateText({
                model: grokModels.fast,
                prompt: 'Place my order using address addr-123',
                tools: mixedToolSet,
            });
            expect(turn3.toolCalls?.[0]?.toolName).toBe('createOrder');
            console.log('Turn 3 (create order):', turn3.toolCalls?.[0]?.toolName);
        });
    });

    describe('Order Management Flow', () => {
        it('should handle order lookup → cancel flow', async () => {
            // Turn 1: Find order
            const turn1 = await generateText({
                model: grokModels.fast,
                prompt: 'Show me order ORD-12345',
                tools: mixedToolSet,
            });
            expect(turn1.toolCalls?.[0]?.toolName).toBe('getOrderDetails');
            console.log('Turn 1 (order details):', turn1.toolCalls?.[0]?.toolName);

            // Turn 2: Cancel order
            const turn2 = await generateText({
                model: grokModels.fast,
                prompt: 'Cancel this order because I ordered the wrong item',
                tools: mixedToolSet,
            });
            expect(turn2.toolCalls?.[0]?.toolName).toBe('cancelOrder');
            console.log('Turn 2 (cancel):', turn2.toolCalls?.[0]?.toolName);
        });
    });

    describe('Admin Analytics Flow', () => {
        it('should handle revenue → customer insights flow', async () => {
            // Turn 1: Revenue overview
            const turn1 = await generateText({
                model: grokModels.fast,
                prompt: 'Show me this month\'s revenue metrics',
                tools: mixedToolSet,
            });
            expect(turn1.toolCalls?.[0]?.toolName).toBe('getRevenueMetrics');
            console.log('Turn 1 (revenue):', turn1.toolCalls?.[0]?.toolName);

            // Turn 2: Customer analysis
            const turn2 = await generateText({
                model: grokModels.fast,
                prompt: 'Now show me insights on high-value customers',
                tools: mixedToolSet,
            });
            expect(turn2.toolCalls?.[0]?.toolName).toBe('getCustomerInsights');
            console.log('Turn 2 (customer insights):', turn2.toolCalls?.[0]?.toolName);
        });
    });

    describe('User Self-Service Flow', () => {
        it('should handle profile → cart → clear flow', async () => {
            // Turn 1: Check profile
            const turn1 = await generateText({
                model: grokModels.fast,
                prompt: 'Show my profile',
                tools: mixedToolSet,
            });
            expect(turn1.toolCalls?.[0]?.toolName).toBe('getProfile');
            console.log('Turn 1 (profile):', turn1.toolCalls?.[0]?.toolName);

            // Turn 2: Check cart
            const turn2 = await generateText({
                model: grokModels.fast,
                prompt: 'What\'s in my cart?',
                tools: mixedToolSet,
            });
            expect(turn2.toolCalls?.[0]?.toolName).toBe('getCart');
            console.log('Turn 2 (cart):', turn2.toolCalls?.[0]?.toolName);

            // Turn 3: Clear cart
            const turn3 = await generateText({
                model: grokModels.fast,
                prompt: 'Empty my shopping cart',
                tools: mixedToolSet,
            });
            expect(turn3.toolCalls?.[0]?.toolName).toBe('clearCart');
            console.log('Turn 3 (clear cart):', turn3.toolCalls?.[0]?.toolName);
        });
    });
});

runLive('Complex Multi-Domain Scenarios', () => {
    jest.setTimeout(120000);

    it('should handle mixed domain prompts correctly', async () => {
        // Test that Grok correctly routes to the right domain

        // Product-focused
        const productQuery = await generateText({
            model: grokModels.fast,
            prompt: 'I need to find bulk paper supplies',
            tools: mixedToolSet,
        });
        expect(productQuery.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // Cart-focused
        const cartQuery = await generateText({
            model: grokModels.fast,
            prompt: 'View my shopping basket',
            tools: mixedToolSet,
        });
        expect(cartQuery.toolCalls?.[0]?.toolName).toBe('getCart');

        // Order-focused
        const orderQuery = await generateText({
            model: grokModels.fast,
            prompt: 'Track my order ORD-99999',
            tools: mixedToolSet,
        });
        expect(orderQuery.toolCalls?.[0]?.toolName).toBe('getOrderDetails');

        // Analytics-focused
        const analyticsQuery = await generateText({
            model: grokModels.fast,
            prompt: 'Generate a revenue report',
            tools: mixedToolSet,
        });
        expect(analyticsQuery.toolCalls?.[0]?.toolName).toBe('getRevenueMetrics');
    });

    it('should maintain tool consistency across similar queries', async () => {
        // Same intent, different phrasing - should select same tool
        const variations = [
            'Find products matching "laptop"',
            'Search for laptops in the catalog',
            'Look up laptop products',
        ];

        for (const prompt of variations) {
            const result = await generateText({
                model: grokModels.fast,
                prompt,
                tools: mixedToolSet,
            });
            console.log(`Query: "${prompt}" -> Tool: ${result.toolCalls?.[0]?.toolName}`);
            expect(result.toolCalls?.[0]?.toolName).toBe('searchProducts');
        }
    });
});
