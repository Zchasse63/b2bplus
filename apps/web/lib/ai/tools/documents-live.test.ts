/**
 * Live Documents Tool Tests
 * 
 * @jest-environment node
 * 
 * Tests Grok's ability to correctly select document processing tools.
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

const documentToolSet = {
    analyzeDocumentStructure: tool({
        description: 'Analyze the structure of an uploaded document (CSV, Excel, PDF) to detect type and columns.',
        parameters: z.object({
            documentId: z.string().describe('The uploaded document ID'),
        }),
    }),

    parseInvoice: tool({
        description: 'Parse an invoice document to extract header, line items, and totals.',
        parameters: z.object({
            documentId: z.string().describe('The document ID'),
            mappings: z.record(z.string()).optional().describe('Column mappings if known'),
        }),
    }),

    parsePurchaseOrder: tool({
        description: 'Parse a purchase order document to extract PO details and items.',
        parameters: z.object({
            documentId: z.string().describe('The document ID'),
        }),
    }),

    parsePriceList: tool({
        description: 'Parse a price list document with regional pricing columns.',
        parameters: z.object({
            documentId: z.string().describe('The document ID'),
            regions: z.array(z.string()).optional().describe('Expected pricing regions'),
        }),
    }),

    validateParsedDocument: tool({
        description: 'Validate parsed document data against the product catalog.',
        parameters: z.object({
            documentId: z.string().describe('The document ID'),
            documentType: z.enum(['invoice', 'purchase_order', 'price_list']),
        }),
    }),

    importDocument: tool({
        description: 'Import validated document data into the system.',
        parameters: z.object({
            documentId: z.string().describe('The document ID'),
            options: z.object({
                updateExisting: z.boolean().optional(),
                skipErrors: z.boolean().optional(),
            }).optional(),
        }),
    }),
};

runLive('Live Documents Tool Selection', () => {
    jest.setTimeout(60000);

    it('should select analyzeDocumentStructure for document analysis', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Analyze the structure of the uploaded spreadsheet',
            tools: documentToolSet,
        });

        console.log('Analyze tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('analyzeDocumentStructure');
    });

    it('should select parseInvoice for invoice processing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Parse this invoice and extract the line items',
            tools: documentToolSet,
        });

        console.log('Parse invoice tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('parseInvoice');
    });

    it('should select parsePurchaseOrder for PO processing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Process this purchase order document',
            tools: documentToolSet,
        });

        console.log('Parse PO tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('parsePurchaseOrder');
    });

    it('should select parsePriceList for price list processing', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Parse this price list with regional pricing',
            tools: documentToolSet,
        });

        console.log('Parse price list tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('parsePriceList');
    });

    it('should select validateParsedDocument for validation', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Validate the parsed invoice data against our catalog',
            tools: documentToolSet,
        });

        console.log('Validate tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('validateParsedDocument');
    });

    it('should select importDocument for import action', async () => {
        const { toolCalls } = await generateText({
            model: grokModels.reasoning,
            prompt: 'Import the validated document into the system',
            tools: documentToolSet,
        });

        console.log('Import tool call:', JSON.stringify(toolCalls?.[0], null, 2));
        expect(toolCalls?.[0]?.toolName).toBe('importDocument');
    });
});
