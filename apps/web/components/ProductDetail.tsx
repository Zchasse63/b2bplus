'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, ProductCard, Modal } from '@/components/b2b';
import {
  FiShoppingCart,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronRight,
  FiZoomIn,
} from 'react-icons/fi';

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
  const [price, setPrice] = useState(product.base_price);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const allImages = [product.image_url, ...(product.additional_images || [])].filter(
    Boolean
  ) as string[];

  // Fetch AI-powered recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`/api/recommendations?productId=${product.id}&type=also_bought&limit=4`);
        if (response.ok) {
          const data = await response.json();
          if (data.recommendations && data.recommendations.length > 0) {
            // Fetch full product details for recommendations
            const productIds = data.recommendations.map((r: any) => r.recommended_product_id);
            const { data: products } = await supabase
              .from('products')
              .select('id, name, sku, base_price, image_url, category')
              .in('id', productIds);

            setRecommendations(products || []);
          }
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [product.id]);

  useEffect(() => {
    if (!organizationId) {
      setPrice(product.base_price);
      return;
    }

    const fetchPrice = async () => {
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
        console.error('Error fetching price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [quantity, organizationId, product.id, product.base_price]);

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
      const { error } = await supabase.from('cart_items').insert({
        user_id: user.id,
        product_id: product.id,
        quantity,
      });

      if (error) throw error;

      setSuccessModal(true);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="cursor-pointer hover:text-brand-500" onClick={() => router.push('/products')}>
          Products
        </span>
        <FiChevronRight />
        <span className="cursor-pointer hover:text-brand-500">
          {product.category}
        </span>
        <FiChevronRight />
        <span className="text-navy-700 dark:text-white">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Product Images */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            {/* Main Image */}
            <div
              className="relative mb-4 aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-700"
              onClick={() => setImageModal(true)}
            >
              {selectedImage ? (
                <Image src={selectedImage} alt={product.name} fill className="object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <FiShoppingCart className="h-24 w-24 text-gray-300" />
                </div>
              )}
              <div className="absolute right-2 top-2 rounded-full bg-white/80 p-2 dark:bg-navy-800/80">
                <FiZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
            </div>

            {/* Thumbnail Images */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === img
                        ? 'border-brand-500'
                        : 'border-gray-200 hover:border-brand-300 dark:border-white/10'
                    }`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                  </div>
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

              <div className="flex gap-4">
                <div className="w-32">
                  <Input
                    type="number"
                    label="Quantity"
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
                  ${(price * quantity).toFixed(2)}
                </span>
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
                  onAddToCart={() => {}}
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
                  onAddToCart={() => {}}
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
            <Image src={selectedImage} alt={product.name} fill className="object-contain" />
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
    </div>
  );
}
