import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return <a href={href} className={className}>{children}</a>
  }
})

describe('Breadcrumbs', () => {
  const mockItems: BreadcrumbItem[] = [
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics' },
    { label: 'Laptops', href: '/products/electronics/laptops' },
  ]

  describe('Initial Rendering', () => {
    it('renders breadcrumbs navigation', () => {
      render(<Breadcrumbs items={mockItems} />)

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).toBeInTheDocument()
    })

    it('renders home icon link', () => {
      render(<Breadcrumbs items={mockItems} />)

      const homeLink = screen.getByRole('link', { name: '' })
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('renders all breadcrumb items', () => {
      render(<Breadcrumbs items={mockItems} />)

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<Breadcrumbs items={mockItems} className="custom-class" />)

      const nav = container.querySelector('.custom-class')
      expect(nav).toBeInTheDocument()
    })

    it('renders with empty items array', () => {
      render(<Breadcrumbs items={[]} />)

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Breadcrumb Links', () => {
    it('renders intermediate items as links', () => {
      render(<Breadcrumbs items={mockItems} />)

      const productsLink = screen.getByRole('link', { name: 'Products' })
      expect(productsLink).toHaveAttribute('href', '/products')

      const electronicsLink = screen.getByRole('link', { name: 'Electronics' })
      expect(electronicsLink).toHaveAttribute('href', '/products/electronics')
    })

    it('renders last item as plain text (not a link)', () => {
      render(<Breadcrumbs items={mockItems} />)

      const laptopsText = screen.getByText('Laptops')
      expect(laptopsText.tagName).toBe('SPAN')
      expect(laptopsText).not.toHaveAttribute('href')
    })

    it('renders single item as plain text', () => {
      const singleItem: BreadcrumbItem[] = [{ label: 'Products', href: '/products' }]
      render(<Breadcrumbs items={singleItem} />)

      const productsText = screen.getByText('Products')
      expect(productsText.tagName).toBe('SPAN')
    })

    it('renders correct href for each link', () => {
      render(<Breadcrumbs items={mockItems} />)

      const productsLink = screen.getByRole('link', { name: 'Products' })
      expect(productsLink).toHaveAttribute('href', '/products')

      const electronicsLink = screen.getByRole('link', { name: 'Electronics' })
      expect(electronicsLink).toHaveAttribute('href', '/products/electronics')
    })
  })

  describe('Separators', () => {
    it('renders separators between items', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />)

      // Count SVG separators (chevrons)
      const separators = container.querySelectorAll('svg')
      // Should have 1 home icon + 3 separators (one before each breadcrumb item)
      expect(separators.length).toBe(4)
    })

    it('does not render separator after last item', () => {
      render(<Breadcrumbs items={mockItems} />)

      const listItems = screen.getAllByRole('listitem')
      // Should have 4 items: home + 3 breadcrumb items
      expect(listItems.length).toBe(4)
    })
  })

  describe('Styling', () => {
    it('applies hover styles to links', () => {
      render(<Breadcrumbs items={mockItems} />)

      const productsLink = screen.getByRole('link', { name: 'Products' })
      expect(productsLink.className).toContain('hover:text-b2b-blue')
    })

    it('applies different styling to last item', () => {
      render(<Breadcrumbs items={mockItems} />)

      const laptopsText = screen.getByText('Laptops')
      expect(laptopsText.className).toContain('text-b2b-text')
    })

    it('applies gray color to intermediate links', () => {
      render(<Breadcrumbs items={mockItems} />)

      const productsLink = screen.getByRole('link', { name: 'Products' })
      expect(productsLink.className).toContain('text-b2b-gray-500')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA label', () => {
      render(<Breadcrumbs items={mockItems} />)

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
    })

    it('uses semantic HTML with nav and ol elements', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />)

      const nav = container.querySelector('nav')
      const ol = container.querySelector('ol')

      expect(nav).toBeInTheDocument()
      expect(ol).toBeInTheDocument()
    })

    it('renders list items for each breadcrumb', () => {
      render(<Breadcrumbs items={mockItems} />)

      const listItems = screen.getAllByRole('listitem')
      // Home + 3 breadcrumb items
      expect(listItems.length).toBe(4)
    })
  })

  describe('Edge Cases', () => {
    it('handles very long breadcrumb trails', () => {
      const longItems: BreadcrumbItem[] = [
        { label: 'Level 1', href: '/1' },
        { label: 'Level 2', href: '/1/2' },
        { label: 'Level 3', href: '/1/2/3' },
        { label: 'Level 4', href: '/1/2/3/4' },
        { label: 'Level 5', href: '/1/2/3/4/5' },
        { label: 'Level 6', href: '/1/2/3/4/5/6' },
      ]

      render(<Breadcrumbs items={longItems} />)

      expect(screen.getByText('Level 1')).toBeInTheDocument()
      expect(screen.getByText('Level 6')).toBeInTheDocument()
    })

    it('handles special characters in labels', () => {
      const specialItems: BreadcrumbItem[] = [
        { label: 'Products & Services', href: '/products' },
        { label: 'Electronics > Computers', href: '/electronics' },
      ]

      render(<Breadcrumbs items={specialItems} />)

      expect(screen.getByText('Products & Services')).toBeInTheDocument()
      expect(screen.getByText('Electronics > Computers')).toBeInTheDocument()
    })

    it('handles very long labels', () => {
      const longLabelItems: BreadcrumbItem[] = [
        {
          label: 'This is a very long breadcrumb label that might need truncation',
          href: '/long',
        },
      ]

      render(<Breadcrumbs items={longLabelItems} />)

      expect(
        screen.getByText('This is a very long breadcrumb label that might need truncation')
      ).toBeInTheDocument()
    })

    it('handles URLs with query parameters', () => {
      const queryItems: BreadcrumbItem[] = [
        { label: 'Products', href: '/products' },
        { label: 'Search Results', href: '/search?q=laptop&sort=price' },
      ]

      render(<Breadcrumbs items={queryItems} />)

      const link = screen.getByRole('link', { name: 'Products' })
      expect(link).toHaveAttribute('href', '/products')

      // Last item is plain text
      expect(screen.getByText('Search Results')).toBeInTheDocument()
    })

    it('handles URLs with hash fragments', () => {
      const hashItems: BreadcrumbItem[] = [
        { label: 'Docs', href: '/docs' },
        { label: 'Documentation', href: '/docs#getting-started' },
      ]

      render(<Breadcrumbs items={hashItems} />)

      const link = screen.getByRole('link', { name: 'Docs' })
      expect(link).toHaveAttribute('href', '/docs')

      // Last item is plain text
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })
  })
})

