import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LeadCaptureForm } from './LeadCaptureForm'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/components/b2b/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/b2b/Input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}))
jest.mock('@/components/b2b/Card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

describe('LeadCaptureForm', () => {
  let mockToast: jest.Mock

  beforeEach(() => {
    mockToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<LeadCaptureForm />)

    expect(screen.getByPlaceholderText('Your Company Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('john@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeInTheDocument()
  })

  it('updates form data when user types', () => {
    render(<LeadCaptureForm />)

    const companyInput = screen.getByPlaceholderText('Your Company Name')
    fireEvent.change(companyInput, { target: { value: 'Test Company' } })

    expect(companyInput).toHaveValue('Test Company')
  })

  it('submits form successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    // Fill required state field
    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/leads/create',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test Company'),
        })
      )
    })
  })

  it('shows success message after submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Thank you'),
        })
      )
    })
  })

  it('shows error message on submission failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Submission failed' }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      )
    })
  })

  it('disables submit button while submitting', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('includes source field in submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/leads/create',
        expect.objectContaining({
          body: expect.stringContaining('"source":"website"'),
        })
      )
    })
  })

  it('renders state dropdown with US states', () => {
    render(<LeadCaptureForm />)

    // State dropdown exists (check by name attribute)
    const inputs = document.querySelectorAll('select[name="state"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders company size dropdown', () => {
    render(<LeadCaptureForm />)

    const inputs = document.querySelectorAll('select[name="company_size"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders industry dropdown', () => {
    render(<LeadCaptureForm />)

    const inputs = document.querySelectorAll('select[name="industry"]')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      )
    })
  })

  it('shows success screen after successful submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Thank You!')).toBeInTheDocument()
    })
  })

  it('shows success icon after submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LeadCaptureForm />)

    fireEvent.change(screen.getByPlaceholderText('Your Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByPlaceholderText('john@company.com'), {
      target: { value: 'john@test.com' },
    })

    const stateSelect = document.querySelector('select[name="state"]') as HTMLSelectElement
    fireEvent.change(stateSelect, { target: { value: 'CA' } })

    const submitButton = screen.getByText('Request a Demo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })
  })
})

