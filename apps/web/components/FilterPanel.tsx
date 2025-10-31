'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'

export interface FilterState {
  dateRange: {
    preset: 'all' | '7days' | '30days' | '90days' | 'year' | 'custom'
    startDate: string
    endDate: string
  }
  statuses: string[]
  amountRange: {
    min: string
    max: string
  }
}

interface FilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClearFilters: () => void
  activeFilterCount: number
}

const statusOptions = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
]

const datePresets = [
  { value: 'all', label: 'All Time' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

export default function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleDatePresetChange = (preset: FilterState['dateRange']['preset']) => {
    const today = new Date()
    let startDate = ''
    let endDate = ''

    switch (preset) {
      case '7days':
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case '30days':
        startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case '90days':
        startDate = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case 'all':
      case 'custom':
        startDate = ''
        endDate = ''
        break
    }

    onFiltersChange({
      ...filters,
      dateRange: { preset, startDate, endDate },
    })
  }

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]

    onFiltersChange({
      ...filters,
      statuses: newStatuses,
    })
  }

  const handleAmountChange = (field: 'min' | 'max', value: string) => {
    onFiltersChange({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        [field]: value,
      },
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        preset: 'custom',
        [field]: value,
      },
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Date Range Filter */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Date Range</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {datePresets.map(preset => (
                <Button
                  key={preset.value}
                  variant={filters.dateRange.preset === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDatePresetChange(preset.value as FilterState['dateRange']['preset'])}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {filters.dateRange.preset === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm">From</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm">To</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Status</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <Button
                  key={status.value}
                  variant={filters.statuses.includes(status.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusToggle(status.value)}
                  className="gap-2"
                >
                  {filters.statuses.includes(status.value) && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Range Filter */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Amount Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAmount" className="text-sm">Min Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="0.00"
                    value={filters.amountRange.min}
                    onChange={(e) => handleAmountChange('min', e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="maxAmount" className="text-sm">Max Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="0.00"
                    value={filters.amountRange.max}
                    onChange={(e) => handleAmountChange('max', e.target.value)}
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
