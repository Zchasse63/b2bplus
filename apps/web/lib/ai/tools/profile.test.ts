import { profileTools } from './profile';

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
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe('Profile Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default implementation
        mockSupabase.from.mockReturnThis();

        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1', email: 'test@example.com' } }
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockProfile = {
                id: 'user-1',
                full_name: 'Test User',
                role: 'customer',
                preferences: {}
            };
            mockSupabase.single.mockResolvedValue({ data: mockProfile });

            const result = await profileTools.getProfile.execute({});

            expect(result.fullName).toBe('Test User');
            expect(result.email).toBe('test@example.com');
        });
    });

    describe('getAddresses', () => {
        it('should return user addresses', async () => {
            const mockAddresses = [{ id: 'a1', city: 'City' }];
            // Setup mock chain for getAddresses: from('addresses').select('*').eq('user_id', ...).order(...)
            mockSupabase.order.mockResolvedValue({ data: mockAddresses });
            // Or stricter chain mocking if preferred, but simple resolved value usually works if chains return 'this' correctly.

            // To be safe with the 'this' chain return values
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockAddresses })
            });

            const result = await profileTools.getAddresses.execute({ type: 'all' });

            expect(result.addresses).toHaveLength(1);
            expect(result.addresses[0].id).toBe('a1');
        });
    });

    describe('updateProfile', () => {
        it('should update profile fields', async () => {
            mockSupabase.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

            const result = await profileTools.updateProfile.execute({
                fullName: 'New Name'
            });

            expect(result.success).toBe(true);
            expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
                full_name: 'New Name'
            }));
        });
    });

    describe('addAddress', () => {
        it('should add a new address', async () => {
            const newAddress = {
                type: 'shipping' as const,
                name: 'Home',
                street1: '123 St',
                city: 'City',
                state: 'ST',
                zip: '12345',
                country: 'US'
            };
            const mockCreated = { id: 'a2', ...newAddress, is_default: false };

            const insertMock = jest.fn().mockReturnValue({
                select: () => ({ single: () => Promise.resolve({ data: mockCreated }) })
            });

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'addresses') return { insert: insertMock };
                return mockSupabase; // fallback
            });

            const result = await profileTools.addAddress.execute(newAddress);

            expect(result.success).toBe(true);
            expect(result.address.name).toBe('Home');
            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                city: 'City',
                zip: '12345'
            }));
        });
    });
});
