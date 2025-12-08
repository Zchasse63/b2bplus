/**
 * Live Products Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select and parameterize product-related tools.
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

// Define product tools matching the actual implementation
const productToolSet = {
    searchProducts: tool({
        description: 'Search for products by name, SKU, or category. Returns a list of matching products.',
        parameters: z.object({
            query: z.string().describe('Search query - product name, SKU, or keywords'),
            category: z.string().optional().describe('Filter by category'),
            limit: z.number().optional().describe('Maximum results to return'),
        }),
    }),

    getProductDetails: tool({
        description: 'Get detailed information about a specific product including pricing, availability, and specifications.',
        parameters: z.object({
            productId: z.string().describe('The product ID or SKU'),
        }),
    }),

    getProductAvailability: tool({
        description: 'Check stock availability for a product across warehouses.',
        parameters: z.object({
            productId: z.string().describe('The product ID or SKU'),
            warehouseId: z.string().optional().describe('Specific warehouse to check'),
        }),
    }),

    compareProducts: tool({
        description: 'Compare multiple products side by side on features, pricing, and specifications.',
        parameters: z.object({
            productIds: z.array(z.string()).describe('List of product IDs to compare (2-5 products)'),
        }),
    }),

    getRelatedProducts: tool({
        description: 'Get products related to or frequently bought with a given product.',
        parameters: z.object({
            productId: z.string().describe('The product ID'),
            type: z.enum(['related', 'similar', 'frequently_bought']).optional(),
        }),
    }),

    getCustomerPricing: tool({
        description: 'Get customer-specific pricing for a product based on their tier and agreements.',
        parameters: z.object({
            productId: z.string().describe('The product ID'),
            customerId: z.string().optional().describe('Customer ID for tier-based pricing'),
        }),
    }),

    requestQuote: tool({
        description: 'Request a formal quote for products with quantities.',
        parameters: z.object({
            items: z.array(z.object({
                productId: z.string(),
                quantity: z.number(),
            })).describe('Products and quantities for the quote'),
            notes: z.string().optional().describe('Additional notes for the quote'),
        }),
    }),
};

runLive('Live Products Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select searchProducts for product search query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Find me all office furniture in the catalog',
            tools: productToolSet,
        });

        console.log('Search tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
    });

    it('should select getProductDetails for specific product inquiry', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the details for product SKU-12345',
            tools: productToolSet,
        });

        console.log('Details tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getProductDetails');
    });

    it('should select getProductAvailability for stock check', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Is product ABC-100 in stock?',
            tools: productToolSet,
        });

        console.log('Availability tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getProductAvailability');
    });

    it('should select compareProducts for comparison query', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Compare products A, B, and C for me',
            tools: productToolSet,
        });

        console.log('Compare tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('compareProducts');
    });

    it('should select getCustomerPricing for pricing inquiry', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'What is my special pricing for product XYZ?',
            tools: productToolSet,
        });

        console.log('Pricing tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCustomerPricing');
    });

    it('should select requestQuote for quote request', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'I need a quote for 100 units of product A and 50 units of product B',
            tools: productToolSet,
        });

        console.log('Quote tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('requestQuote');
    });
});
