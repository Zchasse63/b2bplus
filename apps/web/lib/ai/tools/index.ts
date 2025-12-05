/**
 * AI Tools Registry
 *
 * Central export for all AI tools used by the AI Companion.
 * Total: 84 tools across 10 domains.
 */

// Domain-specific tool exports
export { productTools, type ProductTools } from './products';
export { cartTools, type CartTools } from './cart';
export { orderTools, type OrderTools } from './orders';
export { documentTools, type DocumentTools } from './documents';
export { analyticsTools, type AnalyticsTools } from './analytics';
export { customerTools, type CustomerTools } from './customers';
export { campaignTools, type CampaignTools } from './campaigns';
export { invoiceTools, type InvoiceTools } from './invoices';
export { profileTools, type ProfileTools } from './profile';
export { navigationTools, type NavigationTools } from './navigation';

// Import all tools for combined registry
import { productTools } from './products';
import { cartTools } from './cart';
import { orderTools } from './orders';
import { documentTools } from './documents';
import { analyticsTools } from './analytics';
import { customerTools } from './customers';
import { campaignTools } from './campaigns';
import { invoiceTools } from './invoices';
import { profileTools } from './profile';
import { navigationTools } from './navigation';

/**
 * All tools combined for AI Companion use.
 * Organized by domain for easy reference.
 */
export const allTools = {
  // Customer-facing tools (40 tools)
  ...productTools,      // 9 tools: search, details, availability, compare, related, categories, pricing, quote, recommendations
  ...cartTools,         // 9 tools: get, summary, add, update, remove, clear, promo, removePromo, saveQuote
  ...orderTools,        // 9 tools: search, details, timeline, recent, create, reorder, updateStatus, cancel, bulkUpload
  ...profileTools,      // 8 tools: get, addresses, notifications, payments, activity, update, addAddress, updateAddress, deleteAddress, notificationSettings, markRead
  ...navigationTools,   // 5 tools: context, suggestions, links, search, help, report

  // Admin tools (32 tools)
  ...analyticsTools,    // 7 tools: revenue, trends, insights, churn, productPerformance, inventory, executive
  ...customerTools,     // 7 tools: search, details, orders, update, tier, notes, getNotes, message
  ...campaignTools,     // 9 tools: list, details, performance, promoCodes, createPromo, updatePromo, create, updateStatus, sendEmail
  ...invoiceTools,      // 9 tools: get, details, overdue, create, updateStatus, send, payment, paymentHistory

  // Document processing tools (12 tools)
  ...documentTools,     // 12 tools: upload, analyze, parseInvoice, parsePO, parsePriceList, validate, suggestSku, importInvoice, importPO, importPriceList, bulk
};

/**
 * Tool categories for UI organization
 */
export const toolCategories = {
  products: {
    name: 'Products',
    description: 'Search and browse products',
    tools: Object.keys(productTools),
    icon: 'package',
  },
  cart: {
    name: 'Cart',
    description: 'Manage shopping cart',
    tools: Object.keys(cartTools),
    icon: 'shopping-cart',
  },
  orders: {
    name: 'Orders',
    description: 'Order management',
    tools: Object.keys(orderTools),
    icon: 'file-text',
  },
  profile: {
    name: 'Profile',
    description: 'Account settings',
    tools: Object.keys(profileTools),
    icon: 'user',
  },
  navigation: {
    name: 'Navigation',
    description: 'Help and navigation',
    tools: Object.keys(navigationTools),
    icon: 'compass',
  },
  analytics: {
    name: 'Analytics',
    description: 'Business analytics (Admin)',
    tools: Object.keys(analyticsTools),
    icon: 'bar-chart',
    adminOnly: true,
  },
  customers: {
    name: 'Customers',
    description: 'Customer management (Admin)',
    tools: Object.keys(customerTools),
    icon: 'users',
    adminOnly: true,
  },
  campaigns: {
    name: 'Campaigns',
    description: 'Marketing campaigns (Admin)',
    tools: Object.keys(campaignTools),
    icon: 'send',
    adminOnly: true,
  },
  invoices: {
    name: 'Invoices',
    description: 'Invoice management',
    tools: Object.keys(invoiceTools),
    icon: 'file-invoice',
  },
  documents: {
    name: 'Documents',
    description: 'Document processing',
    tools: Object.keys(documentTools),
    icon: 'file-upload',
  },
};

/**
 * Get tools available for a specific user role
 */
export function getToolsForRole(role: 'customer' | 'admin' | null) {
  if (role === 'admin') {
    return allTools;
  }

  // Customers get limited tools
  return {
    ...productTools,
    ...cartTools,
    ...orderTools,
    ...profileTools,
    ...navigationTools,
    // Limited invoice access (read-only for own invoices)
    getInvoices: invoiceTools.getInvoices,
    getInvoiceDetails: invoiceTools.getInvoiceDetails,
    getPaymentHistory: invoiceTools.getPaymentHistory,
  };
}

/**
 * Tool counts by category
 */
export const toolCounts = {
  products: Object.keys(productTools).length,
  cart: Object.keys(cartTools).length,
  orders: Object.keys(orderTools).length,
  profile: Object.keys(profileTools).length,
  navigation: Object.keys(navigationTools).length,
  analytics: Object.keys(analyticsTools).length,
  customers: Object.keys(customerTools).length,
  campaigns: Object.keys(campaignTools).length,
  invoices: Object.keys(invoiceTools).length,
  documents: Object.keys(documentTools).length,
  total: Object.keys(allTools).length,
};
