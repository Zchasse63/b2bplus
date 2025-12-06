/**
 * Phase 3: Customer-Facing UI - Visual Search API
 * 
 * POST /api/search/visual
 * Uses Gemini multimodal to analyze images and find similar products
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageJSON } from '@/lib/ai/providers/unified';

interface VisualSearchRequest {
  image: string; // Base64 encoded image
}

/**
 * POST /api/search/visual
 * Search for products using an image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (optional - can be public)
    const { data: { user } } = await supabase.auth.getUser();

    const body: VisualSearchRequest = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Extract base64 data
    const base64Data = image.split(',')[1] || image;

    // Use Gemini to analyze the image
    const analysisPrompt = `
Analyze this product image and extract the following information:
1. Product type (e.g., cup, plate, container, utensil)
2. Material (e.g., paper, plastic, foam, aluminum)
3. Color
4. Size/capacity (if visible)
5. Key features (e.g., lid, compartments, insulated)
6. Intended use (e.g., hot drinks, cold drinks, food storage)

Provide the analysis in JSON format with these fields:
{
  "product_type": string,
  "material": string,
  "color": string,
  "size": string,
  "features": string[],
  "use_case": string,
  "search_keywords": string[]
}
`;

    const analysis = await analyzeImageJSON(base64Data, analysisPrompt, 'image/jpeg');

    // Build search query from analysis
    const searchKeywords = [
      analysis.product_type,
      analysis.material,
      analysis.color,
      ...analysis.features,
      analysis.use_case,
    ]
      .filter(Boolean)
      .join(' ');

    // Search for similar products using semantic search
    const { data: products, error } = await supabase.rpc('search_products_semantic', {
      search_query: searchKeywords,
      match_threshold: 0.5,
      match_count: 12,
    });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Score and rank results based on similarity to analysis
    const scoredProducts = (products || []).map((product: any) => {
      let score = 0;

      // Check product name and description for matches
      const productText = `${product.name} ${product.description || ''}`.toLowerCase();

      if (analysis.product_type && productText.includes(analysis.product_type.toLowerCase())) {
        score += 0.3;
      }
      if (analysis.material && productText.includes(analysis.material.toLowerCase())) {
        score += 0.2;
      }
      if (analysis.color && productText.includes(analysis.color.toLowerCase())) {
        score += 0.1;
      }

      // Check features
      analysis.features?.forEach((feature: string) => {
        if (productText.includes(feature.toLowerCase())) {
          score += 0.1;
        }
      });

      return {
        ...product,
        similarity_score: Math.min(1, score + (product.similarity || 0)),
      };
    });

    // Sort by similarity score
    scoredProducts.sort((a: any, b: any) => b.similarity_score - a.similarity_score);

    return NextResponse.json({
      success: true,
      analysis,
      results: scoredProducts.slice(0, 8), // Return top 8 matches
    });
  } catch (error) {
    console.error('Visual search error:', error);
    return NextResponse.json(
      { error: 'Visual search failed' },
      { status: 500 }
    );
  }
}

