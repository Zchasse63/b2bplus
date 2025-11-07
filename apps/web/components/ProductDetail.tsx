'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, ProductCard, Modal, Textarea } from '@/components/b2b';
import {
  FiShoppingCart,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronRight,
  FiZoomIn,
  FiPackage,
} from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  base_price: number;
  unit_of_measure: string;
  units_per_case: number | null;
  weight_lbs: number | null;
  dimensions_inches: {
    length: number;
    width: number;
    height: number;
  } | null;
  in_stock: boolean;
  image_url: string | null;
  additional_images: string[] | null;
  specifications: Record<string, any> | null;
  allergens: string[] | null;
  nutritional_info: Record<string, any> | null;
};

type Props = {
  product: Product;
  organizationId: string | null;
  relatedProducts: Array<{
    id: string;
    name: string;
    sku: string;
    base_price: number;
    image_url: string | null;
    category: string;
    in_stock: boolean;
  }>;
};

export default function ProductDetail({ product, organizationId, relatedProducts }: Props) {
  const [selectedImage, setSelectedImage] = useState(product.image_url);
  const [quantity, setQuantity] = useState(1);
  const [orderByCase, setOrderByCase] = useState(false);
  const [price, setPrice] = useState(product.base_price);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [sampleRequestModal, setSampleRequestModal] = useState(false);
  const [sampleNotes, setSampleNotes] = useState('');
  const [requestingSample, setRequestingSample] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const unitsPerCase = product.units_per_case || 1;
  const effectiveQuantity = orderByCase ? quantity * unitsPerCase : quantity;

  const allImages = [product.image_url, ...(product.additional_images || [])]
    .filter((img): img is string => typeof img === 'string' && img.length > 0);

  // Fetch AI-powered recommendations
  const fetchRecommendations = useCallback(async () => {
      try {
        const response = await fetch(`/api/recommendations?productId=${product.id}&type=also_bought&limit=4`);
        if (response.ok) {
          const data = await response.json();
          if (data.recommendations && data.recommendations.length > 0) {
            // Fetch full product details for recommendations
            interface Recommendation {
              recommended_product_id: string;
            }
            const productIds = data.recommendations.map((r: Recommendation) => r.recommended_product_id);
            const { data: products } = await supabase
              .from('products')
              .select('id, name, sku, base_price, image_url, category')
              .in('id', productIds);

            setRecommendations(products || []);
          }
        }
      } catch (error) {
        logger.error('Error fetching recommendations', {
          productId: product.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoadingRecommendations(false);
      }
  }, [product.id, supabase]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const fetchPrice = useCallback(async () => {
    if (!organizationId) {
      setPrice(product.base_price);
      setLoading(false);
      return;
    }

      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setPrice(product.base_price);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            userId: user.id,
            items: [
              {
                productId: product.id,
                quantity,
                basePrice: product.base_price,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items[0]) {
            setPrice(data.items[0].finalPrice);
          }
        }
      } catch (error) {
        logger.error('Error fetching price', {
          productId: product.id,
          quantity,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
  }, [quantity, organizationId, product.id, product.base_price, supabase]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  const handleAddToCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    setAdding(true);

    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.current_organization_id;

      if (!organizationId) {
        throw new Error('No organization found for user');
      }

      // ATOMIC: Use database function to handle race conditions
      const { data, error } = await supabase.rpc('upsert_cart_item_atomic', {
        p_user_id: user.id,
        p_product_id: product.id,
        p_quantity: effectiveQuantity,
        p_organization_id: organizationId
      });

      if (error) throw error;

      if (!data?.[0]?.success) {
        throw new Error('Failed to add to cart');
      }

      setSuccessModal(true);
    } catch (error) {
      logger.error('Error adding to cart', {
        productId: product.id,
        quantity: effectiveQuantity,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  // Helper function for adding recommended products to cart
  const handleAddRecommendedToCart = async (productId: string, productName: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      const orgId = profile?.current_organization_id;

      if (!orgId) {
        throw new Error('No organization found for user');
      }

      const { error } = await supabase.rpc('upsert_cart_item_atomic', {
        p_user_id: user.id,
        p_product_id: productId,
        p_quantity: 1,
        p_organization_id: orgId
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${productName} added to cart`,
      });
    } catch (error) {
      logger.error('Error adding recommended product to cart', {
        productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    }
  };

  const handleRequestSample = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    setRequestingSample(true);

    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) {
        throw new Error('No organization found');
      }

      // Insert sample request
      const { error } = await supabase.from('sample_requests').insert({
        organization_id: profile.current_organization_id,
        product_id: product.id,
        requested_by: user.id,
        notes: sampleNotes,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Sample Request Submitted',
        description: 'Your sample request has been submitted successfully. We will contact you shortly.',
      });

      setSampleRequestModal(false);
      setSampleNotes('');
    } catch (error) {
      console.error('Error requesting sample:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit sample request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRequestingSample(false);
    }
  };

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
        <button
          onClick={() => router.push('/products')}
          className="hover:text-brand-500 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-1"
          aria-label="Navigate to products page"
        >
          Products
        </button>
        <FiChevronRight aria-hidden="true" />
        <span className="text-gray-600 dark:text-gray-400">
          {product.category}
        </span>
        <FiChevronRight aria-hidden="true" />
        <span className="text-navy-700 dark:text-white" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Product Images */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            {/* Main Image */}
            <button
              className="relative mb-4 aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              onClick={() => setImageModal(true)}
              aria-label="Zoom in on product image"
              type="button"
            >
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <FiShoppingCart className="h-24 w-24 text-gray-300" />
                </div>
              )}
              <div className="absolute right-2 top-2 rounded-full bg-white/80 p-2 dark:bg-navy-800/80">
                <FiZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
              </div>
            </button>

            {/* Thumbnail Images */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Product image thumbnails">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                      selectedImage === img
                        ? 'border-brand-500'
                        : 'border-gray-200 hover:border-brand-300 dark:border-white/10'
                    }`}
                    onClick={() => setSelectedImage(img)}
                    aria-label={`View image ${idx + 1} of ${allImages.length}`}
                    aria-pressed={selectedImage === img}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      fill
                      loading="lazy"
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 10vw"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Product Info */}
        <div className="space-y-5 lg:col-span-2">
          {/* Main Info Card */}
          <Card className="p-6">
            <div className="mb-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-navy-700 dark:text-white">
                    {product.name}
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    SKU: {product.sku}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                    product.in_stock
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {product.in_stock ? (
                    <>
                      <FiCheckCircle /> In Stock
                    </>
                  ) : (
                    <>
                      <FiAlertTriangle /> Out of Stock
                    </>
                  )}
                </div>
              </div>

              {product.brand && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Brand: <span className="font-semibold">{product.brand}</span>
                </p>
              )}
            </div>

            {product.description && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
              </div>
            )}

            {/* Price and Add to Cart */}
            <div className="border-t border-gray-200 pt-6 dark:border-white/10">
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-4xl font-bold text-brand-500 dark:text-brand-400">
                  ${price.toFixed(2)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  per {product.unit_of_measure}
                </span>
                {price !== product.base_price && (
                  <span className="text-sm text-gray-500 line-through">
                    ${product.base_price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Case/Unit Toggle */}
              {product.units_per_case && product.units_per_case > 1 && (
                <div className="mb-4 p-3 bg-b2b-blue-50 dark:bg-b2b-blue-900/10 rounded-lg border border-b2b-blue-200 dark:border-b2b-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-b2b-text">Order by:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOrderByCase(false)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          !orderByCase
                            ? 'bg-b2b-blue text-white'
                            : 'bg-white dark:bg-navy-800 text-b2b-gray-600 hover:bg-b2b-gray-100'
                        }`}
                      >
                        Units
                      </button>
                      <button
                        onClick={() => setOrderByCase(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          orderByCase
                            ? 'bg-b2b-blue text-white'
                            : 'bg-white dark:bg-navy-800 text-b2b-gray-600 hover:bg-b2b-gray-100'
                        }`}
                      >
                        Cases
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-b2b-gray-600">
                    {unitsPerCase} units per case
                    {orderByCase && ` • ${effectiveQuantity} total units`}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-32">
                  <Input
                    type="number"
                    label={orderByCase ? 'Cases' : 'Quantity'}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  icon={<FiShoppingCart />}
                  onClick={handleAddToCart}
                  loading={adding}
                  disabled={!product.in_stock}
                >
                  Add to Cart
                </Button>
              </div>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-bold text-navy-700 dark:text-white">
                  ${(price * effectiveQuantity).toFixed(2)}
                </span>
                {orderByCase && (
                  <span className="ml-2 text-xs">
                    ({effectiveQuantity} units)
                  </span>
                )}
              </p>
            </div>
          </Card>

          {/* Product Details */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
              Product Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {product.units_per_case && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Units per Case</p>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {product.units_per_case}
                  </p>
                </div>
              )}
              {product.weight_lbs && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Weight</p>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {product.weight_lbs} lbs
                  </p>
                </div>
              )}
              {product.dimensions_inches && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dimensions (L × W × H)</p>
                  <p className="font-semibold text-navy-700 dark:text-white">
                    {product.dimensions_inches.length}&quot; × {product.dimensions_inches.width}&quot; ×{' '}
                    {product.dimensions_inches.height}&quot;
                  </p>
                </div>
              )}
            </div>

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 font-semibold text-navy-700 dark:text-white">
                  Specifications
                </h3>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-gray-100 pb-2 dark:border-white/5">
                      <span className="text-gray-600 dark:text-gray-400">{key}</span>
                      <span className="font-semibold text-navy-700 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Request Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
              <Button
                variant="secondary"
                className="w-full"
                icon={<FiPackage />}
                onClick={() => setSampleRequestModal(true)}
              >
                Request Free Sample
              </Button>
              <p className="mt-2 text-xs text-center text-b2b-gray-500">
                Try before you buy - request a free sample to test quality
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* AI-Powered Recommendations - Customers Also Bought */}
      {!loadingRecommendations && recommendations.length > 0 && (
        <div className="mt-8">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
                Customers Also Bought
              </h2>
              <span className="rounded-lg bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-500">
                AI Recommended
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((rec) => (
                <ProductCard
                  key={rec.id}
                  id={rec.id}
                  name={rec.name}
                  price={rec.base_price}
                  image={rec.image_url || undefined}
                  category={rec.category || undefined}
                  inStock={rec.in_stock}
                  onAddToCart={() => handleAddRecommendedToCart(rec.id, rec.name)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-8">
          <Card className="p-6">
            <h2 className="mb-5 text-2xl font-bold text-b2b-dark">
              Related Products
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  id={relatedProduct.id}
                  name={relatedProduct.name}
                  price={relatedProduct.base_price}
                  image={relatedProduct.image_url || undefined}
                  category={relatedProduct.category || undefined}
                  inStock={relatedProduct.in_stock}
                  onAddToCart={() => handleAddRecommendedToCart(relatedProduct.id, relatedProduct.name)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Image Zoom Modal */}
      <Modal isOpen={imageModal} onClose={() => setImageModal(false)} title={product.name} size="xl">
        <div className="relative aspect-square w-full">
          {selectedImage && (
            <Image
              src={selectedImage}
              alt={product.name}
              fill
              loading="lazy"
              className="object-contain"
              sizes="(max-width: 1200px) 100vw, 80vw"
            />
          )}
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="Added to Cart!"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{product.name}</span> has been added to your cart.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSuccessModal(false)}
            >
              Continue Shopping
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => router.push('/cart')}>
              View Cart
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sample Request Modal */}
      <Modal
        isOpen={sampleRequestModal}
        onClose={() => {
          setSampleRequestModal(false);
          setSampleNotes('');
        }}
        title="Request Free Sample"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-b2b-green-50 dark:bg-b2b-green-900/10 rounded-lg border border-b2b-green-200 dark:border-b2b-green-800">
            <FiPackage className="h-5 w-5 text-b2b-green mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-b2b-green mb-1">
                Free Sample Request
              </p>
              <p className="text-xs text-b2b-gray-600 dark:text-b2b-gray-400">
                We'll send you a free sample of <span className="font-semibold">{product.name}</span> so you can test the quality before placing a full order.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-b2b-text mb-2">Product Details</p>
            <div className="p-3 bg-b2b-gray-50 dark:bg-navy-800 rounded-lg">
              <p className="text-sm font-semibold text-b2b-text">{product.name}</p>
              <p className="text-xs text-b2b-gray-500">SKU: {product.sku}</p>
            </div>
          </div>

          <div>
            <Textarea
              label="Additional Notes (Optional)"
              placeholder="Let us know any specific requirements or questions about this sample..."
              value={sampleNotes}
              onChange={(e) => setSampleNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSampleRequestModal(false);
                setSampleNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              icon={<FiPackage />}
              onClick={handleRequestSample}
              loading={requestingSample}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
