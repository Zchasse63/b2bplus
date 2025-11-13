import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Select } from './Select'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    p: ({ children, variants, initial, animate, exit, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Select', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  describe('Rendering', () => {
    it('renders select element', () => {
      render(<Select options={mockOptions} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders with label', () => {
      render(<Select label="Choose Option" options={mockOptions} />)
      expect(screen.getByText('Choose Option')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders without label', () => {
      render(<Select options={mockOptions} />)
      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />)
      expect(screen.getByRole('combobox')).toHaveClass('custom-class')
    })
  })

  describe('Options', () => {
    it('renders all options', () => {
      render(<Select options={mockOptions} />)
      
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument()
    })

    it('renders options with correct values', () => {
      render(<Select options={mockOptions} />)
      
      const option1 = screen.getByRole('option', { name: 'Option 1' }) as HTMLOptionElement
      const option2 = screen.getByRole('option', { name: 'Option 2' }) as HTMLOptionElement
      
      expect(option1.value).toBe('option1')
      expect(option2.value).toBe('option2')
    })

    it('renders empty options array', () => {
      render(<Select options={[]} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Select options={mockOptions} error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styling to select', () => {
      render(<Select options={mockOptions} error="Error" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('border-red-500')
      expect(select).toHaveClass('focus:ring-red-500')
    })

    it('error message has correct styling', () => {
      render(<Select options={mockOptions} error="Error message" />)
      const error = screen.getByText('Error message')
      expect(error).toHaveClass('text-red-500')
      expect(error).toHaveClass('text-sm')
    })

    it('does not show error when error prop is not provided', () => {
      render(<Select options={mockOptions} />)
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables select when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />)
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('applies disabled styling', () => {
      render(<Select options={mockOptions} disabled />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('disabled:bg-b2b-gray-50')
      expect(select).toHaveClass('disabled:cursor-not-allowed')
      expect(select).toHaveClass('disabled:text-b2b-gray-500')
    })
  })

  describe('Value and onChange', () => {
    it('accepts value prop', () => {
      render(<Select options={mockOptions} value="option2" onChange={() => {}} />)
      expect(screen.getByRole('combobox')).toHaveValue('option2')
    })

    it('calls onChange when value changes', () => {
      const handleChange = jest.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'option1' } })
      
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('updates value on change', () => {
      const { rerender } = render(<Select options={mockOptions} value="" onChange={() => {}} />)
      const select = screen.getByRole('combobox') as HTMLSelectElement
      
      rerender(<Select options={mockOptions} value="option2" onChange={() => {}} />)
      expect(select.value).toBe('option2')
    })
  })

  describe('Focus State', () => {
    it('can be focused', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')
      
      select.focus()
      expect(select).toHaveFocus()
    })

    it('applies focus styling', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('focus:outline-none')
      expect(select).toHaveClass('focus:ring-2')
      expect(select).toHaveClass('focus:ring-b2b-yellow')
    })

    it('calls onFocus when focused', () => {
      const handleFocus = jest.fn()
      render(<Select options={mockOptions} onFocus={handleFocus} />)
      
      fireEvent.focus(screen.getByRole('combobox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur when blurred', () => {
      const handleBlur = jest.fn()
      render(<Select options={mockOptions} onBlur={handleBlur} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.focus(select)
      fireEvent.blur(select)
      
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('HTML Attributes', () => {
    it('accepts name attribute', () => {
      render(<Select options={mockOptions} name="category" />)
      expect(screen.getByRole('combobox')).toHaveAttribute('name', 'category')
    })

    it('accepts required attribute', () => {
      render(<Select options={mockOptions} required />)
      expect(screen.getByRole('combobox')).toBeRequired()
    })

    it('accepts data attributes', () => {
      render(<Select options={mockOptions} data-testid="custom-select" />)
      expect(screen.getByTestId('custom-select')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Select options={mockOptions} aria-label="Select option" />)
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Select option')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to select element', () => {
      const ref = React.createRef<HTMLSelectElement>()
      render(<Select ref={ref} options={mockOptions} />)
      
      expect(ref.current).toBeInstanceOf(HTMLSelectElement)
      expect(ref.current?.tagName).toBe('SELECT')
    })

    it('can focus select via ref', () => {
      const ref = React.createRef<HTMLSelectElement>()
      render(<Select ref={ref} options={mockOptions} />)
      
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('is keyboard accessible', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')
      
      select.focus()
      expect(select).toHaveFocus()
    })

    it('shows error state to screen readers', () => {
      render(<Select options={mockOptions} error="Error" aria-invalid="true" />)
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Select
          label="Category"
          options={mockOptions}
          error="Please select a category"
          className="custom-class"
          value="option1"
        />
      )
      
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('option1')
      expect(screen.getByText('Please select a category')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveClass('custom-class')
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(Select.displayName).toBe('Select')
    })
  })
})

