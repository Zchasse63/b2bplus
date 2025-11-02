'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  MdShoppingCart,
  MdInventory,
  MdPerson,
  MdLogout,
  MdCalculate,
  MdSettings,
  MdHome,
  MdShoppingBag,
  MdReceipt,
} from 'react-icons/md';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get cart count
        const { count } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setCartCount(count || 0);

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin');
      }
    };

    getUser();
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-navy-900/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <MdInventory className="h-6 w-6 text-brand-500" />
          <span className="hidden bg-gradient-to-r from-brand-500 to-purple-600 bg-clip-text text-transparent sm:inline">
            B2B+
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant={isActive('/') ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdHome />}
            >
              Home
            </Button>
          </Link>
          <Link href="/products">
            <Button
              variant={isActive('/products') ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdShoppingBag />}
            >
              Products
            </Button>
          </Link>
          {user && (
            <>
              <Link href="/orders">
                <Button
                  variant={isActive('/orders') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdShoppingCart />}
                >
                  Orders
                </Button>
              </Link>
              <Link href="/invoices">
                <Button
                  variant={isActive('/invoices') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdReceipt />}
                >
                  Invoices
                </Button>
              </Link>
              <Link href="/tools/container-calculator">
                <Button
                  variant={isActive('/tools/container-calculator') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdCalculate />}
                >
                  Calculator
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin/products">
                  <Button
                    variant={pathname?.startsWith('/admin') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdSettings />}
                  >
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/cart">
                <div className="relative">
                  <Button
                    variant={isActive('/cart') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdShoppingCart />}
                  >
                    Cart
                  </Button>
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </div>
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <MdPerson className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <MdLogout className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
