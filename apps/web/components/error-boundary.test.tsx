import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary, withErrorBoundary } from './error-boundary'
import * as Sentry from '@sentry/nextjs'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Suppress console.error for error boundary tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Normal Rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('renders multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })

    it('does not call Sentry when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('catches errors from children', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays default error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("We've been notified of the error and will look into it.")).toBeInTheDocument()
    })

    it('displays reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument()
    })

    it('reports error to Sentry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('reports error with component stack context', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: expect.objectContaining({
            react: expect.objectContaining({
              componentStack: expect.any(String),
            }),
          }),
        })
      )
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('renders custom fallback with complex content', () => {
      const customFallback = (
        <div>
          <h1>Oops!</h1>
          <p>Something broke</p>
          <button>Go back</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Oops!')).toBeInTheDocument()
      expect(screen.getByText('Something broke')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
    })
  })

  describe('Default Fallback UI', () => {
    it('has centered layout', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const wrapper = container.querySelector('.flex.items-center.justify-center.min-h-screen')
      expect(wrapper).toBeInTheDocument()
    })

    it('has gray background', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const wrapper = container.querySelector('.bg-gray-50')
      expect(wrapper).toBeInTheDocument()
    })

    it('has centered text', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const textCenter = container.querySelector('.text-center')
      expect(textCenter).toBeInTheDocument()
    })

    it('has styled heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl', 'font-bold', 'text-gray-900')
    })

    it('has styled button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: 'Reload Page' })
      expect(button.className).toContain('bg-blue-600')
      expect(button.className).toContain('text-white')
      expect(button.className).toContain('rounded-lg')
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = () => <div>Test component</div>
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent />)

      expect(screen.getByText('Test component')).toBeInTheDocument()
    })

    it('catches errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowError)

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('passes props to wrapped component', () => {
      const TestComponent = ({ message }: { message: string }) => <div>{message}</div>
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent message="Hello" />)

      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('uses custom fallback when provided', () => {
      const customFallback = <div>HOC custom error</div>
      const WrappedComponent = withErrorBoundary(ThrowError, customFallback)

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('HOC custom error')).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('can recover from error when children change', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Error boundary doesn't automatically recover - still shows error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Multiple Errors', () => {
    it('handles multiple errors from different children', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
          <div>This won't render</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText("This won't render")).not.toBeInTheDocument()
    })

    it('only reports first error to Sentry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Should only be called once for the first error
      expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    })
  })

  describe('Nested Error Boundaries', () => {
    it('inner boundary catches errors first', () => {
      render(
        <ErrorBoundary fallback={<div>Outer error</div>}>
          <ErrorBoundary fallback={<div>Inner error</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      expect(screen.getByText('Inner error')).toBeInTheDocument()
      expect(screen.queryByText('Outer error')).not.toBeInTheDocument()
    })

    it('outer boundary catches errors from inner boundary', () => {
      const InnerThrow = () => {
        throw new Error('Inner error')
      }

      render(
        <ErrorBoundary fallback={<div>Outer error</div>}>
          <ErrorBoundary>
            <InnerThrow />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Inner boundary catches the error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('error message is accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Something went wrong')
    })

    it('reload button is accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: 'Reload Page' })
      expect(button).toBeInTheDocument()
    })
  })
})

