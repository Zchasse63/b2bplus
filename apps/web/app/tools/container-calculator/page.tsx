'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, Calculator, AlertCircle } from 'lucide-react'
import { calculateContainerLoad, CONTAINER_TYPES, type CalculationResult } from '@/../../packages/shared/src/services/container.service'

interface Product {
  id: string
  name: string
  sku: string
  weight_lbs: number
  dimensions_inches: {
    length: number
    width: number
    height: number
  }
}

export default function ContainerCalculatorPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [containerType, setContainerType] = useState<string>('40ft')
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, weight_lbs, dimensions_inches')
        .not('dimensions_inches', 'is', null)
        .not('weight_lbs', 'is', null)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = () => {
    if (!selectedProduct) return

    setCalculating(true)
    try {
      const dims = selectedProduct.dimensions_inches
      const result = calculateContainerLoad(containerType, {
        lengthInches: dims.length,
        widthInches: dims.width,
        heightInches: dims.height,
        weightLbs: selectedProduct.weight_lbs,
      })
      setResult(result)
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setCalculating(false)
    }
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setResult(null) // Clear previous results
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-500 mb-2 flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Container Loading Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate how many units fit in standard shipping containers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Container Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CONTAINER_TYPES).map(([key, container]) => (
                    <Button
                      key={key}
                      variant={containerType === key ? 'default' : 'outline'}
                      onClick={() => {
                        setContainerType(key)
                        setResult(null)
                      }}
                      className="h-auto py-3 flex flex-col items-center"
                    >
                      <Package className="h-5 w-5 mb-1" />
                      <span className="text-xs">{container.name}</span>
                    </Button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-neutral-100 rounded-md text-sm">
                  <p className="font-semibold mb-1">{CONTAINER_TYPES[containerType].name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(CONTAINER_TYPES[containerType].lengthInches / 12).toFixed(1)}ft × {' '}
                    {(CONTAINER_TYPES[containerType].widthInches / 12).toFixed(1)}ft × {' '}
                    {(CONTAINER_TYPES[containerType].heightInches / 12).toFixed(1)}ft
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max Weight: {CONTAINER_TYPES[containerType].maxWeightLbs.toLocaleString()} lbs
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <select
                    id="product"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={selectedProduct?.id || ''}
                    onChange={(e) => handleProductSelect(e.target.value)}
                  >
                    <option value="">Select a product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-neutral-100 rounded-md space-y-2">
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Dimensions</p>
                        <p className="font-medium">
                          {selectedProduct.dimensions_inches.length}" × {' '}
                          {selectedProduct.dimensions_inches.width}" × {' '}
                          {selectedProduct.dimensions_inches.height}"
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-medium">{selectedProduct.weight_lbs} lbs</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCalculate}
                  disabled={!selectedProduct || calculating}
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {result ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Results</span>
                      <Badge variant={result.warnings.length > 0 ? 'destructive' : 'default'}>
                        {result.containerType}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <p key={idx} className="text-sm text-red-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className={`p-3 rounded-md ${
                      result.recommendation.startsWith('✅') ? 'bg-green-50 border border-green-200' :
                      result.recommendation.startsWith('👍') ? 'bg-blue-50 border border-blue-200' :
                      result.recommendation.startsWith('💡') ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-neutral-100 border border-neutral-200'
                    }`}>
                      <p className="font-semibold text-sm">{result.recommendation}</p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-neutral-100 rounded-md">
                        <p className="text-sm text-muted-foreground">Units that Fit</p>
                        <p className="text-2xl font-bold text-primary">{result.totalUnits.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.unitsPerRow} × {result.unitsPerColumn}
                        </p>
                      </div>
                      <div className="p-3 bg-neutral-100 rounded-md">
                        <p className="text-sm text-muted-foreground">Total Weight</p>
                        <p className="text-2xl font-bold">{result.totalWeight.toLocaleString()} lbs</p>
                        <p className="text-xs text-muted-foreground">
                          {result.weightUtilization.toFixed(1)}% of max
                        </p>
                      </div>
                    </div>

                    {/* Utilization Bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Floor Space Utilization</span>
                          <span className="font-semibold">{result.floorUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              result.floorUtilization >= 80 ? 'bg-green-500' :
                              result.floorUtilization >= 60 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(result.floorUtilization, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Weight Utilization</span>
                          <span className="font-semibold">{result.weightUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              result.weightUtilization > 90 ? 'bg-red-500' :
                              result.weightUtilization >= 70 ? 'bg-green-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(result.weightUtilization, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="pt-3 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Orientation</span>
                        <span className="font-medium capitalize">{result.orientation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unused Floor Space</span>
                        <span className="font-medium">{result.unusedFloorSpace.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Representation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Visual Representation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-[2/1] bg-neutral-100 rounded-md p-4 flex items-center justify-center">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {result.unitsPerRow} units × {result.unitsPerColumn} units
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.orientation === 'lengthwise' ? 'Length-wise arrangement' : 'Width-wise arrangement'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Ready to Calculate</p>
                  <p className="text-muted-foreground">
                    Select a container type and product, then click Calculate
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
