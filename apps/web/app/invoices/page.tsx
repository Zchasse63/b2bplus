'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, FileText, Search, Eye, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  total_amount: number
  orders: {
    order_number: string
    po_number?: string
  }
}

const statusColors: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-neutral-200 text-neutral-800',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, statusFilter, invoices])

  const applyFilters = () => {
    let filtered = [...invoices]

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.orders?.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.orders?.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch invoices')
      
      const data = await response.json()
      setInvoices(data)
      setFilteredInvoices(data)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalAmount = () => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
  }

  const getUnpaidAmount = () => {
    return filteredInvoices
      .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total_amount, 0)
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-secondary-500">Invoices</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">${getTotalAmount().toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Amount</p>
                  <p className="text-2xl font-bold text-yellow-600">${getUnpaidAmount().toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, order number, or PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'unpaid' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('unpaid')}
              size="sm"
            >
              Unpaid
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('paid')}
              size="sm"
            >
              Paid
            </Button>
            <Button
              variant={statusFilter === 'overdue' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('overdue')}
              size="sm"
            >
              Overdue
            </Button>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Invoices Found</p>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Invoices will appear here when orders are submitted'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map(invoice => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {invoice.invoice_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Order: {invoice.orders?.order_number}
                        {invoice.orders?.po_number && ` | PO: ${invoice.orders.po_number}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Issued: {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                        {invoice.due_date && ` | Due: ${format(new Date(invoice.due_date), 'MMM dd, yyyy')}`}
                      </p>
                    </div>
                    <Badge className={statusColors[invoice.status]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        ${invoice.total_amount.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
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
