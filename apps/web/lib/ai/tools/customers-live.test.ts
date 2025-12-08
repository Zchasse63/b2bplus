/**
 * Live Customers Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select customer management tools.
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

const customerToolSet = {
    searchCustomers: tool({
        description: 'Search customers by name, email, or company',
        parameters: z.object({
            query: z.string().describe('Search term'),
            segment: z.enum(['all', 'high_value', 'at_risk', 'new']).optional(),
            limit: z.number().optional(),
        }),
    }),

    getCustomerDetails: tool({
        description: 'Get detailed customer profile with order history',
        parameters: z.object({
            customerId: z.string().describe('Customer ID'),
        }),
    }),

    getCustomerOrders: tool({
        description: 'Get order history for a specific customer',
        parameters: z.object({
            customerId: z.string(),
            status: z.enum(['all', 'pending', 'processing', 'completed', 'cancelled']).optional(),
        }),
    }),

    updateCustomer: tool({
        description: 'Update customer profile information',
        parameters: z.object({
            customerId: z.string(),
            updates: z.object({
                fullName: z.string().optional(),
                company: z.string().optional(),
                phone: z.string().optional(),
            }),
        }),
    }),

    assignPricingTier: tool({
        description: 'Assign a customer to a pricing tier',
        parameters: z.object({
            customerId: z.string(),
            tierId: z.string(),
        }),
    }),

    addCustomerNote: tool({
        description: 'Add a note to customer record',
        parameters: z.object({
            customerId: z.string(),
            note: z.string(),
            category: z.enum(['general', 'support', 'sales', 'billing']).optional(),
        }),
    }),

    getCustomerNotes: tool({
        description: 'Get notes for a customer',
        parameters: z.object({
            customerId: z.string(),
            category: z.enum(['all', 'general', 'support', 'sales', 'billing']).optional(),
        }),
    }),

    sendCustomerMessage: tool({
        description: 'Send a message or notification to a customer',
        parameters: z.object({
            customerId: z.string(),
            subject: z.string(),
            message: z.string(),
            channel: z.enum(['email', 'in_app', 'both']).optional(),
        }),
    }),
};

runLive('Live Customers Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select searchCustomers for customer search', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Find customers from Acme Corporation',
            tools: customerToolSet,
        });

        console.log('Search customers tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('searchCustomers');
    });

    it('should select getCustomerDetails for customer lookup', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the full profile for customer ID cust-12345',
            tools: customerToolSet,
        });

        console.log('Get customer details tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCustomerDetails');
    });

    it('should select getCustomerOrders for order history', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'What orders has customer cust-12345 placed?',
            tools: customerToolSet,
        });

        console.log('Get customer orders tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCustomerOrders');
    });

    it('should select updateCustomer for profile updates', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Update customer cust-12345 company name to "New Corp Inc"',
            tools: customerToolSet,
        });

        console.log('Update customer tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateCustomer');
    });

    it('should select assignPricingTier for tier assignment', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Assign customer cust-12345 to the gold pricing tier',
            tools: customerToolSet,
        });

        console.log('Assign pricing tier tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('assignPricingTier');
    });

    it('should select addCustomerNote for adding notes', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Add a sales note to customer cust-12345: "Interested in bulk discount"',
            tools: customerToolSet,
        });

        console.log('Add customer note tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('addCustomerNote');
    });

    it('should select getCustomerNotes for viewing notes', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me all support notes for customer cust-12345',
            tools: customerToolSet,
        });

        console.log('Get customer notes tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCustomerNotes');
    });

    it('should select sendCustomerMessage for messaging', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Send a notification message to customer cust-12345 with subject "Order Update" and message body "Your order has shipped"',
            tools: customerToolSet,
        });

        console.log('Send customer message tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('sendCustomerMessage');
    });
});
