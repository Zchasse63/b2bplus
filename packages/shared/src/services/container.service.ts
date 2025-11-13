/**
 * Container Loading Calculator Service
 * Calculates optimal product loading for standard shipping containers
 */

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
  totalWeight: number
  unusedFloorSpace: number
  orientation: 'lengthwise' | 'widthwise'
  recommendation: string
  warnings: string[]
}

// Standard container types
export const CONTAINER_TYPES: Record<string, ContainerType> = {
  '20ft': {
    name: '20ft Standard',
    lengthInches: 232.2, // 19.35ft
    widthInches: 92.6,   // 7.72ft
    heightInches: 94.2,  // 7.85ft
    maxWeightLbs: 62170,
  },
  '40ft': {
    name: '40ft Standard',
    lengthInches: 473.6, // 39.47ft
    widthInches: 92.6,   // 7.72ft
    heightInches: 94.2,  // 7.85ft
    maxWeightLbs: 58860,
  },
  '40ft-hc': {
    name: '40ft High Cube',
    lengthInches: 473.6, // 39.47ft
    widthInches: 92.6,   // 7.72ft
    heightInches: 106.2, // 8.85ft
    maxWeightLbs: 58420,
  },
}

interface OrientationResult {
  unitsPerRow: number
  unitsPerColumn: number
  totalUnits: number
  orientation: 'lengthwise' | 'widthwise'
}

function calculateOrientation(
  container: ContainerType,
  productLength: number,
  productWidth: number
): OrientationResult {
  const unitsPerRow = Math.floor(container.lengthInches / productLength)
  const unitsPerColumn = Math.floor(container.widthInches / productWidth)
  const totalUnits = unitsPerRow * unitsPerColumn

  return {
    unitsPerRow,
    unitsPerColumn,
    totalUnits,
    orientation: 'lengthwise',
  }
}

export function calculateContainerLoad(
  containerKey: string,
  product: ProductDimensions
): CalculationResult {
  const container = CONTAINER_TYPES[containerKey]
  
  if (!container) {
    throw new Error(`Invalid container type: ${containerKey}`)
  }

  // Validate product dimensions
  if (product.lengthInches <= 0 || product.widthInches <= 0 || product.heightInches <= 0) {
    throw new Error('Product dimensions must be positive numbers')
  }

  if (product.weightLbs <= 0) {
    throw new Error('Product weight must be a positive number')
  }

  // Try both orientations (lengthwise and widthwise)
  const orientation1 = calculateOrientation(
    container,
    product.lengthInches,
    product.widthInches
  )
  orientation1.orientation = 'lengthwise'

  const orientation2 = calculateOrientation(
    container,
    product.widthInches,
    product.lengthInches
  )
  orientation2.orientation = 'widthwise'

  // Choose the orientation that fits more units
  const bestOrientation = orientation1.totalUnits >= orientation2.totalUnits 
    ? orientation1 
    : orientation2

  // Calculate floor utilization
  const containerFloorArea = container.lengthInches * container.widthInches
  const productFootprint = product.lengthInches * product.widthInches
  const usedFloorArea = bestOrientation.totalUnits * productFootprint
  const floorUtilization = (usedFloorArea / containerFloorArea) * 100
  const unusedFloorSpace = 100 - floorUtilization

  // Calculate weight utilization
  const totalWeight = bestOrientation.totalUnits * product.weightLbs
  const weightUtilization = (totalWeight / container.maxWeightLbs) * 100

  // Generate warnings
  const warnings: string[] = []
  
  if (weightUtilization > 100) {
    warnings.push('⚠️ Weight limit exceeded! Reduce quantity or use larger container.')
  } else if (weightUtilization > 90) {
    warnings.push('⚠️ Near weight limit. Consider safety margin.')
  }

  if (product.heightInches > container.heightInches) {
    warnings.push('⚠️ Product height exceeds container height!')
  }

  if (product.lengthInches > container.lengthInches || product.widthInches > container.widthInches) {
    warnings.push('⚠️ Product dimensions exceed container floor dimensions!')
  }

  if (bestOrientation.totalUnits === 0) {
    warnings.push('❌ Product too large for this container type.')
  }

  // Generate recommendation
  const recommendation = generateRecommendation(
    bestOrientation.totalUnits,
    warnings.length,
    floorUtilization,
    weightUtilization
  )

  return {
    containerType: container.name,
    unitsPerRow: bestOrientation.unitsPerRow,
    unitsPerColumn: bestOrientation.unitsPerColumn,
    totalUnits: bestOrientation.totalUnits,
    floorUtilization: Math.round(floorUtilization * 10) / 10, // Round to 1 decimal
    weightUtilization: Math.round(weightUtilization * 10) / 10,
    totalWeight: Math.round(totalWeight),
    unusedFloorSpace: Math.round(unusedFloorSpace * 10) / 10,
    orientation: bestOrientation.orientation,
    recommendation,
    warnings,
  }
}

/**
 * Calculate the recommended container type for a given product and quantity
 */
export function recommendContainer(
  product: ProductDimensions,
  targetQuantity: number
): { containerKey: string; result: CalculationResult } | null {
  const containerKeys = ['20ft', '40ft', '40ft-hc']
  
  for (const key of containerKeys) {
    const result = calculateContainerLoad(key, product)
    
    if (result.totalUnits >= targetQuantity && result.warnings.length === 0) {
      return { containerKey: key, result }
    }
  }
  
  // If no container fits the target quantity without warnings, return the largest
  const largestKey = '40ft-hc'
  return {
    containerKey: largestKey,
    result: calculateContainerLoad(largestKey, product),
  }
}

/**
 * Generate recommendation based on container utilization metrics
 * Reduces cyclomatic complexity by extracting recommendation logic
 */
function generateRecommendation(
  totalUnits: number,
  warningCount: number,
  floorUtilization: number,
  weightUtilization: number
): string {
  // Early return for no-fit scenario
  if (totalUnits === 0) {
    return '❌ Product does not fit in this container'
  }

  // Early return for warnings
  if (warningCount > 0) {
    return '⚠️ Issues detected - Review warnings'
  }

  // Check weight utilization first (safety critical)
  if (weightUtilization >= 90) {
    return '⚠️ High weight utilization - Verify safety limits'
  }

  // Evaluate space utilization
  if (floorUtilization >= 80) {
    return '✅ Excellent fit - High space utilization with safe weight'
  }

  if (floorUtilization >= 60) {
    return '👍 Good fit - Acceptable utilization'
  }

  if (floorUtilization < 60) {
    return '💡 Consider mixing products or using smaller container'
  }

  return '✓ Valid configuration'
}
