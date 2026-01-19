import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, cosineSimilarity as geminiCosineSimilarity } from '@/lib/ai/providers/unified'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { handleError, AuthError, ForbiddenError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler'

interface ProductToMap {
  oldSKU: string
  description: string
  category?: string
  size?: string
  uom?: string
  price?: number
}

interface CurrentProduct {
  id: string
  sku: string
  name: string
  description?: string
  category?: string
  base_price: number
}

interface SKUMatch {
  oldSKU: string
  currentProductId: string
  currentSKU: string
  confidenceScore: number
  mappingMethod: string
  reasoning: string
}

/**
 * AI-Powered SKU Mapping API
 * Maps old SKUs (from Bailey or other systems) to current product SKUs
 * Uses Gemini embeddings + fuzzy matching for intelligent product matching
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai')
    if (!allowed) return rateLimitResponse!

    const supabase = await createClient()

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AuthError('Unauthorized')
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw new ForbiddenError('Admin access required')
    }

    const body = await request.json()
    let { productsToMap, sourceSystem, oldSKUs, skus } = body as {
      productsToMap?: ProductToMap[]
      sourceSystem?: string
      oldSKUs?: unknown[]
      skus?: string[]
    }

    // Handle different input formats
    if (!productsToMap) {
      if (oldSKUs && Array.isArray(oldSKUs)) {
        // Convert oldSKUs format to productsToMap
        productsToMap = oldSKUs.map((item: unknown) => {
          const typedItem = item as { oldSKU?: string; description?: string; category?: string; size?: string; uom?: string; price?: number }
          return {
            oldSKU: typedItem.oldSKU || String(item),
            description: typedItem.description || String(item),
            category: typedItem.category,
            size: typedItem.size,
            uom: typedItem.uom,
            price: typedItem.price,
          }
        })
      } else if (skus && Array.isArray(skus)) {
        // Convert simple SKU strings to productsToMap
        productsToMap = skus.map((sku: string) => ({
          oldSKU: sku,
          description: sku,
        }))
      }
    }

    if (!productsToMap || !Array.isArray(productsToMap) || productsToMap.length === 0) {
      throw new ValidationError('productsToMap, oldSKUs, or skus array is required', {
        productsToMap: ['At least one of productsToMap, oldSKUs, or skus array is required'],
      })
    }

    // Fetch all current products
    const { data: currentProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, description, category, base_price')

    if (productsError) {
      throw DatabaseError.queryFailed('products', 'fetch')
    }

    const matches: SKUMatch[] = []
    const mappings: { old_sku: string; suggested_product_id: string; suggested_product_name: string; confidence_score: number; match_reasoning: string }[] = []

    // Process each product to map
    for (const productToMap of productsToMap) {
      const match = await findBestMatch(productToMap, currentProducts as CurrentProduct[])
      if (match) {
        matches.push(match)

        // Also add to mappings array with test-expected format
        const product = (currentProducts as CurrentProduct[]).find(p => p.id === match.currentProductId)
        mappings.push({
          old_sku: match.oldSKU,
          suggested_product_id: match.currentProductId,
          suggested_product_name: product?.name || 'Unknown',
          confidence_score: match.confidenceScore,
          match_reasoning: match.reasoning,
        })
      }
    }

    return NextResponse.json({
      success: true,
      matches,
      mappings, // Include both formats for compatibility
      totalProcessed: productsToMap.length,
      totalMatched: matches.length,
      matchRate: (matches.length / productsToMap.length * 100).toFixed(1) + '%'
    })

  } catch (error) {
    return handleError(error)
  }
}

/**
 * Find the best matching current product for an old product
 * Uses multiple matching strategies and combines scores
 */
async function findBestMatch(
  productToMap: ProductToMap,
  currentProducts: CurrentProduct[]
): Promise<SKUMatch | null> {
  // Strategy 1: Exact SKU match
  const exactMatch = currentProducts.find(p => p.sku === productToMap.oldSKU)
  if (exactMatch) {
    return {
      oldSKU: productToMap.oldSKU,
      currentProductId: exactMatch.id,
      currentSKU: exactMatch.sku,
      confidenceScore: 1.0,
      mappingMethod: 'exact',
      reasoning: 'Exact SKU match found'
    }
  }

  // Strategy 2: AI Embedding similarity
  const embeddingMatch = await findEmbeddingMatch(productToMap, currentProducts)

  // Strategy 3: Fuzzy text matching
  const fuzzyMatch = findFuzzyMatch(productToMap, currentProducts)

  // Strategy 4: Category + feature matching
  const featureMatch = findFeatureMatch(productToMap, currentProducts)

  // Combine scores with weighted average
  const candidates = [embeddingMatch, fuzzyMatch, featureMatch]
    .filter(m => m !== null)
    .map(m => m!)

  if (candidates.length === 0) {
    return null
  }

  // Find best candidate based on combined score
  const bestCandidate = candidates.reduce((best, current) => {
    return current.confidenceScore > best.confidenceScore ? current : best
  })

  // Only return matches with confidence >= 0.5
  if (bestCandidate.confidenceScore < 0.5) {
    return null
  }

  return bestCandidate
}

/**
 * Use Gemini embeddings to find semantically similar products
 */
async function findEmbeddingMatch(
  productToMap: ProductToMap,
  currentProducts: CurrentProduct[]
): Promise<SKUMatch | null> {
  try {
    // Create search text from old product
    const searchText = `${productToMap.description} ${productToMap.category || ''} ${productToMap.size || ''}`

    // Generate embedding for the old product using Gemini
    const searchEmbedding = await generateEmbedding(searchText)

    // Calculate cosine similarity with all current products
    let bestMatch: { product: CurrentProduct; similarity: number } | null = null

    for (const product of currentProducts) {
      // Check if product has embedding
      const productText = `${product.name} ${product.description || ''} ${product.category || ''}`

      const productEmbedding = await generateEmbedding(productText)
      const similarity = geminiCosineSimilarity(searchEmbedding, productEmbedding)

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { product, similarity }
      }
    }

    if (bestMatch && bestMatch.similarity > 0.7) {
      return {
        oldSKU: productToMap.oldSKU,
        currentProductId: bestMatch.product.id,
        currentSKU: bestMatch.product.sku,
        confidenceScore: bestMatch.similarity,
        mappingMethod: 'ai_embedding',
        reasoning: `AI embedding similarity: ${(bestMatch.similarity * 100).toFixed(1)}%`
      }
    }

    return null
  } catch (error) {
    console.error('Embedding match error:', error)
    return null
  }
}

/**
 * Use fuzzy string matching to find similar product descriptions
 */
function findFuzzyMatch(
  productToMap: ProductToMap,
  currentProducts: CurrentProduct[]
): SKUMatch | null {
  let bestMatch: { product: CurrentProduct; score: number } | null = null

  for (const product of currentProducts) {
    const score = fuzzyStringMatch(
      productToMap.description.toLowerCase(),
      product.name.toLowerCase()
    )

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { product, score }
    }
  }

  if (bestMatch && bestMatch.score > 0.6) {
    return {
      oldSKU: productToMap.oldSKU,
      currentProductId: bestMatch.product.id,
      currentSKU: bestMatch.product.sku,
      confidenceScore: bestMatch.score,
      mappingMethod: 'fuzzy_match',
      reasoning: `Fuzzy text match: ${(bestMatch.score * 100).toFixed(1)}%`
    }
  }

  return null
}

/**
 * Match based on category and extracted features (size, color, type)
 */
function findFeatureMatch(
  productToMap: ProductToMap,
  currentProducts: CurrentProduct[]
): SKUMatch | null {
  // Extract features from description
  const features = extractFeatures(productToMap.description)

  let bestMatch: { product: CurrentProduct; score: number } | null = null

  for (const product of currentProducts) {
    let score = 0
    const productFeatures = extractFeatures(product.name)

    // Category match
    if (productToMap.category && product.category === productToMap.category) {
      score += 0.3
    }

    // Feature matches
    const matchingFeatures = features.filter(f => productFeatures.includes(f))
    score += (matchingFeatures.length / Math.max(features.length, 1)) * 0.7

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { product, score }
    }
  }

  if (bestMatch && bestMatch.score > 0.5) {
    return {
      oldSKU: productToMap.oldSKU,
      currentProductId: bestMatch.product.id,
      currentSKU: bestMatch.product.sku,
      confidenceScore: bestMatch.score,
      mappingMethod: 'feature_match',
      reasoning: `Feature-based match: ${(bestMatch.score * 100).toFixed(1)}%`
    }
  }

  return null
}

/**
 * Simple fuzzy string matching using Levenshtein distance
 */
function fuzzyStringMatch(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - (distance / maxLength)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Extract key features from product description
 */
function extractFeatures(description: string): string[] {
  const features: string[] = []
  const lowerDesc = description.toLowerCase()

  // Extract size (e.g., 16oz, 12", 8x8)
  const sizeMatch = lowerDesc.match(/\d+\s*(oz|inch|"|ml|l|lb|kg|x\d+)/g)
  if (sizeMatch) {
    features.push(...sizeMatch)
  }

  // Extract colors
  const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'clear', 'brown']
  colors.forEach(color => {
    if (lowerDesc.includes(color)) {
      features.push(color)
    }
  })

  // Extract materials
  const materials = ['plastic', 'paper', 'foam', 'aluminum', 'cardboard', 'poly']
  materials.forEach(material => {
    if (lowerDesc.includes(material)) {
      features.push(material)
    }
  })

  // Extract product types
  const types = ['cup', 'lid', 'plate', 'bowl', 'container', 'tray', 'box', 'bag']
  types.forEach(type => {
    if (lowerDesc.includes(type)) {
      features.push(type)
    }
  })

  return features
}
