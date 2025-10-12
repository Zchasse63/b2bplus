import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CartView from '@/components/CartView'

export default async function CartPage() {
  const supabase = createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch cart items with product details
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cart:', error)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">Failed to load cart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <CartView initialCartItems={cartItems || []} />
      </div>
    </div>
  )
}

