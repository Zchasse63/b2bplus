import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CopyButton from './CopyButton'

// Mock B2B components
jest.mock('@/components/b2b', () => ({
  Button: ({ children, onClick, variant, size, className, title }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      title={title}
    >
      {children}
    </button>
  ),
}))

// Mock react-icons
jest.mock('react-icons/md', () => ({
  MdContentCopy: () => <div data-testid="icon-copy" />,
  MdCheck: () => <div data-testid="icon-check" />,
}))

// Mock useToast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

describe('CopyButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('renders copy button', () => {
      render(<CopyButton text="Hello World" />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('displays copy icon initially', () => {
      render(<CopyButton text="Hello World" />)

      expect(screen.getByTestId('icon-copy')).toBeInTheDocument()
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument()
    })

    it('displays "Copy" text initially', () => {
      render(<CopyButton text="Hello World" />)

      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    it('applies default variant (ghost)', () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
    })

    it('applies default size (sm)', () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'sm')
    })

    it('applies custom className', () => {
      render(<CopyButton text="Hello World" className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('sets title attribute with default label', () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Copy text')
    })

    it('sets title attribute with custom label', () => {
      render(<CopyButton text="Hello World" label="API Key" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Copy API Key')
    })
  })

  describe('Copy Functionality', () => {
    it('copies text to clipboard when clicked', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello World')
      })
    })

    it('shows success toast after copying', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied!',
          description: 'Text copied to clipboard',
        })
      })
    })

    it('shows success toast with custom label', async () => {
      render(<CopyButton text="abc123" label="Order ID" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied!',
          description: 'Order ID copied to clipboard',
        })
      })
    })

    it('changes icon to check mark after copying', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('icon-check')).toBeInTheDocument()
        expect(screen.queryByTestId('icon-copy')).not.toBeInTheDocument()
      })
    })

    it('changes text to "Copied!" after copying', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
        expect(screen.queryByText('Copy')).not.toBeInTheDocument()
      })
    })

    it('resets to copy icon after 2 seconds', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('icon-check')).toBeInTheDocument()
      })

      // Advance timer by 2 seconds
      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.getByTestId('icon-copy')).toBeInTheDocument()
        expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument()
      })
    })

    it('resets to "Copy" text after 2 seconds', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })

      // Advance timer by 2 seconds
      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument()
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when clipboard write fails', async () => {
      // Mock clipboard failure
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      })

      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        })
      })
    })

    it('does not change icon when copy fails', async () => {
      // Mock clipboard failure
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      })

      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      // Should still show copy icon
      expect(screen.getByTestId('icon-copy')).toBeInTheDocument()
      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument()
    })
  })

  describe('Variant and Size Props', () => {
    it('applies primary variant', () => {
      render(<CopyButton text="Hello World" variant="primary" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'primary')
    })

    it('applies secondary variant', () => {
      render(<CopyButton text="Hello World" variant="secondary" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'secondary')
    })

    it('applies outline variant', () => {
      render(<CopyButton text="Hello World" variant="outline" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
    })

    it('applies medium size', () => {
      render(<CopyButton text="Hello World" size="md" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'md')
    })

    it('applies large size', () => {
      render(<CopyButton text="Hello World" size="lg" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('Multiple Copies', () => {
    it('handles multiple copy operations', async () => {
      render(<CopyButton text="Hello World" />)

      const button = screen.getByRole('button')

      // First copy
      fireEvent.click(button)
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })

      // Reset
      jest.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument()
      })

      // Second copy
      fireEvent.click(button)
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
    })

    it('copies different text values', async () => {
      const { rerender } = render(<CopyButton text="First" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('First')
      })

      // Change text prop
      rerender(<CopyButton text="Second" />)

      jest.advanceTimersByTime(2000)

      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Second')
      })
    })
  })

  describe('Use Cases', () => {
    it('copies API key', async () => {
      render(<CopyButton text="sk_test_abc123" label="API Key" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('sk_test_abc123')
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied!',
          description: 'API Key copied to clipboard',
        })
      })
    })

    it('copies order number', async () => {
      render(<CopyButton text="ORD-12345" label="Order Number" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ORD-12345')
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied!',
          description: 'Order Number copied to clipboard',
        })
      })
    })

    it('copies URL', async () => {
      render(<CopyButton text="https://example.com/product/123" label="Product Link" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/product/123'
        )
      })
    })
  })
})

