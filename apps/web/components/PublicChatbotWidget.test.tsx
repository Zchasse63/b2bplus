import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PublicChatbotWidget from './PublicChatbotWidget'

// Mock B2B components
jest.mock('@/components/b2b', () => ({
  Card: ({ children, padding, className }: any) => (
    <div className={className} data-padding={padding} data-testid="card">
      {children}
    </div>
  ),
  Button: ({ children, onClick, variant, size, fullWidth, icon, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-fullwidth={fullWidth?.toString()}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, type, ...props }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiMessageCircle: () => <div data-testid="message-icon" />,
  FiX: () => <div data-testid="close-icon" />,
  FiSend: () => <div data-testid="send-icon" />,
}))

// Mock animations
jest.mock('@/lib/animations', () => ({
  fadeIn: {},
  slideUp: {},
  fast: {},
}))

// Mock fetch
global.fetch = jest.fn()

describe('PublicChatbotWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI response' }),
    })
  })

  describe('Initial Rendering', () => {
    it('renders chat button when closed', () => {
      render(<PublicChatbotWidget />)

      expect(screen.getByTestId('chatbot-button')).toBeInTheDocument()
    })

    it('chat button has correct text', () => {
      render(<PublicChatbotWidget />)

      expect(screen.getByText('Chat with us')).toBeInTheDocument()
    })

    it('does not render chat window initially', () => {
      render(<PublicChatbotWidget />)

      expect(screen.queryByTestId('chatbot-window')).not.toBeInTheDocument()
    })

    it('renders message icon in button', () => {
      render(<PublicChatbotWidget />)

      expect(screen.getByTestId('message-icon')).toBeInTheDocument()
    })
  })

  describe('Opening Chat Window', () => {
    it('opens chat window when button is clicked', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      expect(screen.getByTestId('chatbot-window')).toBeInTheDocument()
    })

    it('hides chat button when window is open', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      expect(screen.queryByTestId('chatbot-button')).not.toBeInTheDocument()
    })

    it('shows initial greeting message', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      expect(screen.getByText(/Hi! I'm your B2B\+ AI assistant/)).toBeInTheDocument()
    })

    it('renders chat input', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      expect(screen.getByTestId('chatbot-input')).toBeInTheDocument()
    })

    it('renders send button', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      expect(screen.getByTestId('chatbot-send')).toBeInTheDocument()
    })
  })

  describe('Closing Chat Window', () => {
    it('closes chat window when X button is clicked', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))
      expect(screen.getByTestId('chatbot-window')).toBeInTheDocument()

      const closeButton = screen.getByTestId('close-icon').parentElement!
      fireEvent.click(closeButton)

      expect(screen.queryByTestId('chatbot-window')).not.toBeInTheDocument()
    })

    it('shows chat button again after closing', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))
      const closeButton = screen.getByTestId('close-icon').parentElement!
      fireEvent.click(closeButton)

      expect(screen.getByTestId('chatbot-button')).toBeInTheDocument()
    })
  })

  describe('Sending Messages', () => {
    it('sends message when send button is clicked', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })

      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chatbot/public',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('sends message when Enter key is pressed', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('displays user message in chat', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })
    })

    it('displays AI response in chat', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument()
      })
    })

    it('clears input after sending', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('does not send empty messages', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const sendButton = screen.getByTestId('chatbot-send')
      fireEvent.click(sendButton)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not send whitespace-only messages', () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator while waiting for response', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ response: 'AI response' }) }), 100))
      )

      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      // Loading dots should appear
      await waitFor(() => {
        const dots = document.querySelectorAll('.animate-bounce')
        expect(dots.length).toBeGreaterThan(0)
      })
    })

    it('disables input while loading', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ response: 'AI response' }) }), 100))
      )

      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(input).toBeDisabled()
      })
    })

    it('disables send button while loading', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ response: 'AI response' }) }), 100))
      )

      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })

      const sendButton = screen.getByTestId('chatbot-send')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(sendButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
      })
    })

    it('displays error message when response is not ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
      })
    })
  })

  describe('Lead Capture Form', () => {
    it('shows lead form after 3 user messages', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        expect(screen.getByTestId('lead-name')).toBeInTheDocument()
      })
    })

    it('renders lead form fields', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        expect(screen.getByTestId('lead-name')).toBeInTheDocument()
        expect(screen.getByTestId('lead-email')).toBeInTheDocument()
        expect(screen.getByTestId('lead-company')).toBeInTheDocument()
      })
    })

    it('can fill out lead form', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        const nameInput = screen.getByTestId('lead-name') as HTMLInputElement
        const emailInput = screen.getByTestId('lead-email') as HTMLInputElement
        const companyInput = screen.getByTestId('lead-company') as HTMLInputElement

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })

        expect(nameInput.value).toBe('John Doe')
        expect(emailInput.value).toBe('john@example.com')
        expect(companyInput.value).toBe('Acme Corp')
      })
    })

    it('can skip lead form', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        const skipButton = screen.getByRole('button', { name: 'Skip' })
        fireEvent.click(skipButton)

        expect(screen.queryByTestId('lead-name')).not.toBeInTheDocument()
      })
    })

    it('submits lead information', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByTestId('lead-name')
        const emailInput = screen.getByTestId('lead-email')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })

        const submitButton = screen.getByRole('button', { name: 'Submit' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/chatbot/public',
            expect.objectContaining({
              body: expect.stringContaining('capture_lead'),
            })
          )
        })
      })
    })

    it('hides lead form after submission', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByTestId('lead-name')
        const emailInput = screen.getByTestId('lead-email')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })

        const submitButton = screen.getByRole('button', { name: 'Submit' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(screen.queryByTestId('lead-name')).not.toBeInTheDocument()
        })
      })
    })

    it('shows confirmation message after lead submission', async () => {
      render(<PublicChatbotWidget />)

      fireEvent.click(screen.getByTestId('chatbot-button'))

      // Send 3 messages to trigger lead form
      for (let i = 0; i < 3; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByTestId('lead-name')
        const emailInput = screen.getByTestId('lead-email')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })

        const submitButton = screen.getByRole('button', { name: 'Submit' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/Thanks John Doe!/)).toBeInTheDocument()
        })
      })
    })
  })
})

