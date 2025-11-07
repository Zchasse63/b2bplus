'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/b2b'
import { Button } from '@/components/b2b'
import { Input } from '@/components/b2b'
import { RefreshCw, Package, Search, Eye, ShoppingCart, FileText } from 'lucide-react'
import { Badge } from '@/components/b2b'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import FilterPanel, { FilterState } from '@/components/FilterPanel'
import CopyButton from '@/components/CopyButton'

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

const ORDERS_PER_PAGE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
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
  }, [currentPage, searchQuery, filters])

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
    setCurrentPage(1)
  }

  const loadOrders = async () => {
    setLoading(true)
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

      // Calculate pagination
      const from = (currentPage - 1) * ORDERS_PER_PAGE;
      const to = from + ORDERS_PER_PAGE - 1;

      // Build query with filters
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            name
          )
        `, { count: 'exact' })
        .eq('organization_id', profile.current_organization_id)

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `order_number.ilike.%${searchQuery}%,po_number.ilike.%${searchQuery}%`
        )
      }

      // Apply date range filter
      if (filters.dateRange.startDate) {
        query = query.gte('created_at', filters.dateRange.startDate)
      }
      if (filters.dateRange.endDate) {
        query = query.lte('created_at', filters.dateRange.endDate + 'T23:59:59')
      }

      // Apply status filter
      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      }

      // Apply amount range filter
      if (filters.amountRange.min) {
        const minAmount = parseFloat(filters.amountRange.min)
        query = query.gte('total', minAmount)
      }
      if (filters.amountRange.max) {
        const maxAmount = parseFloat(filters.amountRange.max)
        query = query.lte('total', maxAmount)
      }

      // Apply sorting and pagination
      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      setOrders(data || [])
      setTotalCount(count || 0)
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-8 w-8 text-primary" />
        </motion.div>
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

        {/* MdSearch */}
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

        {/* Results Count & Pagination Info */}
        {totalCount > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ORDERS_PER_PAGE + 1}-
              {Math.min(currentPage * ORDERS_PER_PAGE, totalCount)} of {totalCount} orders
            </p>
            {Math.ceil(totalCount / ORDERS_PER_PAGE) > 1 && (
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalCount / ORDERS_PER_PAGE)}
              </p>
            )}
          </div>
        )}

        {/* Orders List */}
        {orders.length === 0 && !loading ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
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
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-b2b-dark">
                          Order {order.order_number}
                        </h2>
                        {order.po_number && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">PO: {order.po_number}</span>
                            <CopyButton text={order.po_number} label="PO Number" size="icon" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {format(new Date(order.submitted_at || order.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge className={statusColors[order.status]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
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
                          <motion.div
                            className="inline-block mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </motion.div>
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
                </div>
              </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {Math.ceil(totalCount / ORDERS_PER_PAGE) > 1 && (
              <Card className="p-4 mt-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: Math.ceil(totalCount / ORDERS_PER_PAGE) },
                      (_, i) => i + 1
                    )
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === Math.ceil(totalCount / ORDERS_PER_PAGE) ||
                          Math.abs(page - currentPage) <= 2
                      )
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center gap-2">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(Math.ceil(totalCount / ORDERS_PER_PAGE), prev + 1)
                      )
                    }
                    disabled={currentPage === Math.ceil(totalCount / ORDERS_PER_PAGE)}
                  >
                    Next
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
