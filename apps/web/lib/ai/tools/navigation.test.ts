import { navigationTools } from './navigation';

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
    single: jest.fn(),
    or: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe('Navigation Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1' } }
        });
        mockSupabase.single.mockResolvedValue({
            data: { role: 'customer' }
        });
    });

    describe('getCurrentContext', () => {
        it('should identify dashboard context', async () => {
            const result = await navigationTools.getCurrentContext.execute({
                currentPath: '/dashboard'
            });

            expect(result.context.section).toBe('dashboard');
            expect(result.suggestions).toBeDefined();
        });

        it('should identify product detail context', async () => {
            const result = await navigationTools.getCurrentContext.execute({
                currentPath: '/products/123'
            });

            expect(result.context.section).toBe('products');
            expect(result.context.resourceId).toBe('123');
            expect(result.context.resourceType).toBe('product');
        });
    });

    describe('getNavigationLinks', () => {
        it('should return links for customer', async () => {
            const result = await navigationTools.getNavigationLinks.execute({});

            const paths = result.links.map((l: any) => l.path);
            expect(paths).toContain('/products');
            expect(paths).toContain('/cart');
            expect(paths).toContain('/orders');
            expect(paths).not.toContain('/admin');
        });

        it('should return admin links for admin user', async () => {
            mockSupabase.single.mockResolvedValue({ data: { role: 'admin' } });

            const result = await navigationTools.getNavigationLinks.execute({});

            const paths = result.links.map((l: any) => l.path);
            expect(paths).toContain('/admin');
        });
    });

    describe('search', () => {
        it('should search products and orders', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'customer' } }) }) }) };
                if (table === 'products') return {
                    select: () => ({
                        or: () => ({
                            eq: () => ({
                                limit: () => Promise.resolve({ data: [{ id: 'p1', name: 'Product 1' }] })
                            })
                        })
                    })
                };
                if (table === 'orders') return {
                    select: () => ({
                        or: () => ({
                            limit: () => ({
                                eq: () => Promise.resolve({ data: [{ id: 'o1', order_number: 'ORD-1' }] })
                            })
                        })
                    })
                };
                return {};
            });

            const result = await navigationTools.search.execute({
                query: 'test',
                types: ['products', 'orders']
            });

            expect(result.results.products).toHaveLength(1);
            expect(result.results.orders).toHaveLength(1);
        });
    });
});
