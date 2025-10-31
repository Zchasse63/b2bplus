'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Package, Search, Eye, ShoppingCart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import FilterPanel, { FilterState } from '@/components/FilterPanel'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  submitted_at: string
  created_at: string
  po_number?: string
  order_items: Array<{
    id: string
    quantity: number
    name: string
  }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-neutral-200 text-neutral-800',
  submitted: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { preset: 'all', startDate: '', endDate: '' },
    statuses: [],
    amountRange: { min: '', max: '' },
  })

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, orders, filters])

  const applyFilters = () => {
    let filtered = [...orders]

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply date range filter
    if (filters.dateRange.startDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.submitted_at || order.created_at)
        return orderDate >= new Date(filters.dateRange.startDate)
      })
    }
    if (filters.dateRange.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.submitted_at || order.created_at)
        return orderDate <= new Date(filters.dateRange.endDate + 'T23:59:59')
      })
    }

    // Apply status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(order => filters.statuses.includes(order.status))
    }

    // Apply amount range filter
    if (filters.amountRange.min) {
      const minAmount = parseFloat(filters.amountRange.min)
      filtered = filtered.filter(order => order.total >= minAmount)
    }
    if (filters.amountRange.max) {
      const maxAmount = parseFloat(filters.amountRange.max)
      filtered = filtered.filter(order => order.total <= maxAmount)
    }

    setFilteredOrders(filtered)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.dateRange.preset !== 'all') count++
    if (filters.statuses.length > 0) count++
    if (filters.amountRange.min || filters.amountRange.max) count++
    return count
  }

  const handleClearFilters = () => {
    setFilters({
      dateRange: { preset: 'all', startDate: '', endDate: '' },
      statuses: [],
      amountRange: { min: '', max: '' },
    })
    setSearchQuery('')
  }

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.current_organization_id) {
        throw new Error('No organization found')
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            name
          )
        `)
        .eq('organization_id', profile.current_organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      setFilteredOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalItems = (order: Order) => {
    return order.order_items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId)
    try {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder')
      }

      toast({
        title: 'Success!',
        description: data.message,
      })

      // Redirect to cart after a short delay
      setTimeout(() => {
        router.push('/cart')
      }, 1000)
    } catch (error) {
      console.error('Reorder error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reorder. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setReorderingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-500 mb-2">Order History</h1>
          <p className="text-muted-foreground">View and track your orders</p>
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
          activeFilterCount={getActiveFilterCount()}
        />

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or PO number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No orders found' : 'No orders yet'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Start shopping to create your first order'}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push('/products')}>
                  Browse Products
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order {order.order_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {format(new Date(order.submitted_at || order.created_at), 'MMM dd, yyyy')}
                      </p>
                      {order.po_number && (
                        <p className="text-sm text-muted-foreground">
                          PO: {order.po_number}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[order.status]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {getTotalItems(order)} {getTotalItems(order) === 1 ? 'item' : 'items'}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleReorder(order.id)}
                        disabled={reorderingId === order.id}
                      >
                        {reorderingId === order.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 mr-2" />
                        )}
                        Reorder
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
