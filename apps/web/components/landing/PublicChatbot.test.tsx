import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PublicChatbot } from './PublicChatbot'

// Mock B2B Button
jest.mock('@/components/b2b/Button', () => ({
  Button: ({ children, onClick, variant, size, icon, disabled, type, className, ...props }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return <a href={href} className={className}>{children}</a>
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock react-icons
jest.mock('react-icons/md', () => ({
  MdSend: () => <div data-testid="send-icon" />,
  MdClose: () => <div data-testid="close-icon" />,
}))

// Mock fetch
global.fetch = jest.fn()

describe('PublicChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'AI response' }),
    })
  })

  describe('Initial Rendering', () => {
    it('renders chatbot container', () => {
      render(<PublicChatbot />)

      expect(screen.getByText('Chat with us')).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<PublicChatbot />)

      expect(
        screen.getByText(/Have questions\? Our AI assistant can help!/)
      ).toBeInTheDocument()
    })

    it('renders empty state message', () => {
      render(<PublicChatbot />)

      expect(screen.getByText('Start a conversation by typing a message below')).toBeInTheDocument()
    })

    it('renders message input', () => {
      render(<PublicChatbot />)

      expect(screen.getByTestId('chatbot-input')).toBeInTheDocument()
    })

    it('renders send button', () => {
      render(<PublicChatbot />)

      expect(screen.getByTestId('chatbot-send')).toBeInTheDocument()
    })

    it('input has correct placeholder', () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      expect(input).toHaveAttribute('placeholder', 'Type your message...')
    })
  })

  describe('Sending Messages', () => {
    it('sends message when send button is clicked', async () => {
      render(<PublicChatbot />)

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
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('does not send message when Shift+Enter is pressed', () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('displays user message in chat', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })
    })

    it('displays AI response in chat', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument()
      })
    })

    it('clears input after sending', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('does not send empty messages', () => {
      render(<PublicChatbot />)

      const sendButton = screen.getByTestId('chatbot-send')
      fireEvent.click(sendButton)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not send whitespace-only messages', () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('hides empty state after first message', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.queryByText('Start a conversation by typing a message below')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator while waiting for response', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'AI response' }) }), 100))
      )

      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      // Loading dots should appear (motion.div with rounded-full class)
      await waitFor(() => {
        const dots = document.querySelectorAll('.rounded-full.bg-b2b-gray-400')
        expect(dots.length).toBeGreaterThan(0)
      })
    })

    it('disables input while loading', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'AI response' }) }), 100))
      )

      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(input).toBeDisabled()
      })
    })

    it('disables send button while loading', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'AI response' }) }), 100))
      )

      render(<PublicChatbot />)

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

      render(<PublicChatbot />)

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

      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
      })
    })
  })

  describe('Message Display', () => {
    it('displays user messages on the right', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        const userMessage = screen.getByText('Hello').closest('.flex')
        expect(userMessage).toHaveClass('justify-end')
      })
    })

    it('displays AI messages on the left', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        const aiMessage = screen.getByText('AI response').closest('.flex')
        expect(aiMessage).toHaveClass('justify-start')
      })
    })

    it('applies different styling to user and AI messages', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        const userMessage = screen.getByText('Hello').closest('.max-w-\\[80\\%\\]')
        const aiMessage = screen.getByText('AI response').closest('.max-w-\\[80\\%\\]')

        expect(userMessage).toHaveClass('bg-b2b-blue')
        expect(aiMessage).toHaveClass('bg-white')
      })
    })
  })

  describe('Lead Capture Form', () => {
    it('shows lead form after 5 messages', async () => {
      render(<PublicChatbot />)

      // Send 5 messages (10 total messages including responses)
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument()
      })
    })

    it('renders lead form fields', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Company Name')).toBeInTheDocument()
      })
    })

    it('can fill out lead form', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Your Name') as HTMLInputElement
        const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement
        const companyInput = screen.getByPlaceholderText('Company Name') as HTMLInputElement

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })

        expect(nameInput.value).toBe('John Doe')
        expect(emailInput.value).toBe('john@example.com')
        expect(companyInput.value).toBe('Acme Corp')
      })
    })

    it('can close lead form', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(() => {
        const closeButton = screen.getByTestId('close-icon').parentElement!
        fireEvent.click(closeButton)

        expect(screen.queryByPlaceholderText('Your Name')).not.toBeInTheDocument()
      })
    })

    it('submits lead information', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByPlaceholderText('Your Name')
        const emailInput = screen.getByPlaceholderText('Email')
        const companyInput = screen.getByPlaceholderText('Company Name')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })

        const submitButton = screen.getByRole('button', { name: 'Continue' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/leads',
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('John Doe'),
            })
          )
        })
      })
    })

    it('hides lead form after submission', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByPlaceholderText('Your Name')
        const emailInput = screen.getByPlaceholderText('Email')
        const companyInput = screen.getByPlaceholderText('Company Name')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })

        const submitButton = screen.getByRole('button', { name: 'Continue' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Your Name')).not.toBeInTheDocument()
        })
      })
    })

    it('shows thank you message after lead submission', async () => {
      render(<PublicChatbot />)

      // Send 5 messages to trigger lead form
      for (let i = 0; i < 5; i++) {
        const input = screen.getByTestId('chatbot-input')
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(screen.getByTestId('chatbot-send'))
        await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      }

      await waitFor(async () => {
        const nameInput = screen.getByPlaceholderText('Your Name')
        const emailInput = screen.getByPlaceholderText('Email')
        const companyInput = screen.getByPlaceholderText('Company Name')

        fireEvent.change(nameInput, { target: { value: 'John Doe' } })
        fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
        fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })

        const submitButton = screen.getByRole('button', { name: 'Continue' })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/Thank you, John Doe!/)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Sign-in CTA', () => {
    it('shows sign-in CTA after first message', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        expect(screen.getByText(/Want to place orders, track shipments/)).toBeInTheDocument()
      })
    })

    it('renders sign-in link', async () => {
      render(<PublicChatbot />)

      const input = screen.getByTestId('chatbot-input')
      fireEvent.change(input, { target: { value: 'Hello' } })
      fireEvent.click(screen.getByTestId('chatbot-send'))

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Sign in for full access/ })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/auth/login')
      })
    })
  })
})

