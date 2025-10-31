# 2D Container Calculator Feature Design

**Date**: October 31, 2025
**Feature**: 2D Container Calculator
**Priority**: 1 - Critical
**Effort**: Medium

---

## Overview

Implement a 2D container loading calculator that helps users determine how many products can fit in standard shipping containers. This tool provides visual feedback and optimization suggestions for efficient container loading.

---

## User Stories

1. **As a customer**, I want to calculate how many units of a product fit in a container so that I can optimize my shipping costs.

2. **As a customer**, I want to see visual representation of container loading so that I can understand space utilization.

3. **As a customer**, I want to try different container sizes so that I can choose the most cost-effective option.

4. **As a customer**, I want to calculate mixed product loads so that I can consolidate shipments.

5. **As a customer**, I want to save container calculations for future reference.

---

## Container Types

### Standard Container Sizes (20ft and 40ft)

**20ft Standard Container**
- Internal Length: 5.898m (19.35ft)
- Internal Width: 2.352m (7.72ft)
- Internal Height: 2.393m (7.85ft)
- Capacity: 33.2 cubic meters (1,172 cubic feet)
- Max Load: 28,200 kg (62,170 lbs)

**40ft Standard Container**
- Internal Length: 12.032m (39.47ft)
- Internal Width: 2.352m (7.72ft)
- Internal Height: 2.393m (7.85ft)
- Capacity: 67.7 cubic meters (2,390 cubic feet)
- Max Load: 26,700 kg (58,860 lbs)

**40ft High Cube Container**
- Internal Length: 12.032m (39.47ft)
- Internal Width: 2.352m (7.72ft)
- Internal Height: 2.698m (8.85ft)
- Capacity: 76.3 cubic meters (2,694 cubic feet)
- Max Load: 26,500 kg (58,420 lbs)

---

## Calculation Logic

### 2D Floor Plan Calculation

Since this is a 2D calculator, we focus on floor space utilization:

1. **Calculate floor area**:
   - Container floor: Length × Width
   - Product footprint: Length × Width (from dimensions)

2. **Calculate units per row**:
   - Units per length = floor(Container Length / Product Length)
   - Units per width = floor(Container Width / Product Width)

3. **Try both orientations**:
   - Orientation 1: Product L × W
   - Orientation 2: Product W × L
   - Choose orientation with more units

4. **Calculate total units**:
   - Total units = Units per length × Units per width

5. **Check weight limit**:
   - Total weight = Units × Product weight
   - Verify: Total weight ≤ Container max load

6. **Calculate utilization**:
   - Floor utilization = (Units × Product footprint) / Container floor area × 100%

---

## Features

### 1. Container Calculator Page
- Select container type (20ft, 40ft, 40ft HC)
- Select product(s) from catalog
- Enter quantity to ship
- Calculate optimal container usage
- Visual 2D representation

### 2. Visual Representation
- Top-down view of container floor
- Product boxes arranged in optimal pattern
- Color-coded utilization (green = good, yellow = ok, red = poor)
- Dimensions overlay

### 3. Results Display
- Units that fit
- Floor space utilization %
- Weight utilization %
- Unused space
- Cost per unit (if shipping cost provided)
- Recommendations

### 4. Mixed Load Calculator
- Add multiple products
- Calculate combined load
- Optimize arrangement
- Show breakdown by product

---

## UI Design

### Calculator Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Container Calculator                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Container Type:  [20ft ▼] [40ft] [40ft HC]            │
│                                                          │
│  Select Product:  [Product Dropdown ▼]                  │
│  Quantity to Ship: [____]                               │
│  [Calculate]                                             │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Results                                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Container: 40ft Standard                        │  │
│  │  Product: Organic Almonds (10 lb bag)           │  │
│  │  Dimensions: 12" × 8" × 6"                       │  │
│  │  Weight: 10 lbs                                  │  │
│  │                                                   │  │
│  │  Units that fit: 1,200                          │  │
│  │  Floor utilization: 85%                         │  │
│  │  Weight utilization: 45%                        │  │
│  │  Unused floor space: 15%                        │  │
│  │                                                   │  │
│  │  Recommendation: ✅ Excellent fit               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Visual Representation                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐    │  │
│  │  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │  │
│  │  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │  │
│  │  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │  │
│  │  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘    │  │
│  │  40ft × 8ft container with 1,200 units         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Add to Cart] [Save Calculation] [Print]              │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation

### Database

**No new tables needed** for basic functionality. Product dimensions already exist in `products` table.

Future enhancement: Save calculations
```sql
CREATE TABLE container_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  container_type VARCHAR(20) NOT NULL,
  products JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Frontend Components

1. **ContainerCalculator.tsx** - Main calculator component
2. **ContainerVisualizer.tsx** - 2D visual representation
3. **ContainerResults.tsx** - Results display
4. **ProductSelector.tsx** - Product selection dropdown

### Calculation Service

```typescript
// /packages/shared/src/services/container.service.ts

export interface ContainerType {
  name: string
  lengthInches: number
  widthInches: number
  heightInches: number
  maxWeightLbs: number
}

export interface ProductDimensions {
  lengthInches: number
  widthInches: number
  heightInches: number
  weightLbs: number
}

export interface CalculationResult {
  containerType: string
  unitsPerRow: number
  unitsPerColumn: number
  totalUnits: number
  floorUtilization: number
  weightUtilization: number
  orientation: 'lengthwise' | 'widthwise'
  recommendation: string
}

export const calculateContainerLoad = (
  container: ContainerType,
  product: ProductDimensions
): CalculationResult => {
  // Try both orientations
  const orientation1 = calculateOrientation(
    container,
    product.lengthInches,
    product.widthInches
  )
  
  const orientation2 = calculateOrientation(
    container,
    product.widthInches,
    product.lengthInches
  )
  
  // Choose best orientation
  const best = orientation1.totalUnits > orientation2.totalUnits 
    ? orientation1 
    : orientation2
  
  // Calculate utilization
  const floorArea = container.lengthInches * container.widthInches
  const productFootprint = product.lengthInches * product.widthInches
  const usedArea = best.totalUnits * productFootprint
  const floorUtilization = (usedArea / floorArea) * 100
  
  const totalWeight = best.totalUnits * product.weightLbs
  const weightUtilization = (totalWeight / container.maxWeightLbs) * 100
  
  // Generate recommendation
  let recommendation = ''
  if (floorUtilization > 80 && weightUtilization < 90) {
    recommendation = '✅ Excellent fit - High space utilization'
  } else if (floorUtilization > 60) {
    recommendation = '👍 Good fit - Acceptable utilization'
  } else {
    recommendation = '⚠️ Poor fit - Consider different container or product mix'
  }
  
  return {
    containerType: container.name,
    unitsPerRow: best.unitsPerRow,
    unitsPerColumn: best.unitsPerColumn,
    totalUnits: best.totalUnits,
    floorUtilization,
    weightUtilization,
    orientation: best.orientation,
    recommendation,
  }
}
```

---

## Files to Create/Modify

1. `/apps/web/app/tools/container-calculator/page.tsx` - Calculator page
2. `/apps/web/components/ContainerCalculator.tsx` - Main component
3. `/apps/web/components/ContainerVisualizer.tsx` - Visual display
4. `/packages/shared/src/services/container.service.ts` - Calculation logic
5. `/apps/web/components/Header.tsx` - Add Tools menu

---

## Testing Checklist

- [ ] Calculate 20ft container loading
- [ ] Calculate 40ft container loading
- [ ] Calculate 40ft HC container loading
- [ ] Handle products with different orientations
- [ ] Weight limit validation
- [ ] Visual representation renders correctly
- [ ] Utilization percentages are accurate
- [ ] Recommendations are appropriate
- [ ] Mobile responsive design

---

## Future Enhancements

1. **3D Visualization**: Stack products vertically
2. **Mixed Loads**: Multiple products in one container
3. **Save Calculations**: Store for future reference
4. **Export to PDF**: Printable loading plan
5. **Optimization Suggestions**: AI-powered packing recommendations
6. **Custom Containers**: User-defined container sizes
7. **Pallet Calculations**: Include pallet dimensions
8. **Cost Analysis**: Shipping cost per unit

---

## Success Metrics

- Users calculate container loads before placing large orders
- Reduced shipping costs through better utilization
- Fewer support requests about shipping logistics
- 80%+ container utilization on average

---

## Conclusion

The 2D Container Calculator provides immediate value for B2B customers planning large shipments. It's simple to implement, doesn't require complex 3D graphics, and delivers actionable insights for logistics optimization.
