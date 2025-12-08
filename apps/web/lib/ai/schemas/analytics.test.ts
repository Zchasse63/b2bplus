import {
    customerInsightsSchema,
    revenueMetricsSchema,
    executiveSummarySchema
} from './analytics';

describe('Analytics Schemas', () => {
    describe('customerInsightsSchema', () => {
        it('should validate customer segment data', () => {
            const validInsights = {
                summary: 'Good customer',
                churnRisk: {
                    score: 10,
                    level: 'low',
                    factors: [],
                    recommendations: []
                },
                opportunities: [],
                purchasePatterns: {
                    frequency: 'monthly',
                    averageOrderValue: 100,
                    preferredCategories: []
                },
                nextBestActions: []
            };
            const result = customerInsightsSchema.safeParse(validInsights);
            expect(result.success).toBe(true);
            if (!result.success) {
                console.error(result.error);
            }
        });
    });

    describe('revenueMetricsSchema', () => {
        it('should validate revenue time series', () => {
            const validMetrics = {
                period: 'Q1',
                totalRevenue: 10000,
                previousPeriodRevenue: 9000,
                percentChange: 11.1,
                orderCount: 100,
                averageOrderValue: 100,
                topCategories: [],
                topProducts: [],
                insights: []
            };
            const result = revenueMetricsSchema.safeParse(validMetrics);
            expect(result.success).toBe(true);
        });
    });

    describe('executiveSummarySchema', () => {
        it('should validate key metrics', () => {
            const validSummary = {
                period: '2023',
                overview: 'Great year',
                keyMetrics: {
                    totalRevenue: 100000,
                    revenueChange: 10,
                    totalOrders: 1000,
                    ordersChange: 5,
                    newCustomers: 50,
                    customerRetentionRate: 90,
                    averageOrderValue: 100
                },
                highlights: [],
                recommendations: [],
                outlook: 'Positive'
            };
            const result = executiveSummarySchema.safeParse(validSummary);
            expect(result.success).toBe(true);
        });
    });
});
