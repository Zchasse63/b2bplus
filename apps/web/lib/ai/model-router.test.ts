/**
 * Model Router Unit Tests
 * 
 * @jest-environment node
 *
 * Tests for the intelligent model routing logic
 */

import {
    analyzePromptComplexity,
    detectToolCategory,
    getModelForRequest,
    shouldUseReasoningForTool,
} from './model-router';

describe('detectToolCategory', () => {
    it('should detect document category', () => {
        expect(detectToolCategory('Parse this CSV file')).toBe('documents');
        expect(detectToolCategory('Upload the PDF document')).toBe('documents');
        expect(detectToolCategory('Import excel data')).toBe('documents');
    });

    it('should detect analytics category', () => {
        expect(detectToolCategory('Show me the revenue report')).toBe('analytics');
        expect(detectToolCategory('What are the sales metrics?')).toBe('analytics');
        expect(detectToolCategory('Generate insights dashboard')).toBe('analytics');
    });

    it('should detect products category', () => {
        expect(detectToolCategory('Search for laptops')).toBe('products');
        expect(detectToolCategory('Find product SKU-123')).toBe('products');
        expect(detectToolCategory('Browse the catalog')).toBe('products');
    });

    it('should detect cart category', () => {
        expect(detectToolCategory('Add to cart')).toBe('cart');
        expect(detectToolCategory('Show my basket')).toBe('cart');
        expect(detectToolCategory('Checkout now')).toBe('cart');
    });

    it('should detect orders category', () => {
        expect(detectToolCategory('Track my order')).toBe('orders');
        expect(detectToolCategory('Check shipping status')).toBe('orders');
        expect(detectToolCategory('Where is my delivery?')).toBe('orders');
    });

    it('should return undefined for ambiguous prompts', () => {
        expect(detectToolCategory('Hello')).toBeUndefined();
        expect(detectToolCategory('')).toBeUndefined();
    });
});

describe('analyzePromptComplexity', () => {
    describe('should use fast model for simple requests', () => {
        it('should use fast model for "Search for laptops"', () => {
            const result = analyzePromptComplexity('Search for laptops');
            expect(result.useReasoning).toBe(false);
            expect(result.modelId).toBe('grok-4-1-fast');
        });

        it('should use fast model for "Add item to cart"', () => {
            const result = analyzePromptComplexity('Add item to cart');
            expect(result.useReasoning).toBe(false);
        });

        it('should use fast model for "Show my orders"', () => {
            const result = analyzePromptComplexity('Show my orders');
            expect(result.useReasoning).toBe(false);
        });
    });

    describe('should always use reasoning for document processing', () => {
        it('should use reasoning for parse keyword', () => {
            const result = analyzePromptComplexity('Parse this data');
            expect(result.useReasoning).toBe(true);
            expect(result.reasons).toContain('document_processing');
            expect(result.score).toBeGreaterThanOrEqual(45);
        });

        it('should use reasoning for CSV', () => {
            const result = analyzePromptComplexity('Upload the CSV file');
            expect(result.useReasoning).toBe(true);
        });

        it('should use reasoning for Excel', () => {
            const result = analyzePromptComplexity('Import this Excel spreadsheet');
            expect(result.useReasoning).toBe(true);
        });

        it('should use reasoning for PDF', () => {
            const result = analyzePromptComplexity('Read this PDF document');
            expect(result.useReasoning).toBe(true);
        });
    });

    describe('should detect analytics signals', () => {
        it('should detect insights keyword', () => {
            const result = analyzePromptComplexity('Give me insights');
            expect(result.reasons).toContain('analytics_task');
        });

        it('should detect forecast keyword', () => {
            const result = analyzePromptComplexity('Create a forecast');
            expect(result.reasons).toContain('analytics_task');
        });

        it('should detect predict keyword', () => {
            const result = analyzePromptComplexity('predict next month');
            expect(result.reasons).toContain('analytics_task');
        });
    });

    describe('should detect reasoning signals', () => {
        it('should detect compare keyword', () => {
            const result = analyzePromptComplexity('compare these options');
            expect(result.reasons).toContain('requires_reasoning');
        });

        it('should detect recommend keyword', () => {
            const result = analyzePromptComplexity('recommend the best');
            expect(result.reasons).toContain('requires_reasoning');
        });

        it('should detect explain keyword', () => {
            const result = analyzePromptComplexity('explain why');
            expect(result.reasons).toContain('requires_reasoning');
        });
    });

    describe('should trigger reasoning with combined signals', () => {
        it('should use reasoning when document processing + reasoning combined', () => {
            // parse (30) + compare (20) = 50 => reasoning
            const result = analyzePromptComplexity('Parse this file and compare the results');
            expect(result.useReasoning).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(40);
        });

        it('should use reasoning when analytics + admin context', () => {
            // insights (25) + admin (10) + documents domain (15) = 50
            const result = analyzePromptComplexity('Show me insights', {
                role: 'admin',
                toolCategory: 'documents'
            });
            expect(result.useReasoning).toBe(true);
        });

        it('should use reasoning for complex multi-signal prompt', () => {
            // forecast (25) + recommend (20) = 45 => reasoning
            const result = analyzePromptComplexity('I need a sales forecast and recommend actions');
            expect(result.useReasoning).toBe(true);
        });
    });

    describe('should detect negation patterns', () => {
        it('should detect "don\'t...but" pattern', () => {
            const result = analyzePromptComplexity("Don't add that, but show me my cart instead");
            expect(result.reasons).toContain('negation_handling');
        });

        it('should detect "no wait" pattern', () => {
            const result = analyzePromptComplexity('No wait, I changed my mind');
            expect(result.reasons).toContain('negation_handling');
        });
    });

    describe('should detect long prompts', () => {
        it('should add long_prompt for prompts over 200 chars', () => {
            const longPrompt = 'x'.repeat(250);
            const result = analyzePromptComplexity(longPrompt);
            expect(result.reasons).toContain('long_prompt');
        });

        it('should not add long_prompt for short prompts', () => {
            const shortPrompt = 'Search laptops';
            const result = analyzePromptComplexity(shortPrompt);
            expect(result.reasons).not.toContain('long_prompt');
        });
    });

    describe('context-based routing', () => {
        it('should add score for admin role', () => {
            const result = analyzePromptComplexity('Search for items', { role: 'admin' });
            expect(result.reasons).toContain('admin_context');
        });

        it('should add score for complex tool domains', () => {
            const result = analyzePromptComplexity('Do something', { toolCategory: 'documents' });
            expect(result.reasons).toContain('complex_tool_domain');
        });

        it('should add score for long conversations', () => {
            const result = analyzePromptComplexity('Continue', { messageCount: 15 });
            expect(result.reasons).toContain('long_conversation');
        });
    });

    it('should handle empty prompt', () => {
        const result = analyzePromptComplexity('');
        expect(result.useReasoning).toBe(false);
        expect(result.reasons).toContain('empty_prompt');
    });
});

describe('getModelForRequest', () => {
    it('should extract last user message and analyze', () => {
        const messages = [
            { role: 'user' as const, content: 'Hello' },
            { role: 'assistant' as const, content: 'Hi there!' },
            { role: 'user' as const, content: 'Parse this and compare the data' },
        ];

        const result = getModelForRequest(messages);
        // parse (30) + compare (20) = 50 => reasoning
        expect(result.useReasoning).toBe(true);
    });

    it('should use fast model when no user messages', () => {
        const messages = [
            { role: 'assistant' as const, content: 'How can I help?' },
        ];

        const result = getModelForRequest(messages);
        expect(result.useReasoning).toBe(false);
    });
});

describe('shouldUseReasoningForTool', () => {
    it('should return true for complex tools', () => {
        expect(shouldUseReasoningForTool('parseDocument')).toBe(true);
        expect(shouldUseReasoningForTool('analyzeData')).toBe(true);
        expect(shouldUseReasoningForTool('getCustomerInsights')).toBe(true);
    });

    it('should return false for simple tools', () => {
        expect(shouldUseReasoningForTool('searchProducts')).toBe(false);
        expect(shouldUseReasoningForTool('addToCart')).toBe(false);
        expect(shouldUseReasoningForTool('getOrderDetails')).toBe(false);
    });
});
