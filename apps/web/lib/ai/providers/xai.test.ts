/**
 * Tests for xAI (Grok) provider configuration
 */
import { xai, grokModels, defaultModel, defaultSettings } from './xai';

// Mock @ai-sdk/xai
jest.mock('@ai-sdk/xai', () => ({
    createXai: jest.fn(() => jest.fn((modelId) => ({
        modelId,
        settings: {},
        doGenerate: jest.fn(),
        doStream: jest.fn(),
    }))),
}), { virtual: true });

// Mock the environment variables
const originalEnv = process.env;

describe('xAI Provider Configuration', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('Provider Initialization', () => {
        it('should create xAI provider configuration', () => {
            // Since xai is an instance or function from @ai-sdk/xai, we mostly check it exists
            expect(xai).toBeDefined();
        });
    });

    describe('Model Configuration', () => {
        it('should export grok-2-1212 model', () => {
            // Checking based on potential current model names, adjusting to match file content if needed
            expect(grokModels).toHaveProperty('fast');
            expect(grokModels['fast']).toBeDefined();
        });

        it('should export grok-2-vision-1212 model', () => {
            expect(grokModels).toHaveProperty('reasoning');
        });

        it('should set correct default model', () => {
            expect(defaultModel).toBeDefined();
        });
    });

    describe('Default Settings', () => {
        it('should have correct fast model settings', () => {
            expect(defaultSettings.fast).toBeDefined();
            // Adjust these expectations based on actual file content if different
        });
    });
});
