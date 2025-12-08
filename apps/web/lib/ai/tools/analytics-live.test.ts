/**
 * Live Analytics Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select analytics tools (admin-only).
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

const analyticsToolSet = {
    getRevenueMetrics: tool({
        description: 'Get revenue metrics and trends for a specified period.',
        parameters: z.object({
            period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
            groupBy: z.enum(['day', 'week', 'month']).optional(),
        }),
    }),

    getCustomerInsights: tool({
        description: 'Get customer analytics including segmentation and lifetime value.',
        parameters: z.object({
            segment: z.enum(['all', 'high_value', 'at_risk', 'new']).optional(),
        }),
    }),

    predictChurnRisk: tool({
        description: 'Predict churn risk for customers based on activity patterns.',
        parameters: z.object({
            customerId: z.string().optional().describe('Specific customer or all'),
            threshold: z.number().optional().describe('Risk threshold 0-1'),
        }),
    }),

    getProductPerformance: tool({
        description: 'Get product sales performance and trends.',
        parameters: z.object({
            period: z.enum(['week', 'month', 'quarter']),
            category: z.string().optional(),
        }),
    }),

    getInventoryAnalytics: tool({
        description: 'Get inventory analytics including turnover and stockout predictions.',
        parameters: z.object({
            warehouseId: z.string().optional(),
        }),
    }),

    getExecutiveSummary: tool({
        description: 'Generate an executive summary of key business metrics.',
        parameters: z.object({
            period: z.enum(['week', 'month', 'quarter']),
            includeForecasts: z.boolean().optional(),
        }),
    }),
};

runLive('Live Analytics Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select getRevenueMetrics for revenue queries', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me this month\'s revenue numbers',
            tools: analyticsToolSet,
        });

        console.log('Revenue tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getRevenueMetrics');
    });

    it('should select getCustomerInsights for customer analysis', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Analyze our high-value customer segment',
            tools: analyticsToolSet,
        });

        console.log('Customer insights tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCustomerInsights');
    });

    it('should select predictChurnRisk for churn prediction', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Which customers are at risk of churning?',
            tools: analyticsToolSet,
        });

        console.log('Churn prediction tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('predictChurnRisk');
    });

    it('should select getProductPerformance for product analytics', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Which products are selling best this quarter?',
            tools: analyticsToolSet,
        });

        console.log('Product performance tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getProductPerformance');
    });

    it('should select getInventoryAnalytics for inventory queries', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me inventory turnover rates and potential stockouts',
            tools: analyticsToolSet,
        });

        console.log('Inventory analytics tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getInventoryAnalytics');
    });

    it('should select getExecutiveSummary for executive reports', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Generate an executive summary for the board meeting',
            tools: analyticsToolSet,
        });

        console.log('Executive summary tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getExecutiveSummary');
    });
});
