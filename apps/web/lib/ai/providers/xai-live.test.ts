/**
 * LIVE Integration Test for Grok API
 * 
 * @jest-environment node
 * 
 * This test actually connects to the xAI API.
 * It requires the XAI_API_KEY environment variable to be set.
 */

import { generateText } from 'ai';
import { xai, grokModels } from './xai';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local for this test since Jest configuration might not verify it
const envPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(envPath)) {
    console.log('Loading env from:', envPath);
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

// Determine if we should run this test
const runLive = process.env.XAI_API_KEY ? describe : describe.skip;

runLive('xAI Live Integration', () => {
    // extended timeout for network calls
    jest.setTimeout(30000);

    it('should generate text from Grok', async () => {
        console.log('Attempting live call to Grok...');

        try {
            const { text } = await generateText({
                model: grokModels.fast,
                prompt: 'Say "Hello, World!" and nothing else.',
            });

            console.log('Grok Response:', text);
            expect(text).toContain('Hello');
            expect(text.length).toBeGreaterThan(0);
        } catch (error) {
            console.error('Live API Error:', error);
            throw error;
        }
    });
});
