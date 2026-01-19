/**
 * Document Analysis API Endpoint
 *
 * Uses AI to analyze uploaded documents and detect structure.
 * Uses Grok 4.1 Fast Reasoning for complex analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { grokModels } from '@/lib/ai/providers/xai';
import { documentAnalysisSchema } from '@/lib/ai/schemas/documents';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ValidationError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError('Authentication required');
    }

    const { fileId, headers, sampleRows } = await request.json();

    if (!fileId || !headers) {
      throw new ValidationError('fileId and headers are required');
    }

    // Build prompt for AI analysis
    const prompt = `Analyze this document structure and determine:
1. What type of document this is (invoice, purchase_order, price_list, product_catalog, or unknown)
2. Map each column to a standard field name
3. Identify any potential issues or warnings

Column Headers:
${headers.map((h: string, i: number) => `${i + 1}. "${h}"`).join('\n')}

Sample Data (first few rows):
${sampleRows?.slice(0, 5).map((row: any[], i: number) =>
  `Row ${i + 1}: ${row.map((cell, j) => `${headers[j]}="${cell}"`).join(', ')}`
).join('\n') || 'No sample data provided'}

Provide your analysis with confidence scores. Map columns to these standard fields:
- For invoices: invoice_number, invoice_date, due_date, customer_name, customer_account, item_number, description, quantity, unit_price, extended_price, subtotal, tax, total
- For purchase orders: po_number, po_date, ship_to, item_number, description, quantity, requested_date
- For price lists: item_number, description, pack_size, category, region1_price, region2_price, region3_price, region4_price, region5_price
- For catalogs: item_number, name, description, category, brand, pack_size, base_price`;

    // Use Grok reasoning model for complex analysis
    const result = await generateObject({
      model: grokModels.reasoning,
      schema: documentAnalysisSchema,
      prompt,
      temperature: 0.2, // Low temperature for consistent analysis
    });

    // Update document record with analysis
    await supabase
      .from('document_uploads')
      .update({
        document_type: result.object.documentType,
        analysis: result.object,
        status: 'analyzed',
      })
      .eq('id', fileId);

    return NextResponse.json({
      success: true,
      fileId,
      analysis: result.object,
    });
  } catch (error) {
    return handleError(error);
  }
}
