/**
 * Live Edge Cases and Ambiguity Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's handling of ambiguous, vague, and edge case prompts.
 * These tests push the AI to handle real-world messiness.
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

// Tool set with overlapping functionality for ambiguity tests
const ambiguousToolSet = {
    // Similar tools that could be confused
    searchProducts: tool({
        description: 'Search product catalog',
        parameters: z.object({ query: z.string() }),
    }),
    searchOrders: tool({
        description: 'Search order history',
        parameters: z.object({ query: z.string() }),
    }),
    searchCustomers: tool({
        description: 'Search customer database',
        parameters: z.object({ query: z.string() }),
    }),
    globalSearch: tool({
        description: 'Search across all entities (products, orders, customers)',
        parameters: z.object({ query: z.string(), types: z.array(z.string()).optional() }),
    }),

    // Action tools with similar verbs
    addToCart: tool({
        description: 'Add product to shopping cart',
        parameters: z.object({ productId: z.string(), quantity: z.number().optional() }),
    }),
    addAddress: tool({
        description: 'Add new shipping/billing address',
        parameters: z.object({ type: z.string(), street: z.string() }),
    }),
    addCustomerNote: tool({
        description: 'Add note to customer record',
        parameters: z.object({ customerId: z.string(), note: z.string() }),
    }),

    // Get/View tools
    getCart: tool({
        description: 'View current shopping cart',
        parameters: z.object({}),
    }),
    getProfile: tool({
        description: 'View user profile',
        parameters: z.object({}),
    }),
    getOrderDetails: tool({
        description: 'View specific order details',
        parameters: z.object({ orderId: z.string() }),
    }),

    // Update/Modify tools
    updateCart: tool({
        description: 'Update cart item quantity',
        parameters: z.object({ itemId: z.string(), quantity: z.number() }),
    }),
    updateProfile: tool({
        description: 'Update user profile information',
        parameters: z.object({ field: z.string(), value: z.string() }),
    }),
    updateOrder: tool({
        description: 'Update order (admin only)',
        parameters: z.object({ orderId: z.string(), status: z.string() }),
    }),

    // Delete/Remove tools
    removeFromCart: tool({
        description: 'Remove item from cart',
        parameters: z.object({ itemId: z.string() }),
    }),
    cancelOrder: tool({
        description: 'Cancel an order',
        parameters: z.object({ orderId: z.string() }),
    }),
    deleteAddress: tool({
        description: 'Delete saved address',
        parameters: z.object({ addressId: z.string() }),
    }),
};

runLive('Ambiguous Prompt Handling', () => {
    jest.setTimeout(120000);

    describe('Overlapping Search Contexts', () => {
        it('should prefer product search for product-specific terms', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'Find office chairs in the catalog',
                tools: ambiguousToolSet,
            });
            console.log('Product-specific search:', toolCalls?.[0]?.toolName);
            expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
        });

        it('should prefer order search for order-specific terms', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'Find my order from last week',
                tools: ambiguousToolSet,
            });
            console.log('Order-specific search:', toolCalls?.[0]?.toolName);
            expect(toolCalls?.[0]?.toolName).toBe('searchOrders');
        });

        it('should prefer customer search for customer-specific terms', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'Find customer John Smith from Acme Corp',
                tools: ambiguousToolSet,
            });
            console.log('Customer-specific search:', toolCalls?.[0]?.toolName);
            expect(toolCalls?.[0]?.toolName).toBe('searchCustomers');
        });

        it('should use global search for ambiguous "find everything" queries', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.reasoning,
                prompt: 'Search for "ABC-123" - I need to find if this is a product SKU, order number, or customer ID',
                tools: ambiguousToolSet,
            });
            console.log('Ambiguous search:', toolCalls?.[0]?.toolName);
            expect(['globalSearch', 'searchProducts', 'searchOrders']).toContain(toolCalls?.[0]?.toolName);
        });
    });

    describe('Similar Action Verbs', () => {
        it('should differentiate "add to cart" from "add address"', async () => {
            const cartResult = await generateText({
                model: grokModels.fast,
                prompt: 'Add product WIDGET-001 to my shopping cart',
                tools: ambiguousToolSet,
            });
            expect(cartResult.toolCalls?.[0]?.toolName).toBe('addToCart');

            const addressResult = await generateText({
                model: grokModels.fast,
                prompt: 'Add my home address: 123 Main St',
                tools: ambiguousToolSet,
            });
            expect(addressResult.toolCalls?.[0]?.toolName).toBe('addAddress');
        });

        it('should differentiate "update cart" from "update profile"', async () => {
            const cartResult = await generateText({
                model: grokModels.fast,
                prompt: 'Change the quantity of item-123 to 5',
                tools: ambiguousToolSet,
            });
            expect(cartResult.toolCalls?.[0]?.toolName).toBe('updateCart');

            const profileResult = await generateText({
                model: grokModels.fast,
                prompt: 'Update my phone number to 555-1234',
                tools: ambiguousToolSet,
            });
            expect(profileResult.toolCalls?.[0]?.toolName).toBe('updateProfile');
        });

        it('should differentiate "remove from cart" vs "cancel order" vs "delete address"', async () => {
            const removeCart = await generateText({
                model: grokModels.fast,
                prompt: 'Remove the paper clips from my cart',
                tools: ambiguousToolSet,
            });
            expect(removeCart.toolCalls?.[0]?.toolName).toBe('removeFromCart');

            const cancelOrder = await generateText({
                model: grokModels.fast,
                prompt: 'Cancel order ORD-12345',
                tools: ambiguousToolSet,
            });
            expect(cancelOrder.toolCalls?.[0]?.toolName).toBe('cancelOrder');

            const deleteAddress = await generateText({
                model: grokModels.fast,
                prompt: 'Delete my old office address',
                tools: ambiguousToolSet,
            });
            expect(deleteAddress.toolCalls?.[0]?.toolName).toBe('deleteAddress');
        });
    });
});

runLive('Vague and Incomplete Prompts', () => {
    jest.setTimeout(120000);

    it('should handle extremely vague "help me" prompts', async () => {
        const { toolCalls, text } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Help me with my stuff',
            tools: ambiguousToolSet,
        });
        console.log('Vague prompt result:', toolCalls?.[0]?.toolName || 'No tool - text response');
        // Should either ask for clarification or pick a reasonable default
        // Not failing - just logging behavior
    });

    it('should handle single-word prompts', async () => {
        const prompts = ['cart', 'orders', 'profile', 'search'];
        for (const prompt of prompts) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: ambiguousToolSet,
            });
            console.log(`Single word "${prompt}":`, toolCalls?.[0]?.toolName || 'No tool');
        }
    });

    it('should handle prompts with only IDs', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'ORD-12345',
            tools: ambiguousToolSet,
        });
        console.log('ID-only prompt:', toolCalls?.[0]?.toolName);
        // Should infer this is an order lookup
        expect(toolCalls?.[0]?.toolName).toBe('getOrderDetails');
    });
});

runLive('Special Characters and Formatting', () => {
    jest.setTimeout(120000);

    it('should handle prompts with special characters', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Find product "Widget Pro™" with SKU ABC-123/456',
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
    });

    it('should handle prompts with emojis', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: '🛒 Show my cart please! 🙏',
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('getCart');
    });

    it('should handle ALL CAPS prompts', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'SHOW ME MY ORDERS NOW!',
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('searchOrders');
    });

    it('should handle prompts with excessive punctuation', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'cancel order ORD-99999!!!!',
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('cancelOrder');
    });

    it('should handle multi-line prompts', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: `I need to find a product.
            
            Specifically, I'm looking for office supplies.
            
            Can you help me search?`,
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
    });
});

runLive('Natural Language Variations', () => {
    jest.setTimeout(120000);

    describe('Typos and Misspellings', () => {
        it('should handle common typos', async () => {
            const typoPrompts = [
                { prompt: 'serch for laptops', expected: 'searchProducts' },
                { prompt: 'ad to cart', expected: 'addToCart' },
                { prompt: 'veiw my ordrs', expected: 'searchOrders' },
                { prompt: 'cnacel order ORD-123', expected: 'cancelOrder' },
            ];

            for (const { prompt, expected } of typoPrompts) {
                const { toolCalls } = await generateText({
                    model: grokModels.fast,
                    prompt,
                    tools: ambiguousToolSet,
                });
                console.log(`Typo "${prompt}":`, toolCalls?.[0]?.toolName);
                expect(toolCalls?.[0]?.toolName).toBe(expected);
            }
        });
    });

    describe('Informal Language', () => {
        it('should understand casual/slang requests', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'yo lemme see whats in my cart',
                tools: ambiguousToolSet,
            });
            expect(toolCalls?.[0]?.toolName).toBe('getCart');
        });

        it('should handle polite vs direct requests equally', async () => {
            const polite = await generateText({
                model: grokModels.fast,
                prompt: 'Would you be so kind as to show me my recent orders, please?',
                tools: ambiguousToolSet,
            });

            const direct = await generateText({
                model: grokModels.fast,
                prompt: 'orders',
                tools: ambiguousToolSet,
            });

            console.log('Polite:', polite.toolCalls?.[0]?.toolName, 'Direct:', direct.toolCalls?.[0]?.toolName);
            // Both should result in order-related tools
            expect(['searchOrders', 'getOrderDetails']).toContain(polite.toolCalls?.[0]?.toolName);
        });
    });

    describe('Negation Handling', () => {
        it('should understand "don\'t" and negative intentions', async () => {
            // "Don't add" should NOT trigger addToCart
            const { toolCalls } = await generateText({
                model: grokModels.reasoning,
                prompt: 'Don\'t add anything to my cart, just show me what\'s there',
                tools: ambiguousToolSet,
            });
            console.log('Negation test:', toolCalls?.[0]?.toolName);
            expect(toolCalls?.[0]?.toolName).toBe('getCart');
        });

        it('should handle "instead of" correctly', async () => {
            const { toolCalls } = await generateText({
                model: grokModels.reasoning,
                prompt: 'Instead of updating my cart, please remove item-123',
                tools: ambiguousToolSet,
            });
            expect(toolCalls?.[0]?.toolName).toBe('removeFromCart');
        });
    });
});

runLive('Multiple Intents in Single Prompt', () => {
    jest.setTimeout(120000);

    it('should handle prompt with two clear sequential requests', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'First show me my cart, then add product ABC-123',
            tools: ambiguousToolSet,
        });
        console.log('Multi-intent result:', toolCalls?.map(t => t.toolName));
        // Should select at least the first tool
        expect(toolCalls?.length).toBeGreaterThanOrEqual(1);
        expect(['getCart', 'addToCart']).toContain(toolCalls?.[0]?.toolName);
    });

    it('should prioritize the primary intent', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'I want to cancel my order ORD-123 but first can you show me the details?',
            tools: ambiguousToolSet,
        });
        console.log('Priority intent:', toolCalls?.[0]?.toolName);
        // Should identify the main intent (cancel) or the first step (view)
        expect(['cancelOrder', 'getOrderDetails']).toContain(toolCalls?.[0]?.toolName);
    });
});

runLive('Boundary Value Tests', () => {
    jest.setTimeout(60000);

    it('should handle empty string prompt gracefully', async () => {
        try {
            const { toolCalls, text } = await generateText({
                model: grokModels.fast,
                prompt: '',
                tools: ambiguousToolSet,
            });
            console.log('Empty prompt result:', toolCalls?.length || 0, 'tools, text:', text?.slice(0, 50));
        } catch (error) {
            console.log('Empty prompt error (expected):', (error as Error).message);
        }
    });

    it('should handle very long prompt', async () => {
        const longProduct = 'industrial heavy-duty ergonomic office chair with lumbar support and adjustable armrests ';
        const longPrompt = `Search for ${longProduct.repeat(10)}`;

        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: longPrompt,
            tools: ambiguousToolSet,
        });
        expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
    });

    it('should handle prompt with only whitespace', async () => {
        try {
            const { toolCalls, text } = await generateText({
                model: grokModels.fast,
                prompt: '   \n\t  ',
                tools: ambiguousToolSet,
            });
            console.log('Whitespace prompt result:', toolCalls?.length || 0, 'tools');
        } catch (error) {
            console.log('Whitespace prompt error (expected):', (error as Error).message);
        }
    });
});
