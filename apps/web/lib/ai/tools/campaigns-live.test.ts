/**
 * Live Campaigns Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select campaign management tools.
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

const campaignToolSet = {
    listCampaigns: tool({
        description: 'List all marketing campaigns',
        parameters: z.object({
            status: z.enum(['all', 'draft', 'active', 'paused', 'completed']).optional(),
            type: z.enum(['all', 'email', 'promo', 'banner']).optional(),
        }),
    }),

    getCampaignDetails: tool({
        description: 'Get detailed campaign information and metrics',
        parameters: z.object({
            campaignId: z.string(),
        }),
    }),

    getCampaignPerformance: tool({
        description: 'Get performance analytics for campaigns',
        parameters: z.object({
            campaignId: z.string().optional(),
            dateRange: z.object({
                start: z.string(),
                end: z.string(),
            }).optional(),
        }),
    }),

    listPromoCodes: tool({
        description: 'List all promotional codes',
        parameters: z.object({
            activeOnly: z.boolean().optional(),
        }),
    }),

    createPromoCode: tool({
        description: 'Create a new promotional code',
        parameters: z.object({
            code: z.string(),
            discountPercent: z.number().optional(),
            discountAmount: z.number().optional(),
            expiresAt: z.string().optional(),
        }),
    }),

    updatePromoCode: tool({
        description: 'Update or deactivate a promo code',
        parameters: z.object({
            promoCodeId: z.string(),
            isActive: z.boolean().optional(),
            expiresAt: z.string().optional(),
        }),
    }),

    createCampaign: tool({
        description: 'Create a new marketing campaign',
        parameters: z.object({
            name: z.string(),
            type: z.enum(['email', 'promo', 'banner']),
            description: z.string().optional(),
            startDate: z.string(),
            endDate: z.string().optional(),
        }),
    }),

    updateCampaignStatus: tool({
        description: 'Update campaign status (activate, pause, or complete)',
        parameters: z.object({
            campaignId: z.string(),
            status: z.enum(['active', 'paused', 'completed']),
        }),
    }),

    sendCampaignEmail: tool({
        description: 'Send campaign email to target audience',
        parameters: z.object({
            campaignId: z.string(),
            subject: z.string(),
            content: z.string(),
            testMode: z.boolean().optional(),
        }),
    }),
};

runLive('Live Campaigns Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select listCampaigns for campaign listing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me all active marketing campaigns',
            tools: campaignToolSet,
        });

        console.log('List campaigns tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('listCampaigns');
    });

    it('should select getCampaignDetails for campaign lookup', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me the details for campaign camp-12345',
            tools: campaignToolSet,
        });

        console.log('Get campaign details tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCampaignDetails');
    });

    it('should select getCampaignPerformance for analytics', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'How is the Black Friday campaign performing?',
            tools: campaignToolSet,
        });

        console.log('Get campaign performance tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getCampaignPerformance');
    });

    it('should select listPromoCodes for promo code listing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me all active promo codes',
            tools: campaignToolSet,
        });

        console.log('List promo codes tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('listPromoCodes');
    });

    it('should select createPromoCode for new promo', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Create a new promo code SAVE20 for 20% off',
            tools: campaignToolSet,
        });

        console.log('Create promo code tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('createPromoCode');
    });

    it('should select updatePromoCode for promo updates', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Deactivate promo code promo-12345',
            tools: campaignToolSet,
        });

        console.log('Update promo code tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updatePromoCode');
    });

    it('should select createCampaign for new campaign', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Create a new email campaign called "Summer Sale" starting July 1st',
            tools: campaignToolSet,
        });

        console.log('Create campaign tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('createCampaign');
    });

    it('should select updateCampaignStatus for status changes', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Pause the holiday campaign camp-12345',
            tools: campaignToolSet,
        });

        console.log('Update campaign status tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateCampaignStatus');
    });

    it('should select sendCampaignEmail for email sending', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Send the campaign email for camp-12345 to all subscribers',
            tools: campaignToolSet,
        });

        console.log('Send campaign email tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('sendCampaignEmail');
    });
});
