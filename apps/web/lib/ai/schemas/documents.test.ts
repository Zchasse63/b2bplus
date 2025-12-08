import {
    parsedInvoiceSchema,
    parsedPurchaseOrderSchema,
    parsedPriceListSchema,
    documentAnalysisSchema
} from './documents';

describe('Document Schemas', () => {
    describe('parsedInvoiceSchema', () => {
        it('should validate complete invoice', () => {
            const validInvoice = {
                invoiceNumber: 'INV-001',
                invoiceDate: '2023-01-01',
                customerInfo: {},
                vendorInfo: {},
                lineItems: [{
                    itemNumber: 'SKU123',
                    description: 'Test Item',
                    quantity: 1,
                    unitPrice: 10.00
                }],
                total: 10.00
            };
            const result = parsedInvoiceSchema.safeParse(validInvoice);
            expect(result.success).toBe(true);
        });

        it('should require invoice number', () => {
            const invalidInvoice = {
                invoiceDate: '2023-01-01',
                customerInfo: {},
                vendorInfo: {},
                lineItems: [],
                total: 0
            };
            const result = parsedInvoiceSchema.safeParse(invalidInvoice);
            expect(result.success).toBe(false);
        });
    });

    describe('parsedPurchaseOrderSchema', () => {
        it('should validate complete PO', () => {
            const validPO = {
                poNumber: 'PO-001',
                poDate: '2023-01-01',
                shipToAddress: {},
                lineItems: [{
                    itemNumber: 'SKU123',
                    quantity: 5
                }]
            };
            const result = parsedPurchaseOrderSchema.safeParse(validPO);
            expect(result.success).toBe(true);
        });
    });

    describe('parsedPriceListSchema', () => {
        it('should validate price list with regions', () => {
            const validPriceList = {
                pricingRegions: ['Region A', 'Region B'],
                items: [{
                    itemNumber: 'SKU123',
                    description: 'Product A',
                    pricing: { 'Region A': 100, 'Region B': 110 }
                }]
            };
            const result = parsedPriceListSchema.safeParse(validPriceList);
            expect(result.success).toBe(true);
        });
    });

    describe('documentAnalysisSchema', () => {
        it('should validate analysis with confidence scores', () => {
            const validAnalysis = {
                documentType: 'invoice',
                confidence: 95,
                detectedColumns: [],
                warnings: [],
                summary: {
                    totalRows: 10,
                    validRows: 10,
                    errorRows: 0,
                    warningRows: 0
                }
            };
            const result = documentAnalysisSchema.safeParse(validAnalysis);
            expect(result.success).toBe(true);
        });
    });
});
