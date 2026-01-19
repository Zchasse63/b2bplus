import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/providers/unified';
import { createLogger } from '@/lib/logging/logger';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, ValidationError } from '@/lib/middleware/error-handler';

const logger = createLogger('ai-excel-import');

interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  sampleValues: any[];
}

interface ValidationErrorItem {
  row: number;
  column: string;
  value: any;
  error: string;
}

// POST analyze Excel file and suggest column mappings using AI
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin');
    }

    const body = await request.json();
    const { headers, sampleRows, importType = 'products' } = body;

    if (!headers || !sampleRows || !Array.isArray(headers) || !Array.isArray(sampleRows)) {
      throw new ValidationError('Headers and sample rows are required', {
        headers: !headers || !Array.isArray(headers) ? ['headers array is required'] : [],
        sampleRows: !sampleRows || !Array.isArray(sampleRows) ? ['sampleRows array is required'] : [],
      });
    }

    // Define expected fields based on import type
    const expectedFields: Record<string, string[]> = {
      products: [
        'name', 'sku', 'description', 'category', 'base_price',
        'cost_price', 'unit_of_measure', 'min_order_quantity',
        'is_active', 'image_url'
      ],
      prices: [
        'sku', 'product_name', 'base_price', 'cost_price', 'effective_date'
      ],
      inventory: [
        'sku', 'product_name', 'quantity', 'location', 'warehouse'
      ]
    };

    const targetFields = expectedFields[importType] || expectedFields.products;

    // Use Gemini 2.5 Flash for smart column mapping
    const prompt = `I need to map Excel columns to database fields for a B2B e-commerce platform.

Import Type: ${importType}

Excel Columns (with sample data):
${headers.map((header: string, idx: number) => {
  const samples = sampleRows.slice(0, 3).map((row: any) => row[idx]).filter(Boolean);
  return `- "${header}": ${samples.join(', ')}`;
}).join('\n')}

Target Database Fields:
${targetFields.map(field => `- ${field}`).join('\n')}

Task: Map each Excel column to the most appropriate database field. Consider:
1. Column name similarity
2. Sample data format and content
3. Data type compatibility
4. Common naming conventions

Return a JSON array of mappings with this structure:
[
  {
    "sourceColumn": "Excel column name",
    "targetField": "database field name or null if no match",
    "confidence": 0.0 to 1.0,
    "reasoning": "brief explanation"
  }
]

Only map columns where you have at least 50% confidence. Return null for targetField if no good match exists.`;

    const aiResponse = await generateJSON<any>(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are a data mapping expert for B2B e-commerce platforms. Analyze column names and sample data to suggest accurate field mappings.'
    });

    let mappings: ColumnMapping[];
    try {
      // aiResponse is already parsed JSON from generateJSON
      mappings = aiResponse.mappings || aiResponse;

      // Ensure mappings is an array
      if (!Array.isArray(mappings)) {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      logger.warn('Error parsing AI response, falling back to simple matching', { parseError });

      // Fallback to simple string matching
      mappings = headers.map((header: string, idx: number) => {
        const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        let bestMatch: string | null = null;
        let bestScore = 0;

        for (const field of targetFields) {
          const fieldLower = field.toLowerCase().replace(/[^a-z0-9]/g, '');
          const score = similarity(headerLower, fieldLower);
          if (score > bestScore && score > 0.5) {
            bestScore = score;
            bestMatch = field;
          }
        }

        return {
          sourceColumn: header,
          targetField: bestMatch,
          confidence: bestScore,
          sampleValues: sampleRows.slice(0, 3).map((row: any) => row[idx]).filter(Boolean)
        };
      });
    }

    // Validate sample data against target fields
    const validationErrors: ValidationErrorItem[] = [];

    sampleRows.slice(0, 10).forEach((row: any, rowIdx: number) => {
      mappings.forEach((mapping) => {
        if (!mapping.targetField) return;

        const colIdx = headers.indexOf(mapping.sourceColumn);
        const value = row[colIdx];

        // Validate based on target field type
        if (mapping.targetField === 'base_price' || mapping.targetField === 'cost_price') {
          const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
          if (isNaN(numValue) || numValue < 0) {
            validationErrors.push({
              row: rowIdx + 2, // +2 for header row and 0-index
              column: mapping.sourceColumn,
              value: value,
              error: 'Invalid price format (must be a positive number)'
            });
          }
        }

        if (mapping.targetField === 'sku' && !value) {
          validationErrors.push({
            row: rowIdx + 2,
            column: mapping.sourceColumn,
            value: value,
            error: 'SKU is required'
          });
        }

        if (mapping.targetField === 'name' && (!value || String(value).trim().length === 0)) {
          validationErrors.push({
            row: rowIdx + 2,
            column: mapping.sourceColumn,
            value: value,
            error: 'Product name is required'
          });
        }
      });
    });

    return NextResponse.json({
      success: true,
      mappings: mappings,
      validationErrors: validationErrors.slice(0, 50), // Limit to first 50 errors
      stats: {
        totalColumns: headers.length,
        mappedColumns: mappings.filter(m => m.targetField).length,
        unmappedColumns: mappings.filter(m => !m.targetField).length,
        highConfidenceMappings: mappings.filter(m => m.confidence > 0.8).length,
        validationErrors: validationErrors.length
      }
    });

  } catch (error) {
    return handleError(error);
  }
}

// Helper function to calculate string similarity (Levenshtein distance)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
