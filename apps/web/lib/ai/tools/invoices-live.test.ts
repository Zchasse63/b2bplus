/**
 * Live Invoices Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select invoice management tools.
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

const invoiceToolSet = {
    searchInvoices: tool({
        description: 'Search invoices by customer, status, or date',
        parameters: z.object({
            customerId: z.string().optional(),
            status: z.enum(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
            limit: z.number().optional(),
        }),
    }),

    getInvoiceDetails: tool({
        description: 'Get detailed invoice with line items',
        parameters: z.object({
            invoiceId: z.string(),
        }),
    }),

    getOverdueInvoices: tool({
        description: 'Get list of overdue invoices',
        parameters: z.object({
            daysOverdue: z.number().optional(),
        }),
    }),

    createInvoice: tool({
        description: 'Create a new invoice from an order',
        parameters: z.object({
            orderId: z.string(),
            dueDate: z.string(),
            notes: z.string().optional(),
        }),
    }),

    updateInvoiceStatus: tool({
        description: 'Update invoice status',
        parameters: z.object({
            invoiceId: z.string(),
            status: z.enum(['sent', 'paid', 'overdue', 'cancelled']),
            paidAt: z.string().optional(),
        }),
    }),

    sendInvoice: tool({
        description: 'Send invoice to customer via email',
        parameters: z.object({
            invoiceId: z.string(),
            message: z.string().optional(),
        }),
    }),

    recordPayment: tool({
        description: 'Record a payment for an invoice',
        parameters: z.object({
            invoiceId: z.string(),
            amount: z.number(),
            paymentMethod: z.enum(['check', 'wire', 'ach', 'credit_card', 'other']),
            reference: z.string().optional(),
        }),
    }),

    getPaymentHistory: tool({
        description: 'Get payment history for an invoice or customer',
        parameters: z.object({
            invoiceId: z.string().optional(),
            customerId: z.string().optional(),
            limit: z.number().optional(),
        }),
    }),
};

runLive('Live Invoices Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select searchInvoices for invoice search', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Find all unpaid invoices for customer cust-12345',
            tools: invoiceToolSet,
        });

        console.log('Search invoices tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('searchInvoices');
    });

    it('should select getInvoiceDetails for invoice lookup', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the details for invoice INV-12345',
            tools: invoiceToolSet,
        });

        console.log('Get invoice details tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getInvoiceDetails');
    });

    it('should select getOverdueInvoices for overdue query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Which invoices are more than 30 days overdue?',
            tools: invoiceToolSet,
        });

        console.log('Get overdue invoices tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getOverdueInvoices');
    });

    it('should select createInvoice for invoice creation', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Create an invoice for order ORD-12345 due in 30 days',
            tools: invoiceToolSet,
        });

        console.log('Create invoice tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('createInvoice');
    });

    it('should select updateInvoiceStatus for status updates', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Mark invoice INV-12345 as paid',
            tools: invoiceToolSet,
        });

        console.log('Update invoice status tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateInvoiceStatus');
    });

    it('should select sendInvoice for sending invoices', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Email invoice INV-12345 to the customer',
            tools: invoiceToolSet,
        });

        console.log('Send invoice tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('sendInvoice');
    });

    it('should select recordPayment for payment recording', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Record a $500 check payment for invoice INV-12345',
            tools: invoiceToolSet,
        });

        console.log('Record payment tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('recordPayment');
    });

    it('should select getPaymentHistory for payment history', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me all payments received from customer cust-12345',
            tools: invoiceToolSet,
        });

        console.log('Get payment history tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getPaymentHistory');
    });
});
