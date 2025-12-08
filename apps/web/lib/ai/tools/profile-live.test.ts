/**
 * Live Profile Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select user profile tools.
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

const profileToolSet = {
    getProfile: tool({
        description: 'Get current user profile',
        parameters: z.object({}),
    }),

    getAddresses: tool({
        description: 'Get user addresses',
        parameters: z.object({
            type: z.enum(['all', 'shipping', 'billing']).optional(),
        }),
    }),

    getNotificationSettings: tool({
        description: 'Get notification preferences',
        parameters: z.object({}),
    }),

    getPaymentMethods: tool({
        description: 'Get saved payment methods',
        parameters: z.object({}),
    }),

    getRecentActivity: tool({
        description: 'Get recent account activity',
        parameters: z.object({
            limit: z.number().optional(),
        }),
    }),

    updateProfile: tool({
        description: 'Update user profile information',
        parameters: z.object({
            fullName: z.string().optional(),
            company: z.string().optional(),
            phone: z.string().optional(),
        }),
    }),

    addAddress: tool({
        description: 'Add a new address',
        parameters: z.object({
            type: z.enum(['shipping', 'billing']),
            name: z.string(),
            street1: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
            isDefault: z.boolean().optional(),
        }),
    }),

    updateAddress: tool({
        description: 'Update an existing address',
        parameters: z.object({
            addressId: z.string(),
            updates: z.object({
                name: z.string().optional(),
                street1: z.string().optional(),
                city: z.string().optional(),
                isDefault: z.boolean().optional(),
            }),
        }),
    }),

    deleteAddress: tool({
        description: 'Delete an address',
        parameters: z.object({
            addressId: z.string(),
        }),
    }),

    updateNotificationSettings: tool({
        description: 'Update notification preferences',
        parameters: z.object({
            orderUpdates: z.boolean().optional(),
            promotions: z.boolean().optional(),
            newsletter: z.boolean().optional(),
        }),
    }),
};

runLive('Live Profile Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select getProfile for profile viewing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me my profile',
            tools: profileToolSet,
        });

        console.log('Get profile tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getProfile');
    });

    it('should select getAddresses for address listing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show me my saved shipping addresses',
            tools: profileToolSet,
        });

        console.log('Get addresses tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getAddresses');
    });

    it('should select getNotificationSettings for notification prefs', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'What are my notification settings?',
            tools: profileToolSet,
        });

        console.log('Get notification settings tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getNotificationSettings');
    });

    it('should select getPaymentMethods for payment info', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show my saved payment methods',
            tools: profileToolSet,
        });

        console.log('Get payment methods tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getPaymentMethods');
    });

    it('should select getRecentActivity for activity history', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Show my recent account activity',
            tools: profileToolSet,
        });

        console.log('Get recent activity tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('getRecentActivity');
    });

    it('should select updateProfile for profile updates', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Update my phone number to 555-1234',
            tools: profileToolSet,
        });

        console.log('Update profile tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateProfile');
    });

    it('should select addAddress for new address', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Add a new shipping address at 123 Main St, New York, NY 10001',
            tools: profileToolSet,
        });

        console.log('Add address tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('addAddress');
    });

    it('should select updateAddress for address updates', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Change the street for address addr-12345 to 456 Oak Ave',
            tools: profileToolSet,
        });

        console.log('Update address tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateAddress');
    });

    it('should select deleteAddress for address deletion', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Delete address addr-12345',
            tools: profileToolSet,
        });

        console.log('Delete address tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('deleteAddress');
    });

    it('should select updateNotificationSettings for notification changes', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.fast,
            prompt: 'Turn off promotional emails',
            tools: profileToolSet,
        });

        console.log('Update notification settings tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('updateNotificationSettings');
    });
});
