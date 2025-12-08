'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    MdHome,
    MdShoppingBag,
    MdShoppingCart,
    MdReceipt,
    MdPerson,
} from 'react-icons/md';

interface NavItem {
    href: string;
    icon: React.ElementType;
    label: string;
}

const navItems: NavItem[] = [
    { href: '/', icon: MdHome, label: 'Home' },
    { href: '/products', icon: MdShoppingBag, label: 'Products' },
    { href: '/cart', icon: MdShoppingCart, label: 'Cart' },
    { href: '/orders', icon: MdReceipt, label: 'Orders' },
    { href: '/profile', icon: MdPerson, label: 'Profile' },
];

/**
 * MobileBottomNav - Fixed bottom navigation for mobile devices
 * Following Design System specifications:
 * - Fixed position at bottom
 * - Safe area inset support for iOS
 * - Active state highlighting
 * - Hidden on larger screens (tablet+)
 */
export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-b2b-gray-200 md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Mobile navigation"
        >
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                                'transition-colors duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-b2b-blue-300',
                                isActive
                                    ? 'text-b2b-blue'
                                    : 'text-b2b-gray-500 hover:text-b2b-blue-400'
                            )}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon
                                className={cn(
                                    'w-6 h-6 transition-transform duration-150',
                                    isActive && 'scale-110'
                                )}
                            />
                            <span className={cn(
                                'text-xs font-medium',
                                isActive && 'font-semibold'
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default MobileBottomNav;
