'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MapPin, Plus, Trash2, Edit, Check } from 'lucide-react'

interface ShippingAddress {
  id: string
  label: string
  contact_name: string
  phone: string
  street_address: string
  street_address2?: string
  city: string
  state: string
  postal_code: string
  is_default: boolean
}

export default function SettingsPage() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    label: '',
    contact_name: '',
    phone: '',
    street_address: '',
    street_address2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
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

      setOrganizationId(profile.current_organization_id)

      // Load shipping addresses
      const { data: addressData, error: addressError } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('organization_id', profile.current_organization_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (addressError) throw addressError
      setAddresses(addressData || [])
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      label: '',
      contact_name: '',
      phone: '',
      street_address: '',
      street_address2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    })
    setEditingAddress(null)
  }

  const handleOpenDialog = (address?: ShippingAddress) => {
    if (address) {
      setEditingAddress(address)
      setFormData({
        label: address.label,
        contact_name: address.contact_name,
        phone: address.phone,
        street_address: address.street_address,
        street_address2: address.street_address2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        is_default: address.is_default,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSaveAddress = async () => {
    if (!organizationId) return

    try {
      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from('shipping_addresses')
          .update({
            ...formData,
            street_address2: formData.street_address2 || null,
          })
          .eq('id', editingAddress.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Address updated successfully',
        })
      } else {
        // Create new address
        const { error } = await supabase
          .from('shipping_addresses')
          .insert({
            ...formData,
            organization_id: organizationId,
            street_address2: formData.street_address2 || null,
          })

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Address added successfully',
        })
      }

      setIsDialogOpen(false)
      resetForm()
      await loadSettings()
    } catch (error) {
      console.error('Error saving address:', error)
      toast({
        title: 'Error',
        description: 'Failed to save address',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Address deleted successfully',
      })

      await loadSettings()
    } catch (error) {
      console.error('Error deleting address:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete address',
        variant: 'destructive',
      })
    }
  }

  const handleSetDefault = async (addressId: string) => {
    if (!organizationId) return

    try {
      // Remove default from all addresses
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('organization_id', organizationId)

      // Set new default
      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Default address updated',
      })

      await loadSettings()
    } catch (error) {
      console.error('Error setting default address:', error)
      toast({
        title: 'Error',
        description: 'Failed to set default address',
        variant: 'destructive',
      })
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
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-500 mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your organization settings</p>
        </div>

        {/* Shipping Addresses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Addresses
                </CardTitle>
                <CardDescription>
                  Manage your delivery locations
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAddress ? 'Update the address details below' : 'Enter the details for your new shipping address'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="label">Address Label *</Label>
                      <Input
                        id="label"
                        placeholder="e.g., Main Kitchen, Downtown Location"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_name">Contact Name *</Label>
                        <Input
                          id="contact_name"
                          placeholder="John Doe"
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="street_address">Street Address *</Label>
                      <Input
                        id="street_address"
                        placeholder="123 Main St"
                        value={formData.street_address}
                        onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="street_address2">Street Address 2</Label>
                      <Input
                        id="street_address2"
                        placeholder="Apt, Suite, Unit, etc."
                        value={formData.street_address2}
                        onChange={(e) => setFormData({ ...formData, street_address2: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          placeholder="NY"
                          maxLength={2}
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        placeholder="10001"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="is_default" className="cursor-pointer">
                        Set as default address
                      </Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveAddress}>
                        {editingAddress ? 'Update' : 'Add'} Address
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No shipping addresses yet. Add one to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {addresses.map(address => (
                  <div
                    key={address.id}
                    className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-lg">{address.label}</p>
                          {address.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{address.contact_name}</p>
                        <p className="text-sm text-muted-foreground">{address.street_address}</p>
                        {address.street_address2 && (
                          <p className="text-sm text-muted-foreground">{address.street_address2}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-muted-foreground">{address.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        {!address.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(address.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(address)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
