import { motion } from 'framer-motion';
import { Card } from '@/components/b2b'

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden ">
      {/* Image skeleton */}
      <div className="h-48 w-full bg-b2b-gray-100 rounded-t-lg" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Category and price */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-20 bg-b2b-gray-100 rounded" />
          <div className="h-4 w-16 bg-b2b-gray-100 rounded" />
        </div>

        {/* Title */}
        <div className="h-6 w-full bg-b2b-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-b2b-gray-100 rounded" />

        {/* Price and stock */}
        <div className="flex items-baseline justify-between pt-2">
          <div className="h-8 w-24 bg-b2b-gray-100 rounded" />
        </div>

        {/* Additional info */}
        <div className="space-y-1">
          <div className="h-3 w-32 bg-b2b-gray-100 rounded" />
          <div className="h-3 w-28 bg-b2b-gray-100 rounded" />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <div className="h-10 w-20 bg-b2b-gray-100 rounded" />
          <div className="h-10 flex-1 bg-b2b-gray-100 rounded" />
        </div>
      </div>
    </Card>
  )
}
