'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Card from '../card';
import Button from '../button/Button';
import { MdShoppingCart, MdVisibility } from 'react-icons/md';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    sku: string;
    base_price: number;
    image_url?: string | null;
    category?: string;
    stock_quantity?: number | null;
  };
  onAddToCart?: (productId: string) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const router = useRouter();
  const inStock = (product.stock_quantity ?? 0) > 0;

  return (
    <Card extra="group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      <div
        onClick={() => router.push(`/products/${product.id}`)}
        className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-navy-700"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <MdVisibility className="h-16 w-16" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {product.category && (
          <span className="text-xs font-medium text-brand-500 dark:text-brand-400">
            {product.category}
          </span>
        )}
        <h3 className="mt-1 text-lg font-bold text-navy-700 line-clamp-2 dark:text-white">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          SKU: {product.sku}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold text-brand-500 dark:text-brand-400">
            ${product.base_price.toFixed(2)}
          </span>
          {inStock && (
            <Button
              size="sm"
              variant="primary"
              icon={<MdShoppingCart />}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.(product.id);
              }}
            >
              Add
            </Button>
          )}
        </div>

        {product.stock_quantity !== null && inStock && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {product.stock_quantity} in stock
          </div>
        )}
      </div>
    </Card>
  );
}
