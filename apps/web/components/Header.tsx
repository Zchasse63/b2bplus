'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/b2b/Button';
import { Tooltip } from '@/components/b2b/Tooltip';
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
import { useEffect, useState, useCallback } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const getUser = useCallback(async () => {
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
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(membership?.role === 'admin' || membership?.role === 'super_admin');
      }
  }, [pathname, supabase]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b2b-gray-200 bg-white/95 backdrop-blur shadow-b2b-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" aria-label="B2B+ Home">
          <MdInventory className="h-6 w-6 text-b2b-blue" aria-hidden="true" />
          <span className="hidden text-b2b-blue sm:inline">
            B2B+
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {/* Public Navigation */}
          <Tooltip content="Go to homepage">
            <Link href="/">
              <Button
                variant={isActive('/') ? 'primary' : 'ghost'}
                size="sm"
                icon={<MdHome />}
                iconPosition="left"
              >
                Home
              </Button>
            </Link>
          </Tooltip>
          <Tooltip content="Browse all products">
            <Link href="/products">
              <Button
                variant={isActive('/products') ? 'primary' : 'ghost'}
                size="sm"
                icon={<MdShoppingBag />}
                iconPosition="left"
              >
                Products
              </Button>
            </Link>
          </Tooltip>

          {user && (
            <>
              {/* Visual Separator */}
              <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

              {/* Authenticated Navigation */}
              <Tooltip content="View your order history">
                <Link href="/orders">
                  <Button
                    variant={isActive('/orders') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdShoppingCart />}
                    iconPosition="left"
                  >
                    Orders
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip content="View your invoices">
                <Link href="/invoices">
                  <Button
                    variant={isActive('/invoices') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdReceipt />}
                    iconPosition="left"
                  >
                    Invoices
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip content="Calculate container capacity">
                <Link href="/tools/container-calculator">
                  <Button
                    variant={isActive('/tools/container-calculator') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdCalculate />}
                    iconPosition="left"
                  >
                    Calculator
                  </Button>
                </Link>
              </Tooltip>

              {isAdmin && (
                <>
                  {/* Admin Separator */}
                  <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

                  <Tooltip content="Access admin dashboard">
                    <Link href="/admin/products">
                      <Button
                        variant={pathname?.startsWith('/admin') ? 'primary' : 'ghost'}
                        size="sm"
                        icon={<MdSettings />}
                        iconPosition="left"
                      >
                        Admin
                      </Button>
                    </Link>
                  </Tooltip>
                </>
              )}

              {/* Cart Separator */}
              <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

              <Tooltip content={`View cart (${cartCount} items)`}>
                <Link href="/cart">
                  <div className="relative">
                    <Button
                      variant={isActive('/cart') ? 'primary' : 'ghost'}
                      size="sm"
                      icon={<MdShoppingCart />}
                      iconPosition="left"
                    >
                      Cart
                    </Button>
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-b2b-orange text-xs font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </Link>
              </Tooltip>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Tooltip content="View your profile">
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<MdPerson className="h-5 w-5" />}
                    iconPosition="left"
                    aria-label="View your profile"
                  />
                </Link>
              </Tooltip>
              <Tooltip content="Sign out">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  icon={<MdLogout className="h-5 w-5" />}
                  iconPosition="left"
                  aria-label="Sign out"
                />
              </Tooltip>
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
