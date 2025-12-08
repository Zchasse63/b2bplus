import { campaignTools } from './campaigns';

// Mock 'ai' module
jest.mock('ai', () => ({
    tool: jest.fn((config) => config),
}), { virtual: true });

// Mock Supabase
const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(), // Will use mockImplementation in tests
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

describe('Campaign Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Robust mock implementation for chaining
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'profiles') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: { role: 'admin' } })
                        })
                    })
                };
            }
            if (table === 'campaigns') {
                const chain = {
                    select: jest.fn().mockReturnThis(),
                    order: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockReturnThis(),
                    update: jest.fn().mockReturnThis(),
                    then: (resolve: any) => resolve({ data: [], count: 0 }) // Default resolved value
                };
                return chain;
            }
            return mockSupabase;
        });

        // Default to admin user for all tests as these are admin tools
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'admin-user', email: 'admin@example.com' } }
        });
    });

    describe('listCampaigns', () => {
        it('should list all campaigns', async () => {
            const mockCampaigns = [{ id: '1', name: 'Campaign 1' }];

            // Override for this specific test
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }) };
                if (table === 'campaigns') return {
                    select: () => ({
                        order: () => Promise.resolve({ data: mockCampaigns }),
                        eq: () => ({ order: () => Promise.resolve({ data: mockCampaigns }) })
                    })
                };
                return {};
            });

            const result = await campaignTools.listCampaigns.execute({ status: 'all' });

            expect(result.campaigns).toEqual(mockCampaigns);
            expect(result.count).toBe(1);
        });

        it('should require admin access', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'customer' } }) }) }) };
                return {};
            });

            await expect(campaignTools.listCampaigns.execute({ status: 'all' }))
                .rejects.toThrow('Admin access required');
        });
    });

    describe('createCampaign', () => {
        it('should create a new campaign', async () => {
            const newCampaign = {
                name: 'New Campaign',
                type: 'email' as const,
                startDate: '2025-01-01'
            };
            const createdCampaign = { id: '123', ...newCampaign, status: 'draft' };
            const insertMock = jest.fn().mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: createdCampaign }) }) });

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }) };
                if (table === 'campaigns') return { insert: insertMock };
                return {};
            });

            const result = await campaignTools.createCampaign.execute(newCampaign);

            expect(result.success).toBe(true);
            expect(result.campaign.name).toBe(newCampaign.name);
            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                name: newCampaign.name,
                type: newCampaign.type,
                status: 'draft'
            }));
        });
    });

    describe('updateCampaignStatus', () => {
        it('should update campaign status', async () => {
            const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' } }) }) }) };
                if (table === 'campaigns') return { update: updateMock };
                return {};
            });

            const result = await campaignTools.updateCampaignStatus.execute({
                campaignId: '123',
                status: 'active'
            });

            expect(result.success).toBe(true);
            expect(updateMock).toHaveBeenCalledWith({ status: 'active' });
        });
    });
});
