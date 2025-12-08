/**
 * Live Complex Multi-Turn Scenarios
 * 
 * @jest-environment node
 * 
 * Advanced multi-turn tests with corrections, context switches, and realistic flows.
 */

import { generateText, tool, CoreMessage } from 'ai';
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

// Comprehensive tool set for complex scenarios
const complexToolSet = {
    // Products
    searchProducts: tool({
        description: 'Search products',
        parameters: z.object({ query: z.string(), category: z.string().optional() }),
    }),
    getProductDetails: tool({
        description: 'Get product details',
        parameters: z.object({ productId: z.string() }),
    }),
    compareProducts: tool({
        description: 'Compare multiple products',
        parameters: z.object({ productIds: z.array(z.string()) }),
    }),

    // Cart
    addToCart: tool({
        description: 'Add product to cart',
        parameters: z.object({ productId: z.string(), quantity: z.number().optional() }),
    }),
    removeFromCart: tool({
        description: 'Remove item from cart',
        parameters: z.object({ itemId: z.string() }),
    }),
    getCart: tool({
        description: 'View cart contents',
        parameters: z.object({}),
    }),
    updateCartQuantity: tool({
        description: 'Update quantity of cart item',
        parameters: z.object({ itemId: z.string(), quantity: z.number() }),
    }),
    clearCart: tool({
        description: 'Empty the cart',
        parameters: z.object({}),
    }),

    // Orders
    createOrder: tool({
        description: 'Create order from cart',
        parameters: z.object({ shippingAddressId: z.string().optional() }),
    }),
    getOrderDetails: tool({
        description: 'Get order information',
        parameters: z.object({ orderId: z.string() }),
    }),
    cancelOrder: tool({
        description: 'Cancel an order',
        parameters: z.object({ orderId: z.string(), reason: z.string() }),
    }),
    reorderPrevious: tool({
        description: 'Reorder from previous order',
        parameters: z.object({ orderId: z.string() }),
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
    addAddress: tool({
        description: 'Add new address',
        parameters: z.object({ type: z.string(), street: z.string(), city: z.string() }),
    }),

    // Help
    getHelp: tool({
        description: 'Get help on a topic',
        parameters: z.object({ topic: z.string() }),
    }),
};

runLive('User Corrections and Backtracking', () => {
    jest.setTimeout(180000);

    it('should handle "no wait, I meant..."', async () => {
        // User starts with wrong intent, corrects themselves
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Search for laptops',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // User corrects - they actually wanted to look at their orders
        const turn2 = await generateText({
            model: grokModels.reasoning,
            prompt: 'Actually, show me my order ORD-12345 details instead',
            tools: complexToolSet,
        });
        console.log('Correction result:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('getOrderDetails');
    });

    it('should handle "actually, remove that instead"', async () => {
        // User adds to cart
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Add product CHAIR-001 to my cart',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('addToCart');

        // User changes mind immediately
        const turn2 = await generateText({
            model: grokModels.reasoning,
            prompt: 'Actually, remove item CHAIR-001 from my cart instead',
            tools: complexToolSet,
        });
        console.log('Change of mind:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('removeFromCart');
    });

    it('should handle quantity corrections', async () => {
        // Initial add
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Add 5 of product WIDGET-001 to cart',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('addToCart');

        // Correction
        const turn2 = await generateText({
            model: grokModels.reasoning,
            prompt: 'Update the quantity of item WIDGET-001 in my cart to 10',
            tools: complexToolSet,
        });
        console.log('Quantity correction:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('updateCartQuantity');
    });
});

runLive('Context Switching Mid-Flow', () => {
    jest.setTimeout(180000);

    it('should handle sudden topic change', async () => {
        // Deep into product search
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Find standing desks',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');

        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Show details for DESK-001',
            tools: complexToolSet,
        });
        expect(turn2.toolCalls?.[0]?.toolName).toBe('getProductDetails');

        // Sudden switch to completely different topic
        const turn3 = await generateText({
            model: grokModels.fast,
            prompt: 'Actually, what\'s my account email? Show my profile.',
            tools: complexToolSet,
        });
        console.log('Context switch:', turn3.toolCalls?.[0]?.toolName);
        expect(turn3.toolCalls?.[0]?.toolName).toBe('getProfile');

        // Switch back to products
        const turn4 = await generateText({
            model: grokModels.fast,
            prompt: 'OK back to desks. Add the DESK-001 to my cart.',
            tools: complexToolSet,
        });
        expect(turn4.toolCalls?.[0]?.toolName).toBe('addToCart');
    });

    it('should handle interruption with urgent request', async () => {
        // Normal flow
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Search for office chairs',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // Urgent interruption
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Stop! I need to cancel order ORD-99999 immediately!',
            tools: complexToolSet,
        });
        console.log('Urgent interruption:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('cancelOrder');
    });
});

runLive('Abandoned and Resumed Flows', () => {
    jest.setTimeout(180000);

    it('should handle abandoned cart flow, resumed later', async () => {
        // Start adding items
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Add laptop LAPTOP-001 to cart',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('addToCart');

        // Do something else entirely
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Show me my saved addresses',
            tools: complexToolSet,
        });
        expect(turn2.toolCalls?.[0]?.toolName).toBe('getAddresses');

        const turn3 = await generateText({
            model: grokModels.fast,
            prompt: 'What\'s in my profile?',
            tools: complexToolSet,
        });
        expect(turn3.toolCalls?.[0]?.toolName).toBe('getProfile');

        // Resume cart flow
        const turn4 = await generateText({
            model: grokModels.fast,
            prompt: 'OK, where were we with my cart? Show me what\'s in there.',
            tools: complexToolSet,
        });
        console.log('Resumed cart:', turn4.toolCalls?.[0]?.toolName);
        expect(turn4.toolCalls?.[0]?.toolName).toBe('getCart');

        // Complete checkout
        const turn5 = await generateText({
            model: grokModels.fast,
            prompt: 'Great, place the order',
            tools: complexToolSet,
        });
        expect(turn5.toolCalls?.[0]?.toolName).toBe('createOrder');
    });
});

runLive('Comparison and Decision Making', () => {
    jest.setTimeout(180000);

    it('should handle product comparison flow', async () => {
        // Search
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Show me ergonomic chairs',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // Compare
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Compare CHAIR-001, CHAIR-002, and CHAIR-003 side by side',
            tools: complexToolSet,
        });
        console.log('Comparison:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('compareProducts');

        // Decision
        const turn3 = await generateText({
            model: grokModels.fast,
            prompt: 'I\'ll take the CHAIR-002, add it to my cart',
            tools: complexToolSet,
        });
        expect(turn3.toolCalls?.[0]?.toolName).toBe('addToCart');
    });
});

runLive('Reorder and Order History Flows', () => {
    jest.setTimeout(180000);

    it('should handle "order same as last time"', async () => {
        // Check recent orders
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Show me my last order',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('getOrderDetails');

        // Reorder
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Order the same items again from order ORD-PREV-001',
            tools: complexToolSet,
        });
        console.log('Reorder:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('reorderPrevious');
    });
});

runLive('Help and Recovery', () => {
    jest.setTimeout(120000);

    it('should handle user asking for help mid-flow', async () => {
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Add product XYZ to cart',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('addToCart');

        // User gets confused
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Wait, how do I apply a promo code? Help me with that.',
            tools: complexToolSet,
        });
        console.log('Help request:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('getHelp');
    });

    it('should handle frustrated user wanting to start over', async () => {
        // Some activity
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'Add something to cart',
            tools: complexToolSet,
        });

        // Frustration
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Forget it, clear everything from my cart and start over',
            tools: complexToolSet,
        });
        console.log('Start over:', turn2.toolCalls?.[0]?.toolName);
        expect(turn2.toolCalls?.[0]?.toolName).toBe('clearCart');
    });
});

runLive('Complex Real-World Scenarios', () => {
    jest.setTimeout(180000);

    it('should handle gift ordering scenario', async () => {
        // Need to ship to different address
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'I want to order a gift for my friend. First, add a new shipping address: 456 Oak Lane, Chicago, IL',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('addAddress');

        // Now find product
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Now find birthday gift ideas',
            tools: complexToolSet,
        });
        expect(turn2.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // Add to cart
        const turn3 = await generateText({
            model: grokModels.fast,
            prompt: 'Add the GIFT-SET-001 to cart',
            tools: complexToolSet,
        });
        expect(turn3.toolCalls?.[0]?.toolName).toBe('addToCart');

        // Checkout with specific address
        const turn4 = await generateText({
            model: grokModels.fast,
            prompt: 'Place the order and ship to the new address I just added',
            tools: complexToolSet,
        });
        expect(turn4.toolCalls?.[0]?.toolName).toBe('createOrder');
    });

    it('should handle bulk ordering for business', async () => {
        // Search for supplies
        const turn1 = await generateText({
            model: grokModels.fast,
            prompt: 'I need to order office supplies in bulk for the whole department',
            tools: complexToolSet,
        });
        expect(turn1.toolCalls?.[0]?.toolName).toBe('searchProducts');

        // Add multiple items
        const turn2 = await generateText({
            model: grokModels.fast,
            prompt: 'Add 50 units of PAPER-REAM, 100 of PEN-BOX, and 25 of STAPLER',
            tools: complexToolSet,
        });
        expect(turn2.toolCalls?.[0]?.toolName).toBe('addToCart');

        // Review
        const turn3 = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the cart total before I submit',
            tools: complexToolSet,
        });
        expect(turn3.toolCalls?.[0]?.toolName).toBe('getCart');
    });
});
