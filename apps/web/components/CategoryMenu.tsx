'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  sort_order: number
  subcategories?: Category[]
}

export default function CategoryMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      // Fetch all categories
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      // Organize into hierarchy
      const topLevel = data.filter(cat => !cat.parent_id)
      const organized = topLevel.map(parent => ({
        ...parent,
        subcategories: data.filter(cat => cat.parent_id === parent.id)
      }))

      setCategories(organized)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 w-24 animate-pulse rounded bg-gray-200"></div>
        ))}
      </div>
    )
  }

  return (
    <nav className="relative">
      <ul className="flex flex-wrap gap-6">
        {categories.map(category => (
          <li
            key={category.id}
            className="relative"
            onMouseEnter={() => setHoveredCategory(category.id)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <Link
              href={`/categories/${category.slug}`}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              {category.name}
              {category.subcategories && category.subcategories.length > 0 && (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </Link>

            {/* Subcategory Dropdown */}
            {category.subcategories && category.subcategories.length > 0 && hoveredCategory === category.id && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="p-2">
                  <div className="mb-2 border-b border-gray-200 pb-2">
                    <Link
                      href={`/categories/${category.slug}`}
                      className="block px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded"
                    >
                      All {category.name}
                    </Link>
                  </div>
                  {category.subcategories.map(subcat => (
                    <Link
                      key={subcat.id}
                      href={`/categories/${subcat.slug}`}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded"
                    >
                      {subcat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
