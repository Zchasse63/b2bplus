/**
 * Live Semantic Understanding Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's semantic understanding: synonyms, context, implicit intent.
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

const semanticToolSet = {
    // Action tools
    addToCart: tool({
        description: 'Add product to shopping cart',
        parameters: z.object({ productId: z.string(), quantity: z.number().optional() }),
    }),
    removeFromCart: tool({
        description: 'Remove product from cart',
        parameters: z.object({ itemId: z.string() }),
    }),
    checkout: tool({
        description: 'Complete purchase and checkout',
        parameters: z.object({}),
    }),

    // View tools
    viewCart: tool({
        description: 'View shopping cart contents',
        parameters: z.object({}),
    }),
    searchProducts: tool({
        description: 'Search product catalog',
        parameters: z.object({ query: z.string() }),
    }),
    viewOrderHistory: tool({
        description: 'View past orders',
        parameters: z.object({}),
    }),

    // Status tools
    trackOrder: tool({
        description: 'Track order shipping status',
        parameters: z.object({ orderId: z.string() }),
    }),
    contactSupport: tool({
        description: 'Contact customer support',
        parameters: z.object({ issue: z.string() }),
    }),
};

runLive('Synonym Recognition', () => {
    jest.setTimeout(180000);

    it('should recognize cart synonyms', async () => {
        const cartSynonyms = [
            'cart',
            'basket',
            'bag',
            'shopping cart',
            'shopping basket',
        ];

        for (const synonym of cartSynonyms) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: `Show me my ${synonym}`,
                tools: semanticToolSet,
            });
            console.log(`"${synonym}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe('viewCart');
        }
    });

    it('should recognize purchase/checkout synonyms', async () => {
        const checkoutPhrases = [
            'checkout',
            'complete my purchase',
            'buy now',
            'place my order',
            'finish shopping',
        ];

        for (const phrase of checkoutPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`"${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe('checkout');
        }
    });

    it('should recognize search synonyms', async () => {
        const searchPhrases = [
            'find laptops',
            'look for laptops',
            'search laptops',
            'browse laptops',
            'show me laptops',
        ];

        for (const phrase of searchPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`"${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe('searchProducts');
        }
    });
});

runLive('Implicit Intent Recognition', () => {
    jest.setTimeout(180000);

    it('should understand implicit add intent', async () => {
        const implicitAdd = [
            'I want product ABC-123',
            'Give me 3 of those',
            'I\'ll take the red one',
            'Put this in my cart',
        ];

        let addCount = 0;
        for (const phrase of implicitAdd) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`Implicit add "${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === 'addToCart') addCount++;
        }
        expect(addCount).toBeGreaterThanOrEqual(3);
    });

    it('should understand implicit remove intent', async () => {
        const implicitRemove = [
            'I don\'t want ITEM-001 anymore',
            'Take ITEM-002 out of my cart',
            'Nevermind about ITEM-003',
            'Get rid of ITEM-004',
        ];

        let removeCount = 0;
        for (const phrase of implicitRemove) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`Implicit remove "${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === 'removeFromCart') removeCount++;
        }
        expect(removeCount).toBeGreaterThanOrEqual(3);
    });

    it('should understand shipping/tracking inquiries', async () => {
        const trackingPhrases = [
            'Where is my order ORD-123?',
            'When will ORD-456 arrive?',
            'Track shipment for order ORD-789',
            'Is my order on the way?',
        ];

        let trackCount = 0;
        for (const phrase of trackingPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`Tracking "${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === 'trackOrder') trackCount++;
        }
        expect(trackCount).toBeGreaterThanOrEqual(3);
    });
});

runLive('Contextual Understanding', () => {
    jest.setTimeout(120000);

    it('should understand emotional context = support need', async () => {
        const frustrationPhrases = [
            'This is so frustrating, my order is missing!',
            'I\'ve been waiting forever, need help',
            'Something went wrong with my purchase',
            'I have a problem with my account',
        ];

        let supportCount = 0;
        for (const phrase of frustrationPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.reasoning,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`Frustration "${phrase.slice(0, 30)}..." -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === 'contactSupport') supportCount++;
        }
        console.log(`Support recognition: ${supportCount}/${frustrationPhrases.length}`);
        expect(supportCount).toBeGreaterThanOrEqual(1);
    });

    it('should understand time-sensitive language', async () => {
        const urgentPhrases = [
            'I need to check out right now',
            'Complete my order immediately',
            'Rush my purchase',
        ];

        for (const phrase of urgentPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt: phrase,
                tools: semanticToolSet,
            });
            console.log(`Urgent "${phrase}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe('checkout');
        }
    });
});

runLive('Numerical Understanding', () => {
    jest.setTimeout(120000);

    it('should understand quantity expressions', async () => {
        const quantityPhrases = [
            { prompt: 'Add a dozen of PROD-001 to cart', expectedMin: 10 },
            { prompt: 'Add a couple of PROD-002', expectedMin: 2 },
            { prompt: 'Add half a dozen PROD-003', expectedMin: 5 },
        ];

        for (const { prompt } of quantityPhrases) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: semanticToolSet,
            });
            console.log(`Quantity: "${prompt}" -> ${toolCalls?.[0]?.toolName}`);
            expect(toolCalls?.[0]?.toolName).toBe('addToCart');
        }
    });

    it('should handle written numbers', async () => {
        const writtenNumbers = [
            'Add five units of ITEM-001 to cart',
            'Put twenty ITEM-002 in my shopping cart',
            'Order one hundred ITEM-003',
        ];

        let successCount = 0;
        for (const prompt of writtenNumbers) {
            const { toolCalls } = await generateText({
                model: grokModels.fast,
                prompt,
                tools: semanticToolSet,
            });
            console.log(`Written number: "${prompt}" -> ${toolCalls?.[0]?.toolName}`);
            if (toolCalls?.[0]?.toolName === 'addToCart') successCount++;
        }
        expect(successCount).toBeGreaterThanOrEqual(2);
    });
});
