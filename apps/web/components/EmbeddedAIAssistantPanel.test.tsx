import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EmbeddedAIAssistantPanel } from './EmbeddedAIAssistantPanel'

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock b2b Card/Button to simple primitives to keep the test light
jest.mock('@/components/b2b', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="ai-panel-card">
      {children}
    </div>
  ),
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

describe('EmbeddedAIAssistantPanel', () => {
  it('renders analytics mode copy and quick prompts', () => {
    render(<EmbeddedAIAssistantPanel mode="analytics" />)

    // Shared title
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()

    // Mode-specific subtitle and placeholder
    expect(screen.getByText('Ask questions about your spend and trends.')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Ask about your spending trends or opportunities...')
    ).toBeInTheDocument()

    // One of the analytics quick prompts
    expect(
      screen.getByText('Where did my spend increase most this month?')
    ).toBeInTheDocument()
  })

  it('renders different placeholder for cart mode', () => {
    render(<EmbeddedAIAssistantPanel mode="cart" />)

    expect(
      screen.getByPlaceholderText('Ask for help optimizing your cart or order...')
    ).toBeInTheDocument()
  })
})

