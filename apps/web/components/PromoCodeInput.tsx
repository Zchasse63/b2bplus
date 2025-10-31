'use client'

import { useState } from 'react'

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<{ success: boolean; message: string }>
  onRemove: () => void
  appliedCode?: string
  className?: string
}

export default function PromoCodeInput({
  onApply,
  onRemove,
  appliedCode,
  className = ''
}: PromoCodeInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleApply = async () => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: 'Please enter a promo code' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const result = await onApply(code.trim().toUpperCase())
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        setCode('')
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to apply promo code' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleRemove = () => {
    onRemove()
    setCode('')
    setMessage(null)
  }

  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-medium text-gray-900">Promo Code</h3>
      
      {appliedCode ? (
        <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-900">Code Applied</p>
              <p className="text-xs text-green-700">{appliedCode}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-sm text-green-700 hover:text-green-800"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Enter code"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply'}
            </button>
          </div>
          
          {message && (
            <div
              className={`mt-2 rounded p-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}
