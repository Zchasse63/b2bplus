/**
 * Live Orders Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select and parameterize order-related tools.
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

// Define order tools matching the actual implementation
const orderToolSet = {
    searchOrders: tool({
        description: 'Search for orders by order number, customer, date range, or status.',
        parameters: z.object({
            orderNumber: z.string().optional().describe('Order number to search for'),
            customerId: z.string().optional().describe('Customer ID'),
            status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
            dateFrom: z.string().optional().describe('Start date (ISO format)'),
            dateTo: z.string().optional().describe('End date (ISO format)'),
        }),
    }),

    getOrderDetails: tool({
        description: 'Get detailed information about a specific order including line items and timeline.',
        parameters: z.object({
            orderId: z.string().describe('The order ID'),
        }),
    }),

    getOrderTimeline: tool({
        description: 'Get the status timeline and tracking history for an order.',
        parameters: z.object({
            orderId: z.string().describe('The order ID'),
        }),
    }),

    getRecentOrders: tool({
        description: 'Get the most recent orders for a customer.',
        parameters: z.object({
            customerId: z.string().optional().describe('Customer ID (defaults to current user)'),
            limit: z.number().optional().describe('Number of orders to return'),
        }),
    }),

    createOrder: tool({
        description: 'Create a new order from the current cart.',
        parameters: z.object({
            shippingAddressId: z.string().describe('Shipping address ID'),
            notes: z.string().optional().describe('Order notes'),
            paymentMethod: z.string().optional().describe('Payment method'),
        }),
    }),

    reorderPrevious: tool({
        description: 'Reorder items from a previous order.',
        parameters: z.object({
            orderId: z.string().describe('Previous order ID to reorder'),
            updateQuantities: z.boolean().optional().describe('Whether to use current cart quantities'),
        }),
    }),

    cancelOrder: tool({
        description: 'Request cancellation of an order (if still possible).',
        parameters: z.object({
            orderId: z.string().describe('Order ID to cancel'),
            reason: z.string().optional().describe('Cancellation reason'),
        }),
    }),
};

runLive('Live Orders Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select searchOrders for order search query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Find my orders from last month',
            tools: orderToolSet,
        });

        console.log('Search orders tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('searchOrders');
    });

    it('should select getOrderDetails for specific order inquiry', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the details for order ORD-12345',
            tools: orderToolSet,
        });

        console.log('Order details tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getOrderDetails');
    });

    it('should select getOrderTimeline for tracking query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the shipping tracking timeline for order ORD-55555',
            tools: orderToolSet,
        });

        console.log('Timeline tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getOrderTimeline');
    });

    it('should select getRecentOrders for recent orders query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'What are my recent orders?',
            tools: orderToolSet,
        });

        console.log('Recent orders tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getRecentOrders');
    });

    it('should select reorderPrevious for reorder request', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Reorder everything from my last order',
            tools: orderToolSet,
        });

        console.log('Reorder tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('reorderPrevious');
    });

    it('should select cancelOrder for cancellation request', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Cancel my order ORD-99999 please',
            tools: orderToolSet,
        });

        console.log('Cancel order tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('cancelOrder');
    });
});
