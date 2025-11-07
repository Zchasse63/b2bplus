/**
 * Generic Document Processing AI Module
 * 
 * Handles AI-powered extraction, classification, and semantic search for all document types.
 * Supports contracts, quotes, POs, packing slips, receipts, and more.
 * 
 * Phase 5: Operational AI - Week 20
 */

import { processDocumentJSON, generateEmbedding } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';

/**
 * Document classification result
 */
export interface DocumentClassification {
  document_type: string;
  confidence: number;
  reasoning: string;
}

/**
 * Generic extracted document data
 */
export interface ExtractedDocumentData {
  document_type: string;
  classification_confidence: number;
  extracted_text: string;
  structured_data: Record<string, any>;
  key_entities: {
    dates?: string[];
    amounts?: number[];
    parties?: string[];
    references?: string[];
  };
}

/**
 * Classify document type using AI
 */
export async function classifyDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<DocumentClassification> {
  const prompt = `
Analyze this document and classify its type.

Possible document types:
- contract: Legal agreements, service contracts, employment contracts
- quote: Price quotes, estimates, proposals
- invoice: Bills, invoices (vendor or customer)
- purchase_order: Purchase orders, PO documents
- packing_slip: Packing lists, shipping documents
- receipt: Payment receipts, transaction confirmations
- agreement: MOUs, NDAs, partnership agreements
- report: Business reports, analytics, summaries
- certificate: Certificates, licenses, credentials
- presentation: Slides, pitch decks
- specification: Technical specs, requirements docs
- other: Any other document type

Return JSON with:
{
  "document_type": "one of the types above",
  "confidence": number (0.00 to 1.00),
  "reasoning": "brief explanation of classification"
}
`;

  try {
    const result = await processDocumentJSON<DocumentClassification>(
      fileBuffer,
      mimeType,
      prompt,
      {
        temperature: 0.1,
        usePro: false, // Flash is sufficient for classification
      }
    );

    return result;
  } catch (error) {
    console.error('Document classification error:', error);
    return {
      document_type: 'other',
      confidence: 0.0,
      reasoning: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract structured data from document based on type
 */
export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: string
): Promise<ExtractedDocumentData> {
  // Type-specific extraction prompts
  const prompts: Record<string, string> = {
    contract: `
Extract key information from this contract:
- Contract title/name
- Parties involved (names, roles)
- Effective date, expiration date
- Key terms and obligations
- Payment terms
- Termination clauses
- Signatures and dates
`,
    quote: `
Extract key information from this quote:
- Quote number
- Vendor/supplier name
- Customer name
- Quote date, valid until date
- Line items (product/service, quantity, price)
- Subtotal, tax, total
- Payment terms
- Special conditions
`,
    purchase_order: `
Extract key information from this purchase order:
- PO number
- Vendor name
- Buyer name
- PO date, expected delivery date
- Line items (SKU, product, quantity, price)
- Subtotal, tax, shipping, total
- Shipping address
- Payment terms
`,
    packing_slip: `
Extract key information from this packing slip:
- Packing slip number
- Order number reference
- Ship date
- Carrier and tracking number
- Items shipped (SKU, product, quantity)
- Shipping address
- Special handling instructions
`,
    receipt: `
Extract key information from this receipt:
- Receipt number
- Merchant name and location
- Transaction date and time
- Items purchased (description, quantity, price)
- Subtotal, tax, total
- Payment method
- Transaction ID
`,
  };

  const prompt = prompts[documentType] || `
Extract all key information from this ${documentType} document:
- Document title/identifier
- Dates (creation, effective, expiration)
- Parties involved
- Amounts and financial data
- Key terms and conditions
- References to other documents
`;

  const fullPrompt = `
${prompt}

Return JSON with this structure:
{
  "document_type": "${documentType}",
  "classification_confidence": number (0.00 to 1.00),
  "extracted_text": "full text content of the document",
  "structured_data": {
    // Type-specific structured data as key-value pairs
  },
  "key_entities": {
    "dates": ["YYYY-MM-DD format dates found"],
    "amounts": [numeric amounts found],
    "parties": ["names of people/companies"],
    "references": ["document numbers, IDs, references"]
  }
}

Be thorough and extract all relevant information.
`;

  try {
    const result = await processDocumentJSON<ExtractedDocumentData>(
      fileBuffer,
      mimeType,
      fullPrompt,
      {
        temperature: 0.2,
        usePro: true, // Use Pro for complex extraction
      }
    );

    return result;
  } catch (error) {
    console.error('Document extraction error:', error);
    throw new Error(`Failed to extract document data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding for document semantic search
 */
export async function generateDocumentEmbedding(text: string): Promise<number[]> {
  try {
    // Truncate text if too long (Gemini embedding has limits)
    const maxLength = 10000; // characters
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    const embedding = await generateEmbedding(truncatedText);
    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process document: classify, extract, and generate embedding
 * 
 * Complete workflow for new document upload
 */
export async function processDocument(
  documentId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<void> {
  const supabase = await createClient();

  try {
    // Step 1: Update status to processing
    await supabase
      .from('documents')
      .update({ extraction_status: 'processing' })
      .eq('id', documentId);

    // Step 2: Classify document
    const classification = await classifyDocument(fileBuffer, mimeType);

    // Step 3: Extract structured data
    const extractedData = await extractDocumentData(
      fileBuffer,
      mimeType,
      classification.document_type
    );

    // Step 4: Generate embedding for semantic search
    const embedding = await generateDocumentEmbedding(extractedData.extracted_text);

    // Step 5: Update document with all extracted data
    await supabase
      .from('documents')
      .update({
        extraction_status: 'completed',
        extraction_confidence: extractedData.classification_confidence,
        extracted_at: new Date().toISOString(),
        extracted_text: extractedData.extracted_text,
        extracted_data: extractedData.structured_data,
        ai_classified_type: classification.document_type,
        classification_confidence: classification.confidence,
        content_embedding: embedding,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);

    // Update status to failed
    await supabase
      .from('documents')
      .update({
        extraction_status: 'failed',
        extraction_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId);

    throw error;
  }
}

/**
 * Search documents by semantic similarity
 */
export async function searchDocuments(
  query: string,
  options: {
    documentTypes?: string[];
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<any[]> {
  const supabase = await createClient();

  // Generate embedding for search query
  const queryEmbedding = await generateEmbedding(query);

  // Call database function for semantic search
  const { data, error } = await supabase.rpc('search_documents_by_embedding', {
    query_embedding: queryEmbedding,
    match_threshold: options.matchThreshold || 0.7,
    match_count: options.matchCount || 10,
  });

  if (error) {
    console.error('Document search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  // Filter by document types if specified
  if (options.documentTypes && options.documentTypes.length > 0) {
    return (data || []).filter((doc: any) =>
      options.documentTypes!.includes(doc.document_type)
    );
  }

  return data || [];
}

