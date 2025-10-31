'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Package, User, LogOut, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Get cart count
        const { count } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        
        setCartCount(count || 0)
      }
    }

    getUser()
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Package className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">B2B+</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Button
            asChild
            variant={isActive('/') ? 'default' : 'ghost'}
          >
            <Link href="/">Home</Link>
          </Button>
          <Button
            asChild
            variant={isActive('/products') ? 'default' : 'ghost'}
          >
            <Link href="/products">Products</Link>
          </Button>
          {user && (
            <>
              <Button
                asChild
                variant={isActive('/orders') ? 'default' : 'ghost'}
              >
                <Link href="/orders">Orders</Link>
              </Button>
              <Button
                asChild
                variant={isActive('/invoices') ? 'default' : 'ghost'}
              >
                <Link href="/invoices">Invoices</Link>
              </Button>
              <Button
                asChild
                variant={isActive('/cart') ? 'default' : 'ghost'}
                className="relative"
              >
                <Link href="/cart">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  {cartCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon">
                <Link href="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
