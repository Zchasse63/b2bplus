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
  MdChat,
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

  // Use AuthContext instead of fetching data manually
  const { user, cartCount, isAdmin, loading } = useAuth();

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
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <MdInventory className="h-6 w-6 text-b2b-blue" />
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

          {user && !loading && (
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
              <Tooltip content="Chat with AI Assistant">
                <Link href="/chat">
                  <Button
                    variant={isActive('/chat') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdChat />}
                    iconPosition="left"
                  >
                    AI Assistant
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip content="View analytics dashboard">
                <Link href="/analytics">
                  <Button
                    variant={isActive('/analytics') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdShowChart />}
                    iconPosition="left"
                  >
                    Analytics
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip content="View notifications">
                <Link href="/notifications">
                  <Button
                    variant={isActive('/notifications') ? 'primary' : 'ghost'}
                    size="sm"
                    icon={<MdNotifications />}
                    iconPosition="left"
                  >
                    Notifications
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
        <div className="flex items-center gap-2" data-testid="user-menu">
          {user && !loading ? (
            <>
              <Tooltip content="View your profile">
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<MdPerson className="h-5 w-5" />}
                    iconPosition="left"
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
                  data-testid="sign-out-button"
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
