import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PackageX } from 'lucide-react'

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-16">
      <Card className="max-w-md mx-4">
        <CardContent className="pt-12 pb-8 text-center">
          <PackageX className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary-500 mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn't find the product you're looking for. It may have been removed or is no longer available.
          </p>
          <Button asChild size="lg">
            <Link href="/products">
              Browse All Products
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
