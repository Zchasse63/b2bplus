/**
 * useCart Hook
 * 
 * React hook for managing cart operations via the /api/cart endpoints
 * Replaces direct Supabase mutations with server-side API calls
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface CartItem {
  id: string
  productId: string
  quantity: number
  organizationId: string
  createdAt: string
}

export function useCart() {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch cart items
  const fetchCart = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cart')
      if (!response.ok) throw new Error('Failed to fetch cart')

      const data = await response.json()
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Add item to cart
  const addItem = useCallback(
    async (productId: string, quantity: number, organizationId: string) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf-token='))
          ?.split('=')[1]

        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || '',
          },
          body: JSON.stringify({
            productId,
            quantity,
            organizationId,
          }),
        })

        if (!response.ok) throw new Error('Failed to add item')

        const data = await response.json()
        setItems([...items, data.item])
        return data.item
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [user, items]
  )

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: string) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf-token='))
          ?.split('=')[1]

        const response = await fetch(`/api/cart/${itemId}`, {
          method: 'DELETE',
          headers: {
            'x-csrf-token': csrfToken || '',
          },
        })

        if (!response.ok) throw new Error('Failed to remove item')

        setItems(items.filter(item => item.id !== itemId))
      } catch (err: any) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [user, items]
  )

  return {
    items,
    loading,
    error,
    fetchCart,
    addItem,
    removeItem,
  }
}

