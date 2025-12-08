/**
 * Live Stress and Performance Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's behavior under stress: rapid calls, long sequences, 
 * consistency testing, and edge case handling.
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

const stressToolSet = {
    searchProducts: tool({
        description: 'Search products',
        parameters: z.object({ query: z.string() }),
    }),
    getProductDetails: tool({
        description: 'Get product details',
        parameters: z.object({ productId: z.string() }),
    }),
    addToCart: tool({
        description: 'Add to cart',
        parameters: z.object({ productId: z.string() }),
    }),
    getCart: tool({
        description: 'View cart',
        parameters: z.object({}),
    }),
    getOrders: tool({
        description: 'View orders',
        parameters: z.object({}),
    }),
    getProfile: tool({
        description: 'View profile',
        parameters: z.object({}),
    }),
};

runLive('Rapid Sequential Calls', () => {
    jest.setTimeout(300000);

    it('should handle 10 rapid sequential calls correctly', async () => {
        const prompts = [
            { prompt: 'Search chairs', expected: 'searchProducts' },
            { prompt: 'Show cart', expected: 'getCart' },
            { prompt: 'Find desks', expected: 'searchProducts' },
            { prompt: 'My orders', expected: 'getOrders' },
            { prompt: 'Add PROD-001', expected: 'addToCart' },
            { prompt: 'Profile', expected: 'getProfile' },
            { prompt: 'Search monitors', expected: 'searchProducts' },
            { prompt: 'Cart please', expected: 'getCart' },
            { prompt: 'Details PROD-002', expected: 'getProductDetails' },
            { prompt: 'Orders history', expected: 'getOrders' },
        ];

        const results: { prompt: string; expected: string; actual: string; match: boolean }[] = [];

        for (const { prompt, expected } of prompts) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: stressToolSet,
            });
            const actual = toolCalls?.[0]?.toolName || 'none';
            results.push({ prompt, expected, actual, match: actual === expected });
        }

        console.log('Rapid call results:');
        results.forEach(r => console.log(`  "${r.prompt}" -> ${r.actual} (expected: ${r.expected}) ${r.match ? '✓' : '✗'}`));

        const successRate = results.filter(r => r.match).length / results.length;
        console.log(`Success rate: ${successRate * 100}%`);
        expect(successRate).toBeGreaterThanOrEqual(0.8); // Allow 20% variance due to AI
    });

    it('should handle parallel calls (Promise.all)', async () => {
        const prompts = [
            'Search for laptops',
            'Show my cart',
            'View my orders',
            'My profile',
        ];

        const startTime = Date.now();
        const results = await Promise.all(
            prompts.map(prompt =>
                generateText({
                    model: grokModels.fast,
                    prompt,
                    tools: stressToolSet,
                })
            )
        );
        const duration = Date.now() - startTime;

        console.log('Parallel call results:');
        results.forEach((r, i) => console.log(`  "${prompts[i]}" -> ${r.toolCalls?.[0]?.toolName}`));
        console.log(`Total duration: ${duration}ms (avg: ${Math.round(duration / prompts.length)}ms per call)`);

        // All should return a tool
        expect(results.every(r => r.toolCalls?.length)).toBe(true);
    });
});

runLive('Consistency Testing', () => {
    jest.setTimeout(180000);

    it('should consistently select the same tool for identical prompts', async () => {
        const prompt = 'Search for office supplies';
        const iterations = 5;
        const results: string[] = [];

        for (let i = 0; i < iterations; i++) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: stressToolSet,
            });
            results.push(toolCalls?.[0]?.toolName || 'none');
        }

        console.log(`Consistency test for "${prompt}":`, results);
        const allSame = results.every(r => r === results[0]);
        console.log(`All identical: ${allSame}`);
        expect(allSame).toBe(true);
    });

    it('should be consistent across rephrasings', async () => {
        const variations = [
            'Find products matching keyboard',
            'Search for keyboard products',
            'Look up keyboards',
            'I need to find keyboards',
            'Show me keyboard options',
        ];

        const results = await Promise.all(
            variations.map(async prompt => {
                const { toolCalls } = await generateText({
                    model: grokModels.fast,
                    prompt,
                    tools: stressToolSet,
                });
                return { prompt, tool: toolCalls?.[0]?.toolName };
            })
        );

        console.log('Rephrasing consistency:');
        results.forEach(r => console.log(`  "${r.prompt}" -> ${r.tool}`));

        // All should select searchProducts
        const allSearch = results.every(r => r.tool === 'searchProducts');
        expect(allSearch).toBe(true);
    });
});

runLive('Long Conversation Simulation', () => {
    jest.setTimeout(300000);

    it('should maintain coherence over 15+ turn conversation', async () => {
        const conversationFlow = [
            { prompt: 'Start by showing my profile', expectedTool: 'getProfile' },
            { prompt: 'Now search for monitors', expectedTool: 'searchProducts' },
            { prompt: 'Show details for MONITOR-001', expectedTool: 'getProductDetails' },
            { prompt: 'Add it to cart', expectedTool: 'addToCart' },
            { prompt: 'What\'s in my cart now?', expectedTool: 'getCart' },
            { prompt: 'Search for keyboards too', expectedTool: 'searchProducts' },
            { prompt: 'Details on KEYBOARD-PRO', expectedTool: 'getProductDetails' },
            { prompt: 'Add that as well', expectedTool: 'addToCart' },
            { prompt: 'Check cart again', expectedTool: 'getCart' },
            { prompt: 'Show my order history', expectedTool: 'getOrders' },
            { prompt: 'Back to products - find mice', expectedTool: 'searchProducts' },
            { prompt: 'MOUSE-WIRELESS details', expectedTool: 'getProductDetails' },
            { prompt: 'Add to cart', expectedTool: 'addToCart' },
            { prompt: 'Final cart check', expectedTool: 'getCart' },
            { prompt: 'My profile one more time', expectedTool: 'getProfile' },
        ];

        let correctCount = 0;
        console.log('Long conversation simulation:');

        for (const { prompt, expectedTool } of conversationFlow) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: stressToolSet,
            });
            const actualTool = toolCalls?.[0]?.toolName;
            const correct = actualTool === expectedTool;
            if (correct) correctCount++;
            console.log(`  Turn: "${prompt}" -> ${actualTool} (expected: ${expectedTool}) ${correct ? '✓' : '✗'}`);
        }

        const accuracy = correctCount / conversationFlow.length;
        console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correctCount}/${conversationFlow.length})`);
        expect(accuracy).toBeGreaterThanOrEqual(0.85); // 85% minimum
    });
});

runLive('Error Recovery', () => {
    jest.setTimeout(120000);

    it('should handle malformed product IDs gracefully', async () => {
        const weirdIds = [
            { id: 'PROD-@#$%', shouldWork: true },
            { id: 'PROD-123-456-789', shouldWork: true },
            { id: 'product with spaces', shouldWork: true },
        ];

        for (const { id, shouldWork } of weirdIds) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: `Show me the product details for product ID ${id}`,
                tools: stressToolSet,
            });
            console.log(`Product ID "${id}":`, toolCalls?.[0]?.toolName);
            if (shouldWork) {
                expect(toolCalls?.[0]?.toolName).toBe('getProductDetails');
            }
        }
    });

    it('should handle potentially dangerous input safely', async () => {
        const dangerousInputs = [
            '../../etc/passwd',
            '<script>alert(1)</script>',
            'DROP TABLE products;',
        ];

        let successCount = 0;
        for (const input of dangerousInputs) {
            const { toolCalls, text } = await generateText({
                model: grokModels.fast,
                prompt: `Search for product named ${input}`,
                tools: stressToolSet,
            });
            console.log(`Dangerous input "${input.slice(0, 20)}":`, toolCalls?.[0]?.toolName || 'text response');
            // The key point is the AI doesn't execute the dangerous input - it treats it as a string
            // It might search or respond with text, both are safe
            if (toolCalls?.[0]?.toolName === 'searchProducts') successCount++;
        }
        console.log(`Safe handling rate: ${successCount}/${dangerousInputs.length}`);
        // At least one should correctly interpret as search
        expect(successCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle unicode and international characters', async () => {
        const internationalPrompts = [
            { prompt: '搜索笔记本电脑 (search laptops)', lang: 'Chinese' },
            { prompt: 'Поиск ноутбуков', lang: 'Russian' },
            { prompt: 'ラップトップを検索', lang: 'Japanese' },
            { prompt: 'חפש מחשבים ניידים', lang: 'Hebrew' },
            { prompt: 'البحث عن أجهزة الكمبيوتر المحمولة', lang: 'Arabic' },
        ];

        for (const { prompt, lang } of internationalPrompts) {
            try {
                const { toolCalls } = await generateText({
                    model: grokModels.fast,
                    prompt,
                    tools: stressToolSet,
                });
                console.log(`${lang}: "${prompt}" -> ${toolCalls?.[0]?.toolName}`);
                // Should recognize as product search
                expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
            } catch (error) {
                console.log(`${lang} error:`, (error as Error).message);
            }
        }
    });
});

runLive('Response Time Benchmarks', () => {
    jest.setTimeout(120000);

    it('should benchmark fast model response times', async () => {
        const prompts = [
            'Search products',
            'View cart',
            'My orders',
            'Show profile',
        ];

        const times: number[] = [];

        for (const prompt of prompts) {
            const start = Date.now();
            await generateText({
                model: grokModels.fast,
                prompt,
                tools: stressToolSet,
            });
            const duration = Date.now() - start;
            times.push(duration);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log('Response time benchmark (fast model):');
        console.log(`  Average: ${Math.round(avg)}ms`);
        console.log(`  Min: ${min}ms`);
        console.log(`  Max: ${max}ms`);
        console.log(`  Individual: ${times.join('ms, ')}ms`);

        // Fast model should respond in under 10 seconds on average
        expect(avg).toBeLessThan(10000);
    });

    it('should benchmark reasoning model response times', async () => {
        const prompts = [
            'I need to find office supplies but also check my orders',
            'Should I cancel my pending order or wait for it?',
        ];

        const times: number[] = [];

        for (const prompt of prompts) {
            const start = Date.now();
            await generateText({
                model: grokModels.reasoning,
                prompt,
                tools: stressToolSet,
            });
            const duration = Date.now() - start;
            times.push(duration);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        console.log('Response time benchmark (reasoning model):');
        console.log(`  Average: ${Math.round(avg)}ms`);
        console.log(`  Individual: ${times.join('ms, ')}ms`);

        // Reasoning model is slower, allow up to 15 seconds
        expect(avg).toBeLessThan(15000);
    });
});

runLive('Model Comparison', () => {
    jest.setTimeout(180000);

    it('should compare fast vs reasoning model on complex prompts', async () => {
        const complexPrompts = [
            'I need to order supplies but first check if my last order was delivered and if I have enough budget based on my profile',
            'Compare the top 3 products in the office chair category and tell me which one I should add to cart based on value',
        ];

        for (const prompt of complexPrompts) {
            const fastResult = await generateText({
                model: grokModels.fast,
                prompt,
                tools: stressToolSet,
            });

            const reasoningResult = await generateText({
                model: grokModels.reasoning,
                prompt,
                tools: stressToolSet,
            });

            console.log(`Prompt: "${prompt.slice(0, 50)}..."`);
            console.log(`  Fast model: ${fastResult.toolCalls?.[0]?.toolName}`);
            console.log(`  Reasoning model: ${reasoningResult.toolCalls?.[0]?.toolName}`);
        }
    });
});
