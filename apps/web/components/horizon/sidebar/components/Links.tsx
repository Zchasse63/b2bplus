/* eslint-disable */
import React from 'react';
import { IRoute } from '@/types/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SidebarLinks(props: { routes: IRoute[]; [x: string]: any }) {
  const pathname = usePathname();
  const { routes, hovered, mini } = props;

  const activeRoute = (routeName: string) => {
    return pathname?.includes(routeName);
  };

  const createLinks = (routes: IRoute[]) => {
    return routes.map((route, key) => {
      if (route.collapse) {
        // Handle collapsible routes (simplified without Accordion)
        return (
          <div key={key} className="mb-2">
            <div className="mb-1.5 flex w-full items-center pl-8 pr-7">
              <div className="flex w-full items-center">
                {route.icon && (
                  <div
                    className={`flex items-center justify-center ${
                      mini === false
                        ? 'mr-3.5'
                        : mini === true && hovered
                        ? 'mr-3.5'
                        : 'mx-auto'
                    } ${
                      activeRoute(route.path.toLowerCase())
                        ? 'text-brand-500 dark:text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {route.icon}
                  </div>
                )}
                <p
                  className={`mr-auto ${
                    mini === false
                      ? 'block'
                      : mini === true && hovered === true
                      ? 'block'
                      : 'block xl:hidden'
                  } ${
                    activeRoute(route.path.toLowerCase())
                      ? 'font-medium text-navy-700 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.name}
                </p>
              </div>
            </div>
            {route.items && (
              <div className="ml-5 pl-12">
                {route.items.map((item, itemKey) => (
                  <Link
                    key={itemKey}
                    href={item.path}
                    className={`flex w-full items-center py-2 ${
                      activeRoute(item.path.toLowerCase())
                        ? 'text-navy-700 dark:text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <Link key={key} href={route.path}>
            <div
              className={`mb-1.5 flex w-full cursor-pointer items-center rounded-lg pl-8 pr-7 py-2 transition-all hover:bg-gray-50 dark:hover:bg-white/10 ${
                activeRoute(route.path.toLowerCase())
                  ? 'bg-gray-50 dark:bg-white/10'
                  : ''
              } ${
                mini === false
                  ? 'justify-between'
                  : mini === true && hovered === true
                  ? 'justify-between'
                  : 'justify-center'
              }`}
            >
              <div className="flex w-full items-center">
                {route.icon && (
                  <div
                    className={`flex items-center justify-center ${
                      mini === false
                        ? 'mr-3.5'
                        : mini === true && hovered
                        ? 'mr-3.5'
                        : 'mx-auto'
                    } ${
                      activeRoute(route.path.toLowerCase())
                        ? 'text-brand-500 dark:text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {route.icon}
                  </div>
                )}
                <p
                  className={`mr-auto ${
                    mini === false
                      ? 'block'
                      : mini === true && hovered === true
                      ? 'block'
                      : 'block xl:hidden'
                  } ${
                    activeRoute(route.path.toLowerCase())
                      ? 'font-medium text-navy-700 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.name}
                </p>
              </div>
            </div>
          </Link>
        );
      }
    });
  };

  return <>{createLinks(routes)}</>;
}

export default SidebarLinks;
