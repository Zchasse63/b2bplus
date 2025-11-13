import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Footer from './Footer'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return <a href={href} className={className}>{children}</a>
  }
})

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Package: (props: any) => <div data-testid="package-icon" {...props} />,
}))

describe('Footer', () => {
  describe('Initial Rendering', () => {
    it('renders footer element', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('renders brand section with logo', () => {
      render(<Footer />)

      expect(screen.getByTestId('package-icon')).toBeInTheDocument()
      expect(screen.getByText('B2B+')).toBeInTheDocument()
    })

    it('renders brand description', () => {
      render(<Footer />)

      expect(
        screen.getByText('Food service disposables ordering platform with container optimization')
      ).toBeInTheDocument()
    })

    it('renders current year in copyright', () => {
      render(<Footer />)

      const currentYear = new Date().getFullYear()
      expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument()
    })

    it('renders copyright text', () => {
      render(<Footer />)

      expect(screen.getByText(/B2B\+ Platform\. All rights reserved\./)).toBeInTheDocument()
    })
  })

  describe('Products Section', () => {
    it('renders Products heading', () => {
      render(<Footer />)

      expect(screen.getByText('Products')).toBeInTheDocument()
    })

    it('renders Browse Catalog link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Browse Catalog' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/products')
    })

    it('renders Categories link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Categories' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/products')
    })

    it('renders New Arrivals link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'New Arrivals' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/products')
    })
  })

  describe('Company Section', () => {
    it('renders Company heading', () => {
      render(<Footer />)

      expect(screen.getByText('Company')).toBeInTheDocument()
    })

    it('renders About Us link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'About Us' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('renders Contact link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Contact' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('renders Support link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Support' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })
  })

  describe('Legal Section', () => {
    it('renders Legal heading', () => {
      render(<Footer />)

      expect(screen.getByText('Legal')).toBeInTheDocument()
    })

    it('renders Privacy Policy link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Privacy Policy' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('renders Terms of Service link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Terms of Service' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('renders Cookie Policy link', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Cookie Policy' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })
  })

  describe('Layout', () => {
    it('uses grid layout for sections', () => {
      const { container } = render(<Footer />)

      const grid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-4')
      expect(grid).toBeInTheDocument()
    })

    it('has border-top styling', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toHaveClass('border-t')
    })

    it('has background styling', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toHaveClass('bg-background')
    })

    it('has container with padding', () => {
      const { container } = render(<Footer />)

      const containerDiv = container.querySelector('.container.py-8')
      expect(containerDiv).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies hover styles to links', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Browse Catalog' })
      expect(link.className).toContain('hover:text-primary')
    })

    it('applies transition to links', () => {
      render(<Footer />)

      const link = screen.getByRole('link', { name: 'Browse Catalog' })
      expect(link.className).toContain('transition-colors')
    })

    it('applies text color to link list', () => {
      const { container } = render(<Footer />)

      // The text-muted-foreground class is on the <ul> element
      const linkList = container.querySelector('.text-muted-foreground')
      expect(linkList).toBeInTheDocument()
    })

    it('applies font styling to brand name', () => {
      render(<Footer />)

      const brandName = screen.getByText('B2B+')
      expect(brandName).toHaveClass('font-bold', 'text-xl')
    })

    it('applies font styling to section headings', () => {
      render(<Footer />)

      const heading = screen.getByText('Products')
      expect(heading.tagName).toBe('H3')
      expect(heading).toHaveClass('font-semibold')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic footer element', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('uses semantic heading elements', () => {
      render(<Footer />)

      const headings = screen.getAllByRole('heading', { level: 3 })
      expect(headings.length).toBe(3) // Products, Company, Legal
    })

    it('all links are accessible', () => {
      render(<Footer />)

      const links = screen.getAllByRole('link')
      // Should have multiple links (products, company, legal sections)
      expect(links.length).toBeGreaterThan(5)
    })

    it('links have descriptive text', () => {
      render(<Footer />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link.textContent).toBeTruthy()
        expect(link.textContent!.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Design', () => {
    it('has responsive grid classes', () => {
      const { container } = render(<Footer />)

      const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-4')
      expect(grid).toBeInTheDocument()
    })

    it('has responsive gap spacing', () => {
      const { container } = render(<Footer />)

      const grid = container.querySelector('.gap-8')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Content Structure', () => {
    it('has 4 main sections', () => {
      const { container } = render(<Footer />)

      const sections = container.querySelectorAll('.space-y-3')
      expect(sections.length).toBe(4) // Brand, Products, Company, Legal
    })

    it('has copyright section separated by border', () => {
      const { container } = render(<Footer />)

      const copyrightSection = container.querySelector('.mt-8.pt-8.border-t')
      expect(copyrightSection).toBeInTheDocument()
    })

    it('centers copyright text', () => {
      const { container } = render(<Footer />)

      const copyrightSection = container.querySelector('.text-center')
      expect(copyrightSection).toBeInTheDocument()
    })
  })

  describe('Dynamic Year', () => {
    it('updates year dynamically', () => {
      render(<Footer />)

      const currentYear = new Date().getFullYear()
      const copyrightText = screen.getByText(new RegExp(`${currentYear}`))
      expect(copyrightText).toBeInTheDocument()
    })

    it('year is part of copyright statement', () => {
      render(<Footer />)

      const currentYear = new Date().getFullYear()
      expect(screen.getByText(`© ${currentYear} B2B+ Platform. All rights reserved.`)).toBeInTheDocument()
    })
  })
})

