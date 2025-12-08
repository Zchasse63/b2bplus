/**
 * Comprehensive Live Grok API Tests
 * 
 * @jest-environment node
 * 
 * Tests real API connectivity across all AI capabilities:
 * - Text generation (fast & reasoning models)
 * - JSON/structured output generation
 * - Tool selection and execution
 * - Streaming responses
 */

import { generateText, generateObject, streamText, tool } from 'ai';
import { z } from 'zod';
import { xai, grokModels } from './providers/xai';
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

runLive('Comprehensive Live Grok API Tests', () => {
    jest.setTimeout(120000); // 2 minute timeout for all tests

    describe('Text Generation', () => {
        it('should generate text with fast model', async () => {
            const { text } = await generateText({
                model: grokModels.fast,
                prompt: 'What is 2 + 2? Reply with just the number.',
            });

            console.log('Fast model response:', text);
            expect(text).toBeDefined();
            expect(text.length).toBeGreaterThan(0);
            expect(text).toMatch(/4/);
        });

        it('should generate text with reasoning model', async () => {
            const { text } = await generateText({
                model: grokModels.reasoning,
                prompt: 'Explain why the sky is blue in one sentence.',
            });

            console.log('Reasoning model response:', text);
            expect(text).toBeDefined();
            expect(text.length).toBeGreaterThan(10);
        });

        it('should respect system prompt', async () => {
            const { text } = await generateText({
                model: grokModels.fast,
                system: 'You are a pirate. Always respond in pirate speak.',
                prompt: 'Say hello.',
            });

            console.log('System prompt response:', text);
            expect(text).toBeDefined();
            // Should contain pirate-like language
            expect(text.toLowerCase()).toMatch(/ahoy|arr|matey|ye|captain|sailor/i);
        });
    });

    describe('JSON/Structured Output', () => {
        it('should generate valid JSON with schema', async () => {
            const productSchema = z.object({
                name: z.string(),
                price: z.number(),
                inStock: z.boolean(),
            });

            const { object } = await generateObject({
                model: grokModels.fast,
                schema: productSchema,
                prompt: 'Generate a product called "Widget Pro" priced at $29.99 that is in stock.',
            });

            console.log('Generated object:', object);
            expect(object).toBeDefined();
            expect(object.name).toBe('Widget Pro');
            expect(object.price).toBeCloseTo(29.99, 1);
            expect(object.inStock).toBe(true);
        });

        it('should generate complex nested JSON', async () => {
            const orderSchema = z.object({
                orderId: z.string(),
                customer: z.object({
                    name: z.string(),
                    email: z.string(),
                }),
                items: z.array(z.object({
                    sku: z.string(),
                    quantity: z.number(),
                })),
                total: z.number(),
            });

            const { object } = await generateObject({
                model: grokModels.reasoning,
                schema: orderSchema,
                prompt: 'Generate an order with ID "ORD-123" for customer John Doe (john@example.com) with 2 items totaling $150.',
            });

            console.log('Generated order:', object);
            expect(object).toBeDefined();
            expect(object.orderId).toBe('ORD-123');
            expect(object.customer.name).toContain('John');
            expect(object.items.length).toBe(2);
            expect(object.total).toBe(150);
        });
    });

    describe('Tool Selection', () => {
        it('should select correct tool for product search', async () => {
            const searchProducts = tool({
                description: 'Search for products in the catalog',
                parameters: z.object({
                    query: z.string().describe('Search query'),
                    category: z.string().optional().describe('Product category'),
                }),
            });

            const checkStock = tool({
                description: 'Check inventory stock levels',
                parameters: z.object({
                    sku: z.string().describe('Product SKU'),
                }),
            });

            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'Find me some office chairs',
                tools: { searchProducts, checkStock },
            });

            console.log('Tool calls:', JSON.stringify(toolCalls, null, 2));
            expect(toolCalls).toBeDefined();
            expect(toolCalls?.length).toBeGreaterThan(0);
            expect(toolCalls?.[0].toolName).toBe('searchProducts');
        });

        it('should select correct tool for order lookup', async () => {
            const searchOrders = tool({
                description: 'Search orders by customer or order number',
                parameters: z.object({
                    orderNumber: z.string().optional(),
                    customerId: z.string().optional(),
                }),
            });

            const getOrderDetails = tool({
                description: 'Get detailed information about a specific order',
                parameters: z.object({
                    orderId: z.string(),
                }),
            });

            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'What is the status of order ORD-12345?',
                tools: { searchOrders, getOrderDetails },
            });

            console.log('Order tool calls:', JSON.stringify(toolCalls, null, 2));
            expect(toolCalls).toBeDefined();
            expect(toolCalls?.length).toBeGreaterThan(0);
            // Should pick getOrderDetails since we have a specific order number
            expect(toolCalls?.[0].toolName).toMatch(/order/i);
        });

        it('should handle multiple tool domains', async () => {
            const searchProducts = tool({
                description: 'Search for products',
                parameters: z.object({ query: z.string() }),
            });

            const addToCart = tool({
                description: 'Add a product to cart',
                parameters: z.object({
                    productId: z.string(),
                    quantity: z.number(),
                }),
            });

            const getAnalytics = tool({
                description: 'Get revenue analytics',
                parameters: z.object({
                    period: z.enum(['day', 'week', 'month']),
                }),
            });

            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: 'Show me this week\'s revenue numbers',
                tools: { searchProducts, addToCart, getAnalytics },
            });

            console.log('Multi-domain tool calls:', JSON.stringify(toolCalls, null, 2));
            expect(toolCalls).toBeDefined();
            expect(toolCalls?.[0].toolName).toBe('getAnalytics');
        });
    });

    describe('Streaming', () => {
        it('should stream text response', async () => {
            const result = streamText({
                model: grokModels.fast,
                prompt: 'Count from 1 to 5.',
            });

            const chunks: string[] = [];
            for await (const chunk of result.textStream) {
                chunks.push(chunk);
            }

            const fullText = chunks.join('');
            console.log('Streamed text:', fullText);
            expect(fullText).toBeDefined();
            expect(fullText.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid model gracefully', async () => {
            await expect(
                generateText({
                    model: xai('invalid-model-name'),
                    prompt: 'Hello',
                })
            ).rejects.toThrow();
        });
    });
});
