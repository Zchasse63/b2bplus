'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/b2b'
import { Card } from '@/components/b2b'
import { CardContent } from '@/components/ui/card'
import { PackageX } from 'lucide-react'

export default function ProductNotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-16">
      <Card className="max-w-md mx-4">
        <CardContent className="pt-12 pb-8 text-center">
          <PackageX className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary-500 mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn&apos;t find the product you&apos;re looking for. It may have been removed or is no longer available.
          </p>
          <Button variant="primary" onClick={() => router.push('/products')}>
            Browse All Products
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
