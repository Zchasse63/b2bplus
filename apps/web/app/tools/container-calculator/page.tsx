'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Card from '@/components/horizon/card';
import Button from '@/components/horizon/button/Button';
import Select from '@/components/horizon/input/Select';
import {
  MdCalculate,
  MdInventory,
  MdCheckCircle,
  MdWarning,
  MdLocalShipping,
} from 'react-icons/md';
import {
  calculateContainerLoad,
  CONTAINER_TYPES,
  type CalculationResult,
} from '@/../../packages/shared/src/services/container.service';

interface Product {
  id: string;
  name: string;
  sku: string;
  weight_lbs: number;
  dimensions_inches: {
    length: number;
    width: number;
    height: number;
  };
}

export default function ContainerCalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [containerType, setContainerType] = useState<string>('40ft');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, weight_lbs, dimensions_inches')
        .not('dimensions_inches', 'is', null)
        .not('weight_lbs', 'is', null)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    if (!selectedProduct) return;

    setCalculating(true);
    try {
      const dims = selectedProduct.dimensions_inches;
      const result = calculateContainerLoad(containerType, {
        lengthInches: dims.length,
        widthInches: dims.width,
        heightInches: dims.height,
        weightLbs: selectedProduct.weight_lbs,
      });
      setResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const product = products.find((p) => p.id === e.target.value);
    setSelectedProduct(product || null);
    setResult(null);
  };

  const productOptions = [
    { value: '', label: 'Select a product...' },
    ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card extra="mb-5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600">
            <MdCalculate className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Container Loading Calculator
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Calculate how many units fit in standard shipping containers
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Container Type Selection */}
          <Card extra="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
              Container Type
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(CONTAINER_TYPES).map(([key, container]) => (
                <button
                  key={key}
                  onClick={() => {
                    setContainerType(key);
                    setResult(null);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    containerType === key
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 hover:border-brand-300 dark:border-gray-700'
                  }`}
                >
                  <MdInventory
                    className={`h-6 w-6 ${
                      containerType === key ? 'text-brand-500' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      containerType === key
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {container.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <p className="mb-2 font-semibold text-navy-700 dark:text-white">
                {CONTAINER_TYPES[containerType].name}
              </p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Dimensions:{' '}
                  {(CONTAINER_TYPES[containerType].lengthInches / 12).toFixed(1)}ft ×{' '}
                  {(CONTAINER_TYPES[containerType].widthInches / 12).toFixed(1)}ft ×{' '}
                  {(CONTAINER_TYPES[containerType].heightInches / 12).toFixed(1)}ft
                </p>
                <p>
                  Max Weight: {CONTAINER_TYPES[containerType].maxWeightLbs.toLocaleString()} lbs
                </p>
              </div>
            </div>
          </Card>

          {/* Product Selection */}
          <Card extra="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
              Select Product
            </h2>
            <div className="space-y-4">
              <Select
                label="Product"
                options={productOptions}
                value={selectedProduct?.id || ''}
                onChange={handleProductSelect}
              />

              {selectedProduct && (
                <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                  <p className="mb-3 font-semibold text-navy-700 dark:text-white">
                    {selectedProduct.name}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Dimensions</p>
                      <p className="font-semibold text-navy-700 dark:text-white">
                        {selectedProduct.dimensions_inches.length}" ×{' '}
                        {selectedProduct.dimensions_inches.width}" ×{' '}
                        {selectedProduct.dimensions_inches.height}"
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Weight</p>
                      <p className="font-semibold text-navy-700 dark:text-white">
                        {selectedProduct.weight_lbs} lbs
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                icon={<MdCalculate />}
                onClick={handleCalculate}
                disabled={!selectedProduct}
                loading={calculating}
                className="w-full"
              >
                Calculate Load
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        <div>
          {result ? (
            <Card extra="p-6">
              <h2 className="mb-5 text-xl font-bold text-navy-700 dark:text-white">
                Calculation Results
              </h2>

              {/* Main Result */}
              <div className="mb-6 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 p-6 text-center text-white">
                <MdLocalShipping className="mx-auto mb-3 h-12 w-12" />
                <p className="mb-2 text-sm opacity-90">Maximum Units per Container</p>
                <p className="text-5xl font-bold">{result.maxUnits.toLocaleString()}</p>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                  <h3 className="mb-3 font-semibold text-navy-700 dark:text-white">
                    Load Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
                      <span className="font-semibold text-navy-700 dark:text-white">
                        {result.totalWeight.toLocaleString()} lbs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Weight Capacity:</span>
                      <span className="font-semibold text-navy-700 dark:text-white">
                        {result.weightCapacityUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Volume Capacity:</span>
                      <span className="font-semibold text-navy-700 dark:text-white">
                        {result.volumeCapacityUsed.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <MdWarning className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">
                        Warnings
                      </h3>
                    </div>
                    <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-400">
                      {result.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success Message */}
                {(!result.warnings || result.warnings.length === 0) && (
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                      <MdCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                        Optimal loading configuration
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card extra="flex h-full items-center justify-center p-12">
              <div className="text-center">
                <MdCalculate className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  Select a product and container type to calculate
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
