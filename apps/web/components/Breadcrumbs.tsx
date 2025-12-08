'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Breadcrumbs component following Design System specifications
 * - Includes home icon as first item
 * - Proper focus states and transitions
 * - Current item styled differently from links
 */
export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav
      className={cn('flex', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {/* Home icon */}
        <li>
          <Link
            href="/"
            className="text-b2b-gray-400 hover:text-b2b-blue transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
            aria-label="Home"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {/* Separator */}
              <svg
                className="h-4 w-4 flex-shrink-0 text-b2b-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>

              {isLast ? (
                <span
                  className="text-sm font-medium text-b2b-text"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm font-medium text-b2b-gray-500 hover:text-b2b-blue transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300 rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

