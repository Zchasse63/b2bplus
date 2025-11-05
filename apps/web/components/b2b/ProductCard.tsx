import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { FiStar } from 'react-icons/fi';

export interface ProductCardProps {
  id: string;
  name: string;
  image?: string;
  price: number;
  category?: string;
  rating?: number;
  inStock?: boolean;
  onAddToCart?: (id: string) => void;
  onClick?: () => void;
  className?: string;
  variant?: 'list' | 'grid';
}

/**
 * ProductCard component based on Figma "B2B This One" Product List Item
 * 
 * Variants:
 * - list: Horizontal layout (mobile-first)
 * - grid: Vertical layout (for grid views)
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  image,
  price,
  category,
  rating,
  inStock = true,
  onAddToCart,
  onClick,
  className,
  variant = 'list',
}) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(id);
  };
  
  if (variant === 'grid') {
    return (
      <Card
        padding="none"
        hover
        onClick={onClick}
        className={cn('overflow-hidden', className)}
      >
        {/* Product Image */}
        <div className="aspect-square bg-b2b-gray-50 relative">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-b2b-gray-300">
              No Image
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Badge variant="error">Out of Stock</Badge>
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="p-4">
          {category && (
            <p className="text-xs text-b2b-gray-500 mb-1">{category}</p>
          )}
          <h3 className="font-semibold text-b2b-text mb-2 line-clamp-2">{name}</h3>

          {/* Rating */}
          {rating !== undefined && (
            <div className="flex items-center gap-1 mb-2">
              <FiStar className="w-4 h-4 fill-b2b-orange text-b2b-orange" />
              <span className="text-sm text-b2b-text">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Price & Action */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-b2b-text">
              ${price.toFixed(2)}
            </span>
            {inStock && (
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                Add
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }
  
  // List variant (default)
  return (
    <Card
      padding="md"
      hover
      onClick={onClick}
      className={cn('flex items-center gap-4', className)}
    >
      {/* Product Image */}
      <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-b2b-gray-50 overflow-hidden relative">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-b2b-gray-300 text-xs">
            No Image
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        {category && (
          <p className="text-xs text-b2b-gray-500 mb-0.5">{category}</p>
        )}
        <h3 className="font-semibold text-b2b-text mb-1 truncate">{name}</h3>

        {/* Price & Stock */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-b2b-text">
            ${price.toFixed(2)}
          </span>
          {inStock ? (
            <Badge variant="success" size="sm">In Stock</Badge>
          ) : (
            <Badge variant="error" size="sm">Out of Stock</Badge>
          )}
        </div>

        {/* Rating */}
        {rating !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            <FiStar className="w-3 h-3 fill-b2b-orange text-b2b-orange" />
            <span className="text-xs text-b2b-gray-500">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      {/* Add Button */}
      {inStock && (
        <Button
          size="md"
          onClick={handleAddToCart}
          className="flex-shrink-0"
        >
          Add
        </Button>
      )}
    </Card>
  );
};

ProductCard.displayName = 'ProductCard';

