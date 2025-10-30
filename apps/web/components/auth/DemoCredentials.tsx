'use client'

import { useState } from 'react'

interface DemoAccount {
  label: string
  email: string
  password: string
  description: string
  icon: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Regular User',
    email: 'test@testmail.app',
    password: 'TestPassword123!',
    description: 'Standard user with cart and order access',
    icon: '👤',
  },
  {
    label: 'Admin User',
    email: 'admin@testmail.app',
    password: 'AdminPassword123!',
    description: 'Admin with user management access',
    icon: '👨‍💼',
  },
]

interface DemoCredentialsProps {
  onFillCredentials: (email: string, password: string) => void
}

export default function DemoCredentials({ onFillCredentials }: DemoCredentialsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isExpanded) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Demo Credentials</h3>
              <p className="text-xs text-blue-700">Click to view test accounts</p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔑</span>
          <h3 className="text-sm font-semibold text-blue-900">Demo Credentials</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
          aria-label="Collapse demo credentials"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {DEMO_ACCOUNTS.map((account) => (
          <div
            key={account.email}
            className="rounded-md border border-blue-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{account.icon}</span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{account.label}</h4>
                  <p className="text-xs text-gray-600">{account.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFillCredentials(account.email, account.password)}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Auto-fill
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700">Email:</span>
                <div className="flex items-center gap-1">
                  <code className="rounded bg-gray-100 px-2 py-1 text-gray-800">
                    {account.email}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(account.email, `${account.email}-email`)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Copy email"
                  >
                    {copiedField === `${account.email}-email` ? (
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700">Password:</span>
                <div className="flex items-center gap-1">
                  <code className="rounded bg-gray-100 px-2 py-1 text-gray-800">
                    {account.password}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(account.password, `${account.email}-password`)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Copy password"
                  >
                    {copiedField === `${account.email}-password` ? (
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-yellow-50 p-2 text-xs text-yellow-800">
        <strong>⚠️ Development Only:</strong> These credentials are for testing purposes only and should not be used in production.
      </div>
    </div>
  )
}

