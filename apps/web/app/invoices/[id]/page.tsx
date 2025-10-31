'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, ArrowLeft, Package, MapPin, DollarSign, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import CopyButton from '@/components/CopyButton'

interface InvoiceDetails {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  shipping_amount: number
  total_amount: number
  paid_at?: string
  payment_method?: string
  payment_reference?: string
  notes?: string
  orders: {
    id: string
    order_number: string
    po_number?: string
    order_items: Array<{
      id: string
      quantity: number
      unit_price: number
      line_total: number
      sku: string
      name: string
    }>
  }
  organizations: {
    name: string
    email?: string
    phone?: string
  }
  shipping_address?: {
    contact_name: string
    street_address: string
    street_address2?: string
    city: string
    state: string
    postal_code: string
    phone: string
  }
}

const statusColors: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-neutral-200 text-neutral-800',
}

export default function InvoiceDetailsPage() {
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  const loadInvoice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/invoices/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch invoice')
      
      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invoice',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoice) return

    setMarkingPaid(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paymentMethod: 'Manual',
          paymentReference: `PAID-${new Date().getTime()}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to mark as paid')

      toast({
        title: 'Success',
        description: 'Invoice marked as paid',
      })

      loadInvoice()
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark invoice as paid',
        variant: 'destructive',
      })
    } finally {
      setMarkingPaid(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold">Invoice not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/invoices')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-500 mb-2">
                Invoice {invoice.invoice_number}
              </h1>
              <p className="text-muted-foreground">
                Order: {invoice.orders?.order_number}
                {invoice.orders?.po_number && ` | PO: ${invoice.orders.po_number}`}
              </p>
            </div>
            <Badge className={`${statusColors[invoice.status]} text-lg px-4 py-2`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 gap-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{invoice.invoice_number}</p>
                  <CopyButton text={invoice.invoice_number} label="Invoice Number" size="icon" />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-semibold">{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-semibold">
                  {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              {invoice.paid_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid Date</p>
                  <p className="font-semibold">{format(new Date(invoice.paid_at), 'MMM dd, yyyy')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bill To</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{invoice.organizations.name}</p>
                {invoice.organizations.email && (
                  <p className="text-sm text-muted-foreground">{invoice.organizations.email}</p>
                )}
                {invoice.organizations.phone && (
                  <p className="text-sm text-muted-foreground">{invoice.organizations.phone}</p>
                )}
              </CardContent>
            </Card>

            {invoice.shipping_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ship To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{invoice.shipping_address.contact_name}</p>
                  <p className="text-sm text-muted-foreground">{invoice.shipping_address.street_address}</p>
                  {invoice.shipping_address.street_address2 && (
                    <p className="text-sm text-muted-foreground">{invoice.shipping_address.street_address2}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {invoice.shipping_address.city}, {invoice.shipping_address.state} {invoice.shipping_address.postal_code}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.shipping_address.phone}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoice.orders?.order_items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.line_total.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoice Total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{invoice.shipping_amount === 0 ? 'FREE' : `$${invoice.shipping_amount.toFixed(2)}`}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${invoice.total_amount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {invoice.status === 'unpaid' && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  className="w-full"
                  onClick={handleMarkAsPaid}
                  disabled={markingPaid}
                >
                  {markingPaid ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Marking as Paid...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
