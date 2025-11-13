import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Textarea } from './Textarea'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    p: ({ children, variants, initial, animate, exit, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Textarea', () => {
  describe('Rendering', () => {
    it('renders textarea element', () => {
      render(<Textarea />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with label', () => {
      render(<Textarea label="Comments" />)
      expect(screen.getByText('Comments')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders without label', () => {
      render(<Textarea />)
      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Textarea className="custom-class" />)
      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })
  })

  describe('Placeholder', () => {
    it('renders with placeholder', () => {
      render(<Textarea placeholder="Enter your message" />)
      expect(screen.getByPlaceholderText('Enter your message')).toBeInTheDocument()
    })

    it('placeholder has correct styling', () => {
      render(<Textarea placeholder="Placeholder" />)
      const textarea = screen.getByPlaceholderText('Placeholder')
      expect(textarea).toHaveClass('placeholder:text-b2b-gray-500')
    })
  })

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Textarea error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styling to textarea', () => {
      render(<Textarea error="Error" />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('border-red-500')
      expect(textarea).toHaveClass('focus:ring-red-500')
    })

    it('error message has correct styling', () => {
      render(<Textarea error="Error message" />)
      const error = screen.getByText('Error message')
      expect(error).toHaveClass('text-red-500')
      expect(error).toHaveClass('text-sm')
    })

    it('does not show error when error prop is not provided', () => {
      render(<Textarea />)
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<Textarea disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('applies disabled styling', () => {
      render(<Textarea disabled />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('disabled:bg-b2b-gray-50')
      expect(textarea).toHaveClass('disabled:cursor-not-allowed')
      expect(textarea).toHaveClass('disabled:text-b2b-gray-500')
    })
  })

  describe('Value and onChange', () => {
    it('accepts value prop', () => {
      render(<Textarea value="test value" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('test value')
    })

    it('calls onChange when value changes', () => {
      const handleChange = jest.fn()
      render(<Textarea onChange={handleChange} />)
      
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'new value' } })
      
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('updates value on change', () => {
      const { rerender } = render(<Textarea value="" onChange={() => {}} />)
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      
      rerender(<Textarea value="updated" onChange={() => {}} />)
      expect(textarea.value).toBe('updated')
    })
  })

  describe('Focus State', () => {
    it('can be focused', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      
      textarea.focus()
      expect(textarea).toHaveFocus()
    })

    it('applies focus styling', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('focus:outline-none')
      expect(textarea).toHaveClass('focus:ring-2')
      expect(textarea).toHaveClass('focus:ring-b2b-yellow')
    })

    it('calls onFocus when focused', () => {
      const handleFocus = jest.fn()
      render(<Textarea onFocus={handleFocus} />)
      
      fireEvent.focus(screen.getByRole('textbox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur when blurred', () => {
      const handleBlur = jest.fn()
      render(<Textarea onBlur={handleBlur} />)
      
      const textarea = screen.getByRole('textbox')
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)
      
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('Resize Behavior', () => {
    it('has resize-vertical class', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('resize-vertical')
    })
  })

  describe('HTML Attributes', () => {
    it('accepts name attribute', () => {
      render(<Textarea name="comments" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'comments')
    })

    it('accepts required attribute', () => {
      render(<Textarea required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('accepts rows attribute', () => {
      render(<Textarea rows={5} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5')
    })

    it('accepts cols attribute', () => {
      render(<Textarea cols={40} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('cols', '40')
    })

    it('accepts maxLength attribute', () => {
      render(<Textarea maxLength={500} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500')
    })

    it('accepts data attributes', () => {
      render(<Textarea data-testid="custom-textarea" />)
      expect(screen.getByTestId('custom-textarea')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      render(<Textarea aria-label="Message textarea" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Message textarea')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to textarea element', () => {
      const ref = React.createRef<HTMLTextAreaElement>()
      render(<Textarea ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
      expect(ref.current?.tagName).toBe('TEXTAREA')
    })

    it('can focus textarea via ref', () => {
      const ref = React.createRef<HTMLTextAreaElement>()
      render(<Textarea ref={ref} />)
      
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('is keyboard accessible', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      
      textarea.focus()
      expect(textarea).toHaveFocus()
    })

    it('shows error state to screen readers', () => {
      render(<Textarea error="Error message" aria-invalid="true" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Textarea
          label="Message"
          placeholder="Enter your message"
          error="This field is required"
          className="custom-class"
          rows={4}
        />
      )
      
      expect(screen.getByText('Message')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your message')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
    })
  })
})

