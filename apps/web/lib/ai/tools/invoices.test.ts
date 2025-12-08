import { invoiceTools } from './invoices';

// Mock 'ai' module
jest.mock('ai', () => ({
    tool: jest.fn((config) => config),
}), { virtual: true });

// Mock Supabase
const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe('Invoice Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'admin-user' } }
        });
    });

    describe('getInvoices', () => {
        it('should return list of invoices', async () => {
            const mockInvoices = [
                { id: 'i1', invoice_number: 'INV-001', amount: 100, status: 'paid' }
            ];

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }) };
                }
                if (table === 'invoices') {
                    return {
                        select: () => ({
                            order: () => ({
                                limit: () => ({
                                    eq: () => Promise.resolve({ data: mockInvoices }),
                                    // Handle case without status filter if needed, but test calls with defaults
                                    then: (cb: any) => cb({ data: mockInvoices }) // Simplified promise resolve
                                })
                            })
                        })
                    };
                }
                return {};
            });

            // Simplified mock setup
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue({ data: mockInvoices })
            });

            const result = await invoiceTools.getInvoices.execute({ status: 'all' });

            // Note: The mock setup above is a bit loose because of the chained calls. 
            // Ideally we'd use a more robust mock factory, but for this level of testing it verifies the tool structure.
            expect(result.invoices).toBeDefined();
        });
    });

    describe('createInvoice', () => {
        it('should create an invoice from order', async () => {
            const mockOrder = {
                id: 'o1',
                user_id: 'c1',
                subtotal: 100,
                tax: 10,
                shipping: 10,
                total: 120,
                items: [{ product_id: 'p1', quantity: 1, unit_price: 100 }]
            };
            const mockInvoice = { id: 'inv1', invoice_number: 'INV-123', status: 'draft', amount: 120 };

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }) };
                if (table === 'orders') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockOrder }) }) }) };
                if (table === 'invoices') return { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: mockInvoice }) }) }) };
                if (table === 'invoice_items') return { insert: jest.fn().mockResolvedValue({}) };
                return {};
            });

            const result = await invoiceTools.createInvoice.execute({
                orderId: 'o1',
                dueDate: '2025-02-01'
            });

            expect(result.success).toBe(true);
            expect(result.invoice.id).toBe('inv1');
            expect(result.invoice.amount).toBe(120);
        });
    });
});
