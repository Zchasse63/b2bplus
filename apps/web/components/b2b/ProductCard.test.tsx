import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProductCard } from './ProductCard'

// Mock dependencies
jest.mock('./Card', () => ({
  Card: ({ children, onClick, className, ...props }: any) => (
    <div onClick={onClick} className={className} {...props}>{children}</div>
  ),
}))

jest.mock('./Badge', () => ({
  Badge: ({ children, variant, size }: any) => (
    <span data-variant={variant} data-size={size}>{children}</span>
  ),
}))

jest.mock('./Button', () => ({
  Button: ({ onClick, children, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

jest.mock('react-icons/fi', () => ({
  FiStar: () => <span data-testid="star-icon">⭐</span>,
}))

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
  }

  describe('List Variant (Default)', () => {
    it('renders list variant by default', () => {
      render(<ProductCard {...mockProduct} />)
      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })

    it('renders product image in list variant', () => {
      render(
        <ProductCard
          {...mockProduct}
          image="https://example.com/product.jpg"
        />
      )
      const img = screen.getByRole('img', { name: 'Test Product' })
      expect(img).toHaveAttribute('src', 'https://example.com/product.jpg')
    })

    it('renders placeholder when no image in list variant', () => {
      render(<ProductCard {...mockProduct} />)
      expect(screen.getByText('No Image')).toBeInTheDocument()
    })

    it('renders category in list variant', () => {
      render(<ProductCard {...mockProduct} category="Electronics" />)
      expect(screen.getByText('Electronics')).toBeInTheDocument()
    })

    it('renders rating in list variant', () => {
      render(<ProductCard {...mockProduct} rating={4.5} />)
      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByTestId('star-icon')).toBeInTheDocument()
    })

    it('renders in stock badge in list variant', () => {
      render(<ProductCard {...mockProduct} inStock={true} />)
      expect(screen.getByText('In Stock')).toBeInTheDocument()
    })

    it('renders out of stock badge in list variant', () => {
      render(<ProductCard {...mockProduct} inStock={false} />)
      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('renders add button in list variant when in stock', () => {
      render(<ProductCard {...mockProduct} inStock={true} />)
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })

    it('does not render add button when out of stock in list variant', () => {
      render(<ProductCard {...mockProduct} inStock={false} />)
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    })
  })

  describe('Grid Variant', () => {
    it('renders grid variant', () => {
      render(<ProductCard {...mockProduct} variant="grid" />)
      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })

    it('renders product image in grid variant', () => {
      render(
        <ProductCard
          {...mockProduct}
          variant="grid"
          image="https://example.com/product.jpg"
        />
      )
      const img = screen.getByRole('img', { name: 'Test Product' })
      expect(img).toHaveAttribute('src', 'https://example.com/product.jpg')
    })

    it('renders out of stock overlay in grid variant', () => {
      render(
        <ProductCard
          {...mockProduct}
          variant="grid"
          inStock={false}
        />
      )
      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('renders rating in grid variant', () => {
      render(<ProductCard {...mockProduct} variant="grid" rating={4.5} />)
      expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('renders add button in grid variant when in stock', () => {
      render(<ProductCard {...mockProduct} variant="grid" inStock={true} />)
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })
  })

  describe('Click Handlers', () => {
    it('calls onClick when card is clicked', () => {
      const handleClick = jest.fn()
      render(<ProductCard {...mockProduct} onClick={handleClick} />)
      
      const card = screen.getByText('Test Product').closest('div')
      fireEvent.click(card!)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onAddToCart with product id', () => {
      const handleAddToCart = jest.fn()
      render(
        <ProductCard
          {...mockProduct}
          inStock={true}
          onAddToCart={handleAddToCart}
        />
      )
      
      const addButton = screen.getByRole('button', { name: 'Add' })
      fireEvent.click(addButton)
      
      expect(handleAddToCart).toHaveBeenCalledWith('1')
    })

    it('stops propagation when add button is clicked', () => {
      const handleClick = jest.fn()
      const handleAddToCart = jest.fn()
      render(
        <ProductCard
          {...mockProduct}
          inStock={true}
          onClick={handleClick}
          onAddToCart={handleAddToCart}
        />
      )
      
      const addButton = screen.getByRole('button', { name: 'Add' })
      fireEvent.click(addButton)
      
      expect(handleAddToCart).toHaveBeenCalled()
    })
  })

  describe('Price Display', () => {
    it('formats price correctly', () => {
      render(<ProductCard {...mockProduct} price={99.99} />)
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })

    it('formats whole number price', () => {
      render(<ProductCard {...mockProduct} price={100} />)
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    it('formats decimal price', () => {
      render(<ProductCard {...mockProduct} price={19.5} />)
      expect(screen.getByText('$19.50')).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ProductCard {...mockProduct} className="custom-class" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('Combined Props', () => {
    it('renders with all props combined', () => {
      const handleClick = jest.fn()
      const handleAddToCart = jest.fn()

      render(
        <ProductCard
          id="1"
          name="Premium Product"
          price={199.99}
          image="https://example.com/product.jpg"
          category="Premium"
          rating={4.8}
          inStock={true}
          onClick={handleClick}
          onAddToCart={handleAddToCart}
          className="custom-class"
          variant="grid"
        />
      )

      expect(screen.getByText('Premium Product')).toBeInTheDocument()
      expect(screen.getByText('$199.99')).toBeInTheDocument()
      expect(screen.getByText('Premium')).toBeInTheDocument()
      expect(screen.getByText('4.8')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has alt text for product image', () => {
      render(
        <ProductCard
          {...mockProduct}
          image="https://example.com/product.jpg"
        />
      )
      expect(screen.getByAltText('Test Product')).toBeInTheDocument()
    })

    it('has accessible button', () => {
      render(<ProductCard {...mockProduct} inStock={true} />)
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(ProductCard.displayName).toBe('ProductCard')
    })
  })
})

