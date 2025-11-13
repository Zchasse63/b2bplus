import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  describe('Rendering', () => {
    it('renders with title', () => {
      render(<PageHeader title="Page Title" />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title')
    })

    it('renders with title and subtitle', () => {
      render(<PageHeader title="Title" subtitle="Subtitle" />)
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Subtitle')).toBeInTheDocument()
    })

    it('renders without subtitle', () => {
      render(<PageHeader title="Title" />)
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument()
    })

    it('renders with actions', () => {
      render(
        <PageHeader
          title="Title"
          actions={<button>Action</button>}
        />
      )
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })

  describe('Title Styling', () => {
    it('applies correct title styling', () => {
      render(<PageHeader title="Title" />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-2xl')
      expect(heading).toHaveClass('md:text-3xl')
      expect(heading).toHaveClass('font-bold')
      expect(heading).toHaveClass('text-b2b-text')
    })
  })

  describe('Subtitle Styling', () => {
    it('applies correct subtitle styling', () => {
      render(<PageHeader title="Title" subtitle="Subtitle" />)
      const subtitle = screen.getByText('Subtitle')
      expect(subtitle).toHaveClass('text-sm')
      expect(subtitle).toHaveClass('text-b2b-gray-500')
    })

    it('positions subtitle below title', () => {
      render(<PageHeader title="Title" subtitle="Subtitle" />)
      const title = screen.getByText('Title')
      const subtitle = screen.getByText('Subtitle')
      
      expect(title.parentElement).toContainElement(subtitle)
    })
  })

  describe('Actions', () => {
    it('renders single action', () => {
      render(
        <PageHeader
          title="Title"
          actions={<button>Save</button>}
        />
      )
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders multiple actions', () => {
      render(
        <PageHeader
          title="Title"
          actions={
            <>
              <button>Save</button>
              <button>Cancel</button>
            </>
          }
        />
      )
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('positions actions on the right', () => {
      const { container } = render(
        <PageHeader
          title="Title"
          actions={<button>Action</button>}
        />
      )
      const flexContainer = container.querySelector('[class*="flex"]')
      expect(flexContainer).toHaveClass('sm:justify-between')
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PageHeader title="Title" className="custom-class" />
      )
      const header = container.firstChild
      expect(header).toHaveClass('custom-class')
    })

    it('applies multiple classes', () => {
      const { container } = render(
        <PageHeader title="Title" className="class1 class2" />
      )
      const header = container.firstChild
      expect(header).toHaveClass('class1')
      expect(header).toHaveClass('class2')
    })
  })

  describe('Responsive Layout', () => {
    it('has responsive flex layout', () => {
      const { container } = render(
        <PageHeader title="Title" actions={<button>Action</button>} />
      )
      const flexContainer = container.querySelector('[class*="flex"]')
      expect(flexContainer).toHaveClass('flex-col')
      expect(flexContainer).toHaveClass('sm:flex-row')
      expect(flexContainer).toHaveClass('sm:items-center')
    })

    it('has responsive gap', () => {
      const { container } = render(
        <PageHeader title="Title" actions={<button>Action</button>} />
      )
      const flexContainer = container.querySelector('[class*="gap"]')
      expect(flexContainer).toHaveClass('gap-4')
    })
  })

  describe('Content Types', () => {
    it('renders text title', () => {
      render(<PageHeader title="Simple Title" />)
      expect(screen.getByText('Simple Title')).toBeInTheDocument()
    })

    it('renders long title', () => {
      const longTitle = 'This is a very long page title that might wrap to multiple lines'
      render(<PageHeader title={longTitle} />)
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('renders special characters in title', () => {
      render(<PageHeader title="Title & Subtitle (2024)" />)
      expect(screen.getByText('Title & Subtitle (2024)')).toBeInTheDocument()
    })

    it('renders JSX in subtitle', () => {
      render(
        <PageHeader
          title="Title"
          subtitle={<span>Subtitle with <strong>bold</strong></span>}
        />
      )
      expect(screen.getByText('bold')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('renders with all props combined', () => {
      render(
        <PageHeader
          title="Complex Header"
          subtitle="With subtitle"
          actions={
            <>
              <button>Save</button>
              <button>Delete</button>
            </>
          }
          className="custom-class"
        />
      )
      
      expect(screen.getByText('Complex Header')).toBeInTheDocument()
      expect(screen.getByText('With subtitle')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic heading', () => {
      render(<PageHeader title="Title" />)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('maintains button accessibility in actions', () => {
      render(
        <PageHeader
          title="Title"
          actions={<button aria-label="Save changes">Save</button>}
        />
      )
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Save changes')
    })

    it('supports keyboard navigation', () => {
      render(
        <PageHeader
          title="Title"
          actions={
            <>
              <button>Button 1</button>
              <button>Button 2</button>
            </>
          }
        />
      )
      
      const button1 = screen.getByRole('button', { name: 'Button 1' })
      const button2 = screen.getByRole('button', { name: 'Button 2' })
      
      button1.focus()
      expect(button1).toHaveFocus()
      
      button2.focus()
      expect(button2).toHaveFocus()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(PageHeader.displayName).toBe('PageHeader')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<PageHeader title="" />)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('handles very long subtitle', () => {
      const longSubtitle = 'This is a very long subtitle that contains a lot of text and might wrap to multiple lines in the UI'
      render(<PageHeader title="Title" subtitle={longSubtitle} />)
      expect(screen.getByText(longSubtitle)).toBeInTheDocument()
    })
  })
})

