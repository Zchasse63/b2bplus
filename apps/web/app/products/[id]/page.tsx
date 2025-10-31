import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductDetail from '@/components/ProductDetail'
import { Metadata } from 'next'

type Props = {
  params: { id: string }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  
  const { data: product } = await supabase
    .from('products')
    .select('name, description, image_url')
    .eq('id', params.id)
    .single()

  if (!product) {
    return {
      title: 'Product Not Found'
    }
  }

  return {
    title: `${product.name} | B2B+`,
    description: product.description || `Order ${product.name} from B2B+`,
    openGraph: {
      title: product.name,
      description: product.description || '',
      images: product.image_url ? [product.image_url] : [],
    }
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const supabase = createClient()
  
  // Fetch product with all details
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !product) {
    notFound()
  }

  // Get user's organization for pricing
  const { data: { user } } = await supabase.auth.getUser()
  let organizationId = null
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()
    
    organizationId = profile?.current_organization_id
  }

  // Fetch related products (same category)
  const { data: relatedProducts } = await supabase
    .from('products')
    .select('id, name, sku, base_price, image_url, category')
    .eq('category', product.category)
    .neq('id', product.id)
    .eq('in_stock', true)
    .limit(4)

  return (
    <ProductDetail 
      product={product} 
      organizationId={organizationId}
      relatedProducts={relatedProducts || []}
    />
  )
}
