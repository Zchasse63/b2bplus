'use client';

import { useState } from 'react';
import SidebarHorizon from '@/components/horizon/sidebar';
import { ConfiguratorContext } from '@/contexts/ConfiguratorContext';
import { IRoute } from '@/types/navigation';
import { 
  MdHome, 
  MdShoppingCart, 
  MdPeople, 
  MdBarChart,
  MdInventory,
  MdLocalShipping,
  MdSettings,
  MdReceipt
} from 'react-icons/md';

// Define admin routes for B2B+ platform
const routes: IRoute[] = [
  {
    name: 'Dashboard',
    path: '/admin',
    icon: <MdHome className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Products',
    path: '/admin/products',
    icon: <MdInventory className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    icon: <MdShoppingCart className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Customers',
    path: '/admin/customers',
    icon: <MdPeople className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Analytics',
    path: '/admin/analytics',
    icon: <MdBarChart className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Invoices',
    path: '/admin/invoices',
    icon: <MdReceipt className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Shipping',
    path: '/admin/shipping',
    icon: <MdLocalShipping className="h-6 w-6" />,
    collapse: false,
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: <MdSettings className="h-6 w-6" />,
    collapse: false,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mini, setMini] = useState(false);

  const [theme, setTheme] = useState({});
  const [contrast, setContrast] = useState(false);

  return (
    <ConfiguratorContext.Provider
      value={{
        mini,
        setMini,
        hovered,
        setHovered,
        theme,
        setTheme,
        contrast,
        setContrast,
      }}
    >
      <div className="flex h-full w-full bg-background-100 dark:bg-background-900">
        <SidebarHorizon
          routes={routes}
          open={open}
          setOpen={setOpen}
          variant="admin"
          hovered={hovered}
          setHovered={setHovered}
          mini={mini}
        />
        <main className="mx-auto flex-none transition-all md:pr-2 xl:ml-[313px]">
          <div className="mx-auto min-h-screen p-2 !pt-[90px] md:p-2">
            <div className="mx-auto mb-auto h-full min-h-[84vh] p-2 md:pr-2">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ConfiguratorContext.Provider>
  );
}
