/**
 * AI Tools Registry
 *
 * Central export for all AI tools used by the AI Companion.
 *
 * NOTE: All AI tools temporarily disabled due to TypeScript compilation errors
 * with AI SDK 5.0.108. Tools need context parameter added to execute functions.
 * See *.ts.broken files for original implementations.
 */

import type { ToolRegistry, ToolCounts } from '@/lib/types/ai';

// All tools disabled due to compilation errors
export const allTools: ToolRegistry = {};

export const toolCategories: Record<string, ToolRegistry> = {};

export function getToolsForRole(role: 'customer' | 'admin' | null): ToolRegistry {
  return {};
}

export const toolCounts: ToolCounts = {
  products: 0,
  cart: 0,
  orders: 0,
  profile: 0,
  navigation: 0,
  analytics: 0,
  customers: 0,
  campaigns: 0,
  invoices: 0,
  documents: 0,
  total: 0,
};
