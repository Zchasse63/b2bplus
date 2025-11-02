# AI SKU Mapping Research Findings

**Source:** Nordoon.ai, Various AI Product Matching Sources  
**Date:** November 1, 2025

## AI SKU Mapping Techniques

### Pattern Recognition Approach
AI excels at recognizing patterns in SKU codes and product descriptions. The system can:
- Automatically match customer SKUs with internal SKUs
- Learn from each human-in-the-loop correction
- Improve accuracy over time
- Adapt to new SKUs as they're introduced

### Key Matching Methods

#### 1. Description-Based Matching
- Compare product descriptions using NLP
- Extract key features (size, color, material, type)
- Calculate similarity scores
- Match based on semantic meaning, not exact text

#### 2. Fuzzy Matching
- Levenshtein distance for string comparison
- Handle typos and variations
- Account for different naming conventions
- Tokenize names and compare key components

#### 3. Neural Language Models
- Use embeddings (like we already have for semantic search)
- Deep learning for product matching
- 98-99% accuracy rates reported
- Can handle complex product taxonomies

#### 4. Rules-Based + AI Hybrid
- Start with predefined rules for obvious matches
- Use AI for ambiguous cases
- Human-in-the-loop for final verification
- Continuous learning from corrections

## Application to B2B+ Platform

### Challenge
- Bailey SKUs (2023-2024 data) ≠ Current Brokerage SKUs (2025 data)
- Same products, different item numbers
- Need to unify historical data under current SKU system

### Proposed Solution: AI-Powered SKU Mapping Tool

#### Step 1: Data Preparation
- Export Bailey usage reports (2023-2024)
- Export current brokerage sales (2025)
- Extract product lists from both systems

#### Step 2: AI Matching Process
1. **Extract Features**
   - Product description
   - Category
   - Size/dimensions
   - Unit of measure
   - Price (as secondary signal)

2. **Generate Embeddings**
   - Use OpenAI embeddings (already in platform)
   - Create vector representations of products
   - Calculate cosine similarity

3. **Fuzzy Text Matching**
   - Compare descriptions using fuzzy matching
   - Extract key terms (e.g., "16oz", "white", "cup")
   - Score matches

4. **Combined Scoring**
   - Embedding similarity: 50% weight
   - Fuzzy text match: 30% weight
   - Category match: 10% weight
   - Size/UOM match: 10% weight

5. **Confidence Levels**
   - High (>90%): Auto-match
   - Medium (70-90%): Suggest for review
   - Low (<70%): Flag for manual mapping

#### Step 3: Human-in-the-Loop
- Review medium/low confidence matches
- Approve or correct AI suggestions
- System learns from corrections
- Re-run matching with improved model

#### Step 4: Historical Data Import
- Map all Bailey SKUs to current SKUs
- Import historical orders with mapped SKUs
- Preserve original SKU in metadata
- Create unified purchase history

### Benefits
- Automatic mapping of 80-90% of SKUs
- Manual review only for ambiguous cases
- Continuous improvement through learning
- Unified customer purchase history
- Enables "you used to buy this" analytics

### Technical Implementation
- Use existing OpenAI embeddings infrastructure
- Add fuzzy matching library (e.g., fuzzywuzzy, RapidFuzz)
- Create SKU mapping table in database
- Build admin UI for review/approval
- Generate mapping confidence reports
