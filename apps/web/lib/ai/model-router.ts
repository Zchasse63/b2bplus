/**
 * Intelligent Model Router
 *
 * Dual-stage routing system that automatically selects between
 * grok-4-1-fast and grok-4-1-fast-reasoning based on task complexity.
 *
 * Stage 1: Pre-call prompt analysis (before first API call)
 * Stage 2: prepareStep escalation (during multi-step agent loops)
 */

import { LanguageModel, CoreMessage } from 'ai';
import { grokModels } from './providers/xai';

// ============================================================================
// TYPES
// ============================================================================

export interface RouterContext {
    /** Tool category detected from prompt */
    toolCategory?: string;
    /** User role for access-based routing */
    role?: 'customer' | 'admin' | null;
    /** Number of previous steps in agent loop */
    previousSteps?: number;
    /** Total message count in conversation */
    messageCount?: number;
    /** Previous tool calls in this session */
    previousTools?: string[];
}

export interface ModelSelection {
    /** Selected model */
    model: LanguageModel;
    /** Whether reasoning model was selected */
    useReasoning: boolean;
    /** Complexity score (0-100) */
    score: number;
    /** Reasons for selection */
    reasons: string[];
    /** Model ID string for logging */
    modelId: string;
}

export interface PrepareStepOptions {
    /** Default model to use */
    defaultModel?: LanguageModel;
    /** Escalate to reasoning after N steps */
    escalateAfterSteps?: number;
    /** Tool names that trigger reasoning escalation */
    escalateOnTools?: string[];
    /** Maximum messages to keep in context */
    maxContextMessages?: number;
}

export interface PrepareStepParams {
    stepNumber: number;
    messages: CoreMessage[];
    steps?: Array<{ toolCalls?: Array<{ toolName: string }> }>;
}

// ============================================================================
// COMPLEXITY SIGNALS
// ============================================================================

const COMPLEXITY_SIGNALS = {
    // Document processing - always triggers reasoning (+45)
    documentKeywords: [
        'parse',
        'csv',
        'excel',
        'spreadsheet',
        'pdf',
        'analyze document',
        'extract data',
        'process file',
        'import csv',
        'import excel',
        'read pdf',
        'upload document',
        'field mapping',
        'schema detection',
        'data extraction',
        'data import',
        'file upload',
        'document upload',
        'parse data',
        'parsing',
    ],

    // Analytics and insights
    analyticsKeywords: [
        'insights',
        'forecast',
        'predict',
        'trend',
        'analyze data',
        'analytics',
        'metrics',
        'revenue report',
        'sales analysis',
        'customer insights',
        'churn prediction',
        'performance analysis',
    ],

    // Complex reasoning tasks
    reasoningKeywords: [
        'compare',
        'recommend',
        'which is better',
        'why should',
        'explain',
        'evaluate',
        'pros and cons',
        'best option',
        'suggest',
        'optimize',
        'troubleshoot',
        'debug',
    ],

    // Multi-step/planning
    planningKeywords: [
        'step by step',
        'plan',
        'workflow',
        'sequence',
        'first then',
        'after that',
        'next step',
        'process',
    ],

    // Negation patterns (requires careful interpretation)
    negationPatterns: [
        /don['']?t.*but/i,
        /not.*instead/i,
        /rather than/i,
        /instead of/i,
        /actually.*not/i,
        /no.*wait/i,
        /just kidding/i,
    ],

    // Prompt length threshold
    lengthThreshold: 200,

    // Tool domains that benefit from reasoning
    reasoningToolDomains: ['documents', 'analytics', 'campaigns', 'invoices'],

    // Complex tools that should trigger reasoning
    complexTools: [
        'parseDocument',
        'analyzeDocument',
        'analyzeData',
        'getCustomerInsights',
        'getRevenueMetrics',
        'getSalesForecast',
        'generateReport',
        'compareProducts',
        'processPriceList',
    ],
};

// ============================================================================
// TOOL CATEGORY DETECTION
// ============================================================================

/**
 * Detect which tool category a prompt is likely targeting
 */
export function detectToolCategory(prompt: string): string | undefined {
    if (!prompt) return undefined;

    const categories: Record<string, string[]> = {
        documents: ['document', 'csv', 'excel', 'pdf', 'import', 'parse', 'upload', 'file'],
        analytics: ['analytics', 'report', 'metrics', 'revenue', 'forecast', 'insights', 'dashboard'],
        campaigns: ['campaign', 'email', 'marketing', 'promotion', 'newsletter'],
        orders: ['order', 'shipping', 'delivery', 'track', 'shipment', 'timeline'],
        products: ['product', 'search', 'catalog', 'sku', 'item', 'browse'],
        cart: ['cart', 'basket', 'checkout', 'add to cart', 'remove from cart'],
        customers: ['customer', 'account', 'client', 'buyer'],
        invoices: ['invoice', 'payment', 'billing', 'receipt'],
        profile: ['profile', 'address', 'settings', 'preference', 'notification'],
        navigation: ['page', 'navigate', 'go to', 'show me', 'take me'],
    };

    const lowerPrompt = prompt.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some((kw) => lowerPrompt.includes(kw))) {
            return category;
        }
    }

    return undefined;
}

// ============================================================================
// STAGE 1: PRE-CALL PROMPT ANALYSIS
// ============================================================================

/**
 * Analyze prompt complexity to determine which model to use
 *
 * @param prompt - User's input prompt
 * @param context - Additional context for routing decisions
 * @returns Model selection with reasoning
 */
export function analyzePromptComplexity(
    prompt: string,
    context?: RouterContext
): ModelSelection {
    let score = 0;
    const reasons: string[] = [];

    if (!prompt) {
        return {
            model: grokModels.fast,
            useReasoning: false,
            score: 0,
            reasons: ['empty_prompt'],
            modelId: 'grok-4-1-fast',
        };
    }

    const lowerPrompt = prompt.toLowerCase();

    // Check for document processing keywords (+45 - always triggers reasoning)
    if (COMPLEXITY_SIGNALS.documentKeywords.some((kw) => lowerPrompt.includes(kw))) {
        score += 45;
        reasons.push('document_processing');
    }

    // Check for analytics keywords (+25)
    if (COMPLEXITY_SIGNALS.analyticsKeywords.some((kw) => lowerPrompt.includes(kw))) {
        score += 25;
        reasons.push('analytics_task');
    }

    // Check for reasoning keywords (+20)
    if (COMPLEXITY_SIGNALS.reasoningKeywords.some((kw) => lowerPrompt.includes(kw))) {
        score += 20;
        reasons.push('requires_reasoning');
    }

    // Check for planning keywords (+15)
    if (COMPLEXITY_SIGNALS.planningKeywords.some((kw) => lowerPrompt.includes(kw))) {
        score += 15;
        reasons.push('multi_step_planning');
    }

    // Check prompt length (+15)
    if (prompt.length > COMPLEXITY_SIGNALS.lengthThreshold) {
        score += 15;
        reasons.push('long_prompt');
    }

    // Check for negation patterns (+20)
    if (COMPLEXITY_SIGNALS.negationPatterns.some((p) => p.test(prompt))) {
        score += 20;
        reasons.push('negation_handling');
    }

    // Context-based signals
    if (context?.toolCategory) {
        if (COMPLEXITY_SIGNALS.reasoningToolDomains.includes(context.toolCategory)) {
            score += 15;
            reasons.push('complex_tool_domain');
        }
    }

    // Admin tasks often benefit from reasoning
    if (context?.role === 'admin') {
        score += 10;
        reasons.push('admin_context');
    }

    // Long conversations may need reasoning
    if (context?.messageCount && context.messageCount > 10) {
        score += 10;
        reasons.push('long_conversation');
    }

    // Threshold: 40+ = reasoning
    const useReasoning = score >= 40;

    return {
        model: useReasoning ? grokModels.reasoning : grokModels.fast,
        useReasoning,
        score,
        reasons: reasons.length > 0 ? reasons : ['simple_request'],
        modelId: useReasoning ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast',
    };
}

// ============================================================================
// STAGE 2: PREPARE STEP FOR AGENT LOOPS
// ============================================================================

/**
 * Create a prepareStep function for agent loops
 * Enables dynamic model switching during multi-step execution
 *
 * @param options - Configuration options
 * @returns prepareStep function for Agent class
 */
export function createPrepareStep(options: PrepareStepOptions = {}) {
    const {
        defaultModel = grokModels.fast,
        escalateAfterSteps = 3,
        escalateOnTools = COMPLEXITY_SIGNALS.complexTools,
        maxContextMessages = 30,
    } = options;

    return async ({ stepNumber, messages, steps }: PrepareStepParams) => {
        const result: {
            model?: LanguageModel;
            messages?: CoreMessage[];
        } = {};

        // Check if we should escalate to reasoning model
        let shouldEscalate = false;
        const reasons: string[] = [];

        // Escalate after N steps (conversation is getting complex)
        if (stepNumber > escalateAfterSteps) {
            shouldEscalate = true;
            reasons.push(`step_${stepNumber}_exceeds_threshold`);
        }

        // Escalate if complex tools were called in previous steps
        if (steps && steps.length > 0) {
            const previousToolCalls = steps.flatMap((s) =>
                (s.toolCalls || []).map((tc) => tc.toolName)
            );

            const hasComplexTool = previousToolCalls.some((tool) =>
                escalateOnTools.includes(tool)
            );

            if (hasComplexTool) {
                shouldEscalate = true;
                reasons.push('complex_tool_in_chain');
            }
        }

        // Switch to reasoning model if escalation triggered
        if (shouldEscalate) {
            result.model = grokModels.reasoning;
            console.log('[ModelRouter] Escalating to reasoning model:', reasons);
        }

        // Manage context window if messages are getting long
        if (messages.length > maxContextMessages) {
            const systemMessage = messages.find((m) => m.role === 'system');
            const recentMessages = messages.slice(-20);

            result.messages = systemMessage
                ? [systemMessage, ...recentMessages]
                : recentMessages;

            console.log(
                `[ModelRouter] Trimmed context: ${messages.length} -> ${result.messages.length} messages`
            );
        }

        return result;
    };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the appropriate model for a user request
 * Combines prompt analysis with context
 */
export function getModelForRequest(
    messages: CoreMessage[],
    context?: Omit<RouterContext, 'messageCount'>
): ModelSelection {
    // Find the last user message
    const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'user');

    const prompt =
        typeof lastUserMessage?.content === 'string'
            ? lastUserMessage.content
            : '';

    // Detect tool category if not provided
    const toolCategory = context?.toolCategory || detectToolCategory(prompt);

    return analyzePromptComplexity(prompt, {
        ...context,
        toolCategory,
        messageCount: messages.length,
    });
}

/**
 * Check if a specific tool call should trigger reasoning
 */
export function shouldUseReasoningForTool(toolName: string): boolean {
    return COMPLEXITY_SIGNALS.complexTools.includes(toolName);
}

/**
 * Get model by explicit flag (for backward compatibility)
 */
export function getModelByFlag(useReasoning: boolean): LanguageModel {
    return useReasoning ? grokModels.reasoning : grokModels.fast;
}
