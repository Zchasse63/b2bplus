import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  describe('Rendering', () => {
    it('renders avatar with image', () => {
      render(<Avatar src="https://example.com/avatar.jpg" alt="User" />)
      const img = screen.getByRole('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    it('renders avatar with fallback text', () => {
      render(<Avatar fallback="John Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('renders avatar with alt text as fallback', () => {
      render(<Avatar alt="Jane Smith" />)
      expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('renders question mark when no fallback provided', () => {
      render(<Avatar />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('renders extra small size', () => {
      const { container } = render(<Avatar size="xs" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('w-6')
      expect(avatar).toHaveClass('h-6')
      expect(avatar).toHaveClass('text-xs')
    })

    it('renders small size', () => {
      const { container } = render(<Avatar size="sm" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('w-8')
      expect(avatar).toHaveClass('h-8')
      expect(avatar).toHaveClass('text-sm')
    })

    it('renders medium size by default', () => {
      const { container } = render(<Avatar fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('w-10')
      expect(avatar).toHaveClass('h-10')
      expect(avatar).toHaveClass('text-base')
    })

    it('renders large size', () => {
      const { container } = render(<Avatar size="lg" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('w-12')
      expect(avatar).toHaveClass('h-12')
      expect(avatar).toHaveClass('text-lg')
    })

    it('renders extra large size', () => {
      const { container } = render(<Avatar size="xl" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('w-16')
      expect(avatar).toHaveClass('h-16')
      expect(avatar).toHaveClass('text-xl')
    })
  })

  describe('Initials Generation', () => {
    it('generates initials from two-word name', () => {
      render(<Avatar fallback="John Doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('generates initials from single word', () => {
      render(<Avatar fallback="John" />)
      expect(screen.getByText('JO')).toBeInTheDocument()
    })

    it('generates initials from three-word name', () => {
      render(<Avatar fallback="John Michael Doe" />)
      expect(screen.getByText('JM')).toBeInTheDocument()
    })

    it('converts initials to uppercase', () => {
      render(<Avatar fallback="john doe" />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('handles whitespace in fallback text', () => {
      render(<Avatar fallback="  John   Doe  " />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Image Error Handling', () => {
    it('shows fallback when image fails to load', () => {
      render(<Avatar src="https://invalid.url/image.jpg" fallback="JD" />)
      const img = screen.getByRole('img')
      
      fireEvent.error(img)
      
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('shows fallback when src is not provided', () => {
      render(<Avatar fallback="AB" />)
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByText('AB')).toBeInTheDocument()
    })
  })

  describe('Base Styles', () => {
    it('always has rounded-full class', () => {
      const { container } = render(<Avatar fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('rounded-full')
    })

    it('always has inline-flex display', () => {
      const { container } = render(<Avatar fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('inline-flex')
    })

    it('always has items-center and justify-center', () => {
      const { container } = render(<Avatar fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('items-center')
      expect(avatar).toHaveClass('justify-center')
    })

    it('always has overflow-hidden', () => {
      const { container } = render(<Avatar fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('overflow-hidden')
    })
  })

  describe('HTML Attributes', () => {
    it('accepts custom className', () => {
      const { container } = render(<Avatar className="custom-class" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveClass('custom-class')
    })

    it('accepts data attributes', () => {
      render(<Avatar data-testid="custom-avatar" fallback="AB" />)
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument()
    })

    it('accepts aria attributes', () => {
      const { container } = render(<Avatar aria-label="User avatar" fallback="AB" />)
      const avatar = container.firstChild
      expect(avatar).toHaveAttribute('aria-label', 'User avatar')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Avatar ref={ref} fallback="AB" />)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.tagName).toBe('DIV')
    })
  })

  describe('Image Styling', () => {
    it('applies correct image styling', () => {
      render(<Avatar src="https://example.com/avatar.jpg" />)
      const img = screen.getByRole('img')
      expect(img).toHaveClass('w-full')
      expect(img).toHaveClass('h-full')
      expect(img).toHaveClass('object-cover')
    })
  })

  describe('Combined Props', () => {
    it('renders with multiple props combined', () => {
      render(
        <Avatar
          src="https://example.com/avatar.jpg"
          alt="John Doe"
          fallback="JD"
          size="lg"
          className="custom-class"
          data-testid="complex-avatar"
        />
      )
      
      const avatar = screen.getByTestId('complex-avatar')
      expect(avatar).toHaveClass('w-12')
      expect(avatar).toHaveClass('custom-class')
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct alt text for image', () => {
      render(<Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />)
      expect(screen.getByAltText('User Avatar')).toBeInTheDocument()
    })

    it('uses alt text as fallback when image fails', () => {
      render(<Avatar src="https://invalid.url/image.jpg" alt="John Doe" />)
      const img = screen.getByRole('img')
      fireEvent.error(img)
      
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })
})

