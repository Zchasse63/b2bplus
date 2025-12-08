import { customerTools } from './customers';

// Mock 'ai' module since it's missing in the environment and we only need the tool wrapper to pass through
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
    or: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe('Customer Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default to admin user
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'admin-user' } }
        });
        mockSupabase.single.mockResolvedValue({
            data: { role: 'admin' }
        });
    });

    describe('searchCustomers', () => {
        it('should search customers by query', async () => {
            const mockCustomers = [{ id: 'c1', full_name: 'John Doe' }];
            mockSupabase.limit.mockResolvedValue({ data: mockCustomers });

            const result = await customerTools.searchCustomers.execute({
                query: 'John',
                limit: 10
            });

            expect(result.customers).toEqual(mockCustomers);
            expect(mockSupabase.or).toHaveBeenCalledWith(expect.stringContaining('John'));
        });
    });

    describe('getCustomerDetails', () => {
        it('should return simplified customer details', async () => {
            const mockCustomer = { id: 'c1', full_name: 'John Doe', email: 'john@example.com' };
            const mockOrders = [{ id: 'o1', total: 100, status: 'completed' }];
            const mockAddresses = [{ id: 'a1', city: 'New York' }];

            // Mock sequential calls
            // 1. Check admin role
            mockSupabase.single.mockResolvedValueOnce({ data: { role: 'admin' } });
            // 2. Get customer profile
            mockSupabase.single.mockResolvedValueOnce({ data: mockCustomer });
            // 3. Get addresses
            mockSupabase.select.mockResolvedValueOnce({ data: mockAddresses });
            // 4. Get orders (mocking the chain for orders query)
            // Implementation does: await supabase.from('orders').select(...).eq(...).order(...)
            // So we need the order() mock to return the data promises
            mockSupabase.order.mockResolvedValue({ data: mockOrders });

            // Note: because of how jest mocks work with chained methods returning 'this', 
            // the 'select' mock value might be overwritten by the last call or need strictly ordered mocks.
            // Simplified mocking for this test:
            mockSupabase.select.mockImplementation((query) => {
                if (query === 'role') return { eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) };
                if (query === '*') return {
                    eq: () => ({ single: () => Promise.resolve({ data: mockCustomer }) }), // profile
                    // addresses query also uses select('*'), this is tricky with simple mocks
                };
                return {
                    eq: () => ({
                        order: () => Promise.resolve({ data: mockOrders }) // orders
                    }),
                    // addresses
                    select: () => ({ eq: () => Promise.resolve({ data: mockAddresses }) })
                };
            });

            // Let's rely on the module structure of the tool. 
            // profile check -> profile fetch -> addresses fetch -> orders fetch

            // Resetting mocks to be more specific just for this test
            const selectMock = jest.fn();
            mockSupabase.from.mockReturnValue({ select: selectMock });

            // Profile check
            const eqMock1 = jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) });
            // Customer fetch
            const eqMock2 = jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockCustomer }) });
            // Address fetch
            const eqMock3 = jest.fn().mockResolvedValue({ data: mockAddresses });
            // Orders fetch
            const orderMock = jest.fn().mockResolvedValue({ data: mockOrders });
            const eqMock4 = jest.fn().mockReturnValue({ order: orderMock });

            selectMock.mockImplementation((fields) => {
                if (fields === 'role') return { eq: eqMock1 };
                if (fields === '*') return {
                    // This is ambiguous in the code (profiles vs addresses), 
                    // but the code calls `from` again.
                    // We need `from` to return different things.
                    eq: eqMock2 // Fallback
                };
                if (fields.includes('items:order_items')) return { eq: eqMock4 }; // getCustomerOrders
                return { eq: eqMock4 };
            });

            // Re-mocking `from` to handle different tables
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') {
                    return {
                        select: (f: string) => {
                            if (f === 'role') return { eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) };
                            // Fetch customer profile
                            return { eq: () => ({ single: () => Promise.resolve({ data: mockCustomer }) }) };
                        },
                        update: () => ({ eq: () => Promise.resolve({ error: null }) })
                    };
                }
                if (table === 'addresses') {
                    return { select: () => ({ eq: () => Promise.resolve({ data: mockAddresses }) }) };
                }
                if (table === 'orders') {
                    return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: mockOrders }) }) }) };
                }
                return { select: jest.fn() };
            });

            const result = await customerTools.getCustomerDetails.execute({ customerId: 'c1' });

            expect(result.customer.id).toBe('c1');
            expect(result.addresses).toHaveLength(1);
            expect(result.orderSummary.totalOrders).toBe(1);
        });
    });

    describe('updateCustomer', () => {
        it('should update customer profile', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') {
                    return {
                        select: (f: string) => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }),
                        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
                    };
                }
                return {};
            });

            const result = await customerTools.updateCustomer.execute({
                customerId: 'c1',
                updates: { fullName: 'Jane Doe' }
            });

            expect(result.success).toBe(true);
            expect(result.updates).toEqual({ full_name: 'Jane Doe' });
        });
    });
});
