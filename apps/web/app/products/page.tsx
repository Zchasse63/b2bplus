import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductCard from '@/components/ProductCard'

export default async function ProductsPage() {
  const supabase = createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's profile to find their organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Organization</h1>
          <p className="mt-2 text-gray-600">
            You need to be part of an organization to view products.
          </p>
        </div>
      </div>
    )
  }

  // Fetch products for the user's organization
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', profile.current_organization_id)
    .eq('in_stock', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">Failed to load products</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="mt-2 text-gray-600">
            Browse our selection of food service disposables
          </p>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No products available</p>
          </div>
        )}
      </div>
    </div>
  )
}

