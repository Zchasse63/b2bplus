/**
 * Live Role-Based Access Control Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's understanding of role-based permissions and access control.
 * Verifies that the AI correctly routes to admin vs customer tools.
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

// Tools with clear role requirements
const rbacToolSet = {
    // Customer tools (anyone can use)
    searchProducts: tool({
        description: 'Search for products in catalog (available to all users)',
        parameters: z.object({ query: z.string() }),
    }),
    viewCart: tool({
        description: 'View current user\'s shopping cart',
        parameters: z.object({}),
    }),
    viewMyOrders: tool({
        description: 'View current user\'s order history',
        parameters: z.object({}),
    }),
    updateMyProfile: tool({
        description: 'Update current user\'s profile',
        parameters: z.object({ field: z.string(), value: z.string() }),
    }),

    // Admin-only tools (clearly marked)
    adminGetAllOrders: tool({
        description: 'ADMIN ONLY: View all orders across all customers',
        parameters: z.object({ status: z.string().optional() }),
    }),
    adminUpdateInventory: tool({
        description: 'ADMIN ONLY: Update product inventory levels',
        parameters: z.object({ productId: z.string(), quantity: z.number() }),
    }),
    adminViewRevenue: tool({
        description: 'ADMIN ONLY: View revenue and sales analytics',
        parameters: z.object({ period: z.string().optional() }),
    }),
    adminManageCustomers: tool({
        description: 'ADMIN ONLY: Manage customer accounts',
        parameters: z.object({ action: z.string(), customerId: z.string() }),
    }),
    adminCreateCampaign: tool({
        description: 'ADMIN ONLY: Create marketing campaigns',
        parameters: z.object({ name: z.string(), type: z.string() }),
    }),
    adminApproveRefund: tool({
        description: 'ADMIN ONLY: Approve customer refund requests',
        parameters: z.object({ orderId: z.string(), amount: z.number() }),
    }),
};

runLive('Admin Tool Selection', () => {
    jest.setTimeout(180000);

    it('should select admin tools for administrative requests', async () => {
        const adminPrompts = [
            { prompt: 'Show me all orders from all customers', expected: 'adminGetAllOrders' },
            { prompt: 'Update inventory for product SKU-123 to 500 units', expected: 'adminUpdateInventory' },
            { prompt: 'Generate revenue report for this month', expected: 'adminViewRevenue' },
            { prompt: 'Create a new holiday sale campaign', expected: 'adminCreateCampaign' },
            { prompt: 'Approve the refund for order ORD-999', expected: 'adminApproveRefund' },
        ];

        for (const { prompt, expected } of adminPrompts) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: rbacToolSet,
            });
            console.log(`Admin prompt: "${prompt.slice(0, 40)}..." -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe(expected);
        }
    });

    it('should select customer tools for personal requests', async () => {
        const customerPrompts = [
            { prompt: 'Search for laptops', expected: 'searchProducts' },
            { prompt: 'Show my cart', expected: 'viewCart' },
            { prompt: 'What are my recent orders?', expected: 'viewMyOrders' },
            { prompt: 'Update my email address to new@email.com', expected: 'updateMyProfile' },
        ];

        for (const { prompt, expected } of customerPrompts) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: rbacToolSet,
            });
            console.log(`Customer prompt: "${prompt}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe(expected);
        }
    });

    it('should distinguish between my orders vs all orders', async () => {
        const myOrders = await generateText({
            model: grokModels.fast,
            prompt: 'Show me my orders',
            tools: rbacToolSet,
        });
        expect(myOrders.toolCalls?.[0]?.toolName).toBe('viewMyOrders');

        const allOrders = await generateText({
            model: grokModels.fast,
            prompt: 'Show all customer orders in the system',
            tools: rbacToolSet,
        });
        expect(allOrders.toolCalls?.[0]?.toolName).toBe('adminGetAllOrders');
    });
});

runLive('Admin Language Recognition', () => {
    jest.setTimeout(120000);

    it('should recognize admin intent from business language', async () => {
        const businessPrompts = [
            { prompt: 'I need to see the sales dashboard', expected: 'adminViewRevenue' },
            { prompt: 'Check stock levels for WIDGET-001', expected: 'adminUpdateInventory' },
            { prompt: 'Pull up the customer list', expected: 'adminManageCustomers' },
        ];

        let correct = 0;
        for (const { prompt, expected } of businessPrompts) {
            const { toolCalls } = await generateText({
                model: grokModels.reasoning,
                prompt,
                tools: rbacToolSet,
            });
            console.log(`Business language: "${prompt}" -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === expected) correct++;
        }
        console.log(`Business language recognition: ${correct}/${businessPrompts.length}`);
        expect(correct).toBeGreaterThanOrEqual(2);
    });

    it('should not confuse customer actions with admin actions', async () => {
        // Customer updating their own profile
        const customerUpdate = await generateText({
            model: grokModels.fast,
            prompt: 'I want to change my shipping address',
            tools: rbacToolSet,
        });
        expect(customerUpdate.toolCalls?.[0]?.toolName).toBe('updateMyProfile');

        // Admin managing customers
        const adminManage = await generateText({
            model: grokModels.fast,
            prompt: 'Suspend customer account CUST-456',
            tools: rbacToolSet,
        });
        expect(adminManage.toolCalls?.[0]?.toolName).toBe('adminManageCustomers');
    });
});
