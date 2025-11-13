import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PromoCodeInput from './PromoCodeInput'

describe('PromoCodeInput', () => {
  const mockOnApply = jest.fn()
  const mockOnRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('renders promo code input', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      expect(screen.getByText('Promo Code')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter code')).toBeInTheDocument()
      expect(screen.getByText('Apply')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} className="custom-class" />
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('shows input and apply button when no code is applied', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      expect(screen.getByPlaceholderText('Enter code')).toBeInTheDocument()
      expect(screen.getByText('Apply')).toBeInTheDocument()
    })

    it('shows applied code when code is provided', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} appliedCode="SAVE20" />)

      expect(screen.getByText('Code Applied')).toBeInTheDocument()
      expect(screen.getByText('SAVE20')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })
  })

  describe('Code Input', () => {
    it('allows entering a promo code', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'save10' } })

      expect(input.value).toBe('SAVE10')
    })

    it('converts code to uppercase automatically', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'save10' } })

      expect(input.value).toBe('SAVE10')
    })

    it('disables input when loading', async () => {
      mockOnApply.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, message: 'Applied' }), 100))
      )

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(input).toBeDisabled()
      })
    })

    it('disables apply button when input is empty', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const applyButton = screen.getByText('Apply')
      expect(applyButton).toBeDisabled()
    })

    it('enables apply button when code is entered', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })

      expect(applyButton).not.toBeDisabled()
    })
  })

  describe('Code Application', () => {
    it('applies promo code when button is clicked', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('SAVE10')
      })
    })

    it('applies promo code when Enter key is pressed', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('SAVE10')
      })
    })

    it('trims whitespace from code before applying', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: '  SAVE10  ' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('SAVE10')
      })
    })

    it('shows error when trying to apply empty code', async () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      // Input with only whitespace
      fireEvent.change(input, { target: { value: '   ' } })

      // Button should be disabled for empty/whitespace input
      expect(applyButton).toBeDisabled()

      expect(mockOnApply).not.toHaveBeenCalled()
    })

    it('shows loading state while applying code', async () => {
      let resolveApply: any
      const applyPromise = new Promise((resolve) => {
        resolveApply = resolve
      })

      mockOnApply.mockReturnValue(applyPromise)

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Applying...')).toBeInTheDocument()
      })

      // Resolve the promise
      resolveApply({ success: true, message: 'Applied' })
    })

    it('shows success message when code is applied successfully', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Code applied successfully')).toBeInTheDocument()
      })
    })

    it('clears input after successful application', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('shows error message when code application fails', async () => {
      mockOnApply.mockResolvedValue({ success: false, message: 'Invalid code' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'INVALID' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument()
      })
    })

    it('handles application errors gracefully', async () => {
      mockOnApply.mockRejectedValue(new Error('Network error'))

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to apply promo code')).toBeInTheDocument()
      })
    })

    it('auto-dismisses messages after 5 seconds', async () => {
      mockOnApply.mockResolvedValue({ success: true, message: 'Code applied successfully' })

      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code')
      const applyButton = screen.getByText('Apply')

      fireEvent.change(input, { target: { value: 'SAVE10' } })
      fireEvent.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Code applied successfully')).toBeInTheDocument()
      })

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(screen.queryByText('Code applied successfully')).not.toBeInTheDocument()
      })
    })
  })

  describe('Code Removal', () => {
    it('shows remove button when code is applied', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} appliedCode="SAVE20" />)

      expect(screen.getByText('Remove')).toBeInTheDocument()
    })

    it('calls onRemove when remove button is clicked', () => {
      render(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} appliedCode="SAVE20" />)

      const removeButton = screen.getByText('Remove')
      fireEvent.click(removeButton)

      expect(mockOnRemove).toHaveBeenCalled()
    })

    it('clears input when code is removed', () => {
      const { rerender } = render(
        <PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} appliedCode="SAVE20" />
      )

      const removeButton = screen.getByText('Remove')
      fireEvent.click(removeButton)

      // Simulate parent component updating appliedCode prop
      rerender(<PromoCodeInput onApply={mockOnApply} onRemove={mockOnRemove} />)

      const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement
      expect(input.value).toBe('')
    })
  })
})

