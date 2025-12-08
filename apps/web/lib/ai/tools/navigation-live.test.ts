/**
 * Live Navigation Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select navigation and context tools.
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

const navigationToolSet = {
    getCurrentContext: tool({
        description: 'Get current page context and user state',
        parameters: z.object({
            currentPath: z.string(),
            pageData: z.record(z.any()).optional(),
        }),
    }),

    getSuggestedActions: tool({
        description: 'Get AI-suggested actions based on current context',
        parameters: z.object({
            context: z.string(),
            recentActions: z.array(z.string()).optional(),
        }),
    }),

    getNavigationLinks: tool({
        description: 'Get available navigation links for current user',
        parameters: z.object({}),
    }),

    search: tool({
        description: 'Global search across products, orders, and customers',
        parameters: z.object({
            query: z.string(),
            types: z.array(z.enum(['products', 'orders', 'customers'])).optional(),
            limit: z.number().optional(),
        }),
    }),

    getHelp: tool({
        description: 'Get help and documentation for a topic',
        parameters: z.object({
            topic: z.string(),
        }),
    }),

    reportIssue: tool({
        description: 'Report an issue or problem',
        parameters: z.object({
            type: z.enum(['bug', 'feedback', 'question', 'complaint']),
            description: z.string(),
            context: z.object({
                page: z.string().optional(),
                orderId: z.string().optional(),
            }).optional(),
        }),
    }),
};

runLive('Live Navigation Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select getCurrentContext for context queries', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Where am I in the app right now?',
            tools: navigationToolSet,
        });

        console.log('Get current context tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCurrentContext');
    });

    it('should select getSuggestedActions for action suggestions', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'What actions should I take next based on my current context?',
            tools: navigationToolSet,
        });

        console.log('Get suggested actions tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getSuggestedActions');
    });

    it('should select getNavigationLinks for navigation help', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the main navigation links I can access',
            tools: navigationToolSet,
        });

        console.log('Get navigation links tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getNavigationLinks');
    });

    it('should select search for global search', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Search for "office supplies" across products and orders',
            tools: navigationToolSet,
        });

        console.log('Search tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('search');
    });

    it('should select getHelp for help requests', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'How do I place a bulk order?',
            tools: navigationToolSet,
        });

        console.log('Get help tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getHelp');
    });

    it('should select reportIssue for issue reporting', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'I want to report a bug - the checkout button is not working',
            tools: navigationToolSet,
        });

        console.log('Report issue tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('reportIssue');
    });
});
