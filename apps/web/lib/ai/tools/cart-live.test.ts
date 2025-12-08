/**
 * Live Cart Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select cart-related tools.
 */

import { generateText, tool } from 'ai';
import { z } from 'zod';
import { grokModels } from '../providers/xai';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env.local');
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

const cartToolSet = {
    getCart: tool({
        description: 'Get the current shopping cart contents and totals.',
        parameters: z.object({}),
    }),

    getCartSummary: tool({
        description: 'Get a brief summary of cart items and total.',
        parameters: z.object({}),
    }),

    addToCart: tool({
        description: 'Add a product to the shopping cart.',
        parameters: z.object({
            productId: z.string().describe('Product ID to add'),
            quantity: z.number().describe('Quantity to add'),
        }),
    }),

    updateCartQuantity: tool({
        description: 'Update the quantity of an item in the cart.',
        parameters: z.object({
            itemId: z.string().describe('Cart item ID'),
            quantity: z.number().describe('New quantity'),
        }),
    }),

    removeFromCart: tool({
        description: 'Remove an item from the cart.',
        parameters: z.object({
            itemId: z.string().describe('Cart item ID to remove'),
        }),
    }),

    clearCart: tool({
        description: 'Remove all items from the cart.',
        parameters: z.object({}),
    }),

    applyPromoCode: tool({
        description: 'Apply a promotional code or coupon to the cart.',
        parameters: z.object({
            code: z.string().describe('Promo code to apply'),
        }),
    }),

    saveCartAsQuote: tool({
        description: 'Save the current cart as a quote for later.',
        parameters: z.object({
            name: z.string().optional().describe('Quote name'),
            expiresInDays: z.number().optional().describe('Days until quote expires'),
        }),
    }),
};

runLive('Live Cart Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select getCart for cart viewing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me what\'s in my cart',
            tools: cartToolSet,
        });

        console.log('Get cart tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCart');
    });

    it('should select addToCart for adding items', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Add 5 units of product ABC-123 to my cart',
            tools: cartToolSet,
        });

        console.log('Add to cart tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('addToCart');
    });

    it('should select removeFromCart for removing items', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Remove item XYZ from my cart',
            tools: cartToolSet,
        });

        console.log('Remove from cart tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('removeFromCart');
    });

    it('should select clearCart for emptying cart', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Empty my entire cart',
            tools: cartToolSet,
        });

        console.log('Clear cart tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('clearCart');
    });

    it('should select applyPromoCode for coupon application', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Apply promo code SAVE20 to my order',
            tools: cartToolSet,
        });

        console.log('Apply promo tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('applyPromoCode');
    });

    it('should select saveCartAsQuote for quote creation', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Save this cart as a quote for next week',
            tools: cartToolSet,
        });

        console.log('Save quote tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('saveCartAsQuote');
    });
});
