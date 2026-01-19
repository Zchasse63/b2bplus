'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/b2b/Button';
import {
  MdShoppingCart,
  MdInventory,
  MdPerson,
  MdLogout,
  MdSettings,
  MdHome,
  MdShoppingBag,
  MdReceipt,
  MdShowChart,
  MdNotifications,
} from 'react-icons/md';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Use AuthContext instead of fetching data manually
  const { user, cartCount, isAdmin, loading, error, sessionExpiryWarning, secondsUntilExpiry, extendSession } = useAuth();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b2b-gray-200 bg-white/95 backdrop-blur shadow-b2b-sm">
      {/* Session Expiry Warning */}
      {sessionExpiryWarning && secondsUntilExpiry !== null && (
        <div className="bg-b2b-orange px-4 py-2 text-center text-sm text-white">
          Your session will expire in {secondsUntilExpiry} seconds.{' '}
          <button
            onClick={extendSession}
            className="font-semibold underline hover:no-underline"
          >
            Extend Session
          </button>
        </div>
      )}
      {/* Auth Error Display */}
      {error && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          {error.message}
          {error.retryable && (
            <button
              onClick={() => window.location.reload()}
              className="ml-2 font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <MdInventory className="h-6 w-6 text-b2b-blue" />
          <span className="hidden text-b2b-blue sm:inline">
            B2B+
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {/* Public Navigation */}
          <Link href="/" title="Go to homepage">
            <Button
              variant={isActive('/') ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdHome />}
              iconPosition="left"
            >
              Home
            </Button>
          </Link>
          <Link href="/products" title="Browse all products">
            <Button
              variant={isActive('/products') ? 'primary' : 'ghost'}
              size="sm"
              icon={<MdShoppingBag />}
              iconPosition="left"
            >
              Products
            </Button>
          </Link>

          {user && !loading && (
            <>
              {/* Visual Separator */}
              <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

              {/* Authenticated Navigation */}
              <Link href="/orders" title="View your order history">
                <Button
                  variant={isActive('/orders') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdShoppingCart />}
                  iconPosition="left"
                >
                  Orders
                </Button>
              </Link>
              <Link href="/invoices" title="View your invoices">
                <Button
                  variant={isActive('/invoices') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdReceipt />}
                  iconPosition="left"
                >
                  Invoices
                </Button>
              </Link>
              <Link href="/analytics" title="View analytics dashboard">
                <Button
                  variant={isActive('/analytics') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdShowChart />}
                  iconPosition="left"
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/notifications" title="View notifications">
                <Button
                  variant={isActive('/notifications') ? 'primary' : 'ghost'}
                  size="sm"
                  icon={<MdNotifications />}
                  iconPosition="left"
                >
                  Notifications
                </Button>
              </Link>

              {isAdmin && (
                <>
                  {/* Admin Separator */}
                  <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

                  <Link href="/admin/products" title="Access admin dashboard">
                    <Button
                      variant={pathname?.startsWith('/admin') ? 'primary' : 'ghost'}
                      size="sm"
                      icon={<MdSettings />}
                      iconPosition="left"
                    >
                      Admin
                    </Button>
                  </Link>
                </>
              )}

              {/* Cart Separator */}
              <div className="h-6 w-px bg-b2b-gray-300 mx-1" />

              <Link href="/cart" className="relative" title={`View cart (${cartCount} items)`}>
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
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2" data-testid="user-menu">
          {user && !loading ? (
            <>
              <Link href="/profile" title="View your profile">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MdPerson className="h-5 w-5" />}
                  iconPosition="left"
                />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                icon={<MdLogout className="h-5 w-5" />}
                iconPosition="left"
                data-testid="sign-out-button"
                title="Sign out"
                disabled={isSigningOut}
              >
                {isSigningOut && <span className="ml-1">...</span>}
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
