import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProductCardSkeleton from './ProductCardSkeleton'

// Mock B2B components
jest.mock('@/components/b2b', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('ProductCardSkeleton', () => {
  describe('Initial Rendering', () => {
    it('renders skeleton card', () => {
      const { getByTestId } = render(<ProductCardSkeleton />)

      expect(getByTestId('card')).toBeInTheDocument()
    })

    it('applies overflow-hidden class to card', () => {
      const { getByTestId } = render(<ProductCardSkeleton />)

      const card = getByTestId('card')
      expect(card).toHaveClass('overflow-hidden')
    })
  })

  describe('Skeleton Structure', () => {
    it('renders image skeleton', () => {
      const { container } = render(<ProductCardSkeleton />)

      const imageSkeleton = container.querySelector('.h-48.w-full.bg-b2b-gray-100.rounded-t-lg')
      expect(imageSkeleton).toBeInTheDocument()
    })

    it('renders content skeleton with padding', () => {
      const { container } = render(<ProductCardSkeleton />)

      const contentSkeleton = container.querySelector('.p-4.space-y-3')
      expect(contentSkeleton).toBeInTheDocument()
    })

    it('renders category and price skeleton', () => {
      const { container } = render(<ProductCardSkeleton />)

      const categoryPrice = container.querySelector('.flex.items-start.justify-between.gap-2')
      expect(categoryPrice).toBeInTheDocument()

      const category = container.querySelector('.h-5.w-20.bg-b2b-gray-100.rounded')
      const price = container.querySelector('.h-4.w-16.bg-b2b-gray-100.rounded')

      expect(category).toBeInTheDocument()
      expect(price).toBeInTheDocument()
    })

    it('renders title skeleton (2 lines)', () => {
      const { container } = render(<ProductCardSkeleton />)

      const titleLine1 = container.querySelector('.h-6.w-full.bg-b2b-gray-100.rounded')
      const titleLine2 = container.querySelector('.h-4.w-3\\/4.bg-b2b-gray-100.rounded')

      expect(titleLine1).toBeInTheDocument()
      expect(titleLine2).toBeInTheDocument()
    })

    it('renders price and stock skeleton', () => {
      const { container } = render(<ProductCardSkeleton />)

      const priceStock = container.querySelector('.flex.items-baseline.justify-between.pt-2')
      expect(priceStock).toBeInTheDocument()

      const price = container.querySelector('.h-8.w-24.bg-b2b-gray-100.rounded')
      expect(price).toBeInTheDocument()
    })

    it('renders additional info skeleton (2 lines)', () => {
      const { container } = render(<ProductCardSkeleton />)

      const additionalInfo = container.querySelector('.space-y-1')
      expect(additionalInfo).toBeInTheDocument()

      const info1 = container.querySelector('.h-3.w-32.bg-b2b-gray-100.rounded')
      const info2 = container.querySelector('.h-3.w-28.bg-b2b-gray-100.rounded')

      expect(info1).toBeInTheDocument()
      expect(info2).toBeInTheDocument()
    })

    it('renders button skeletons', () => {
      const { container } = render(<ProductCardSkeleton />)

      const buttons = container.querySelector('.flex.gap-2.pt-2')
      expect(buttons).toBeInTheDocument()

      const button1 = container.querySelector('.h-10.w-20.bg-b2b-gray-100.rounded')
      const button2 = container.querySelector('.h-10.flex-1.bg-b2b-gray-100.rounded')

      expect(button1).toBeInTheDocument()
      expect(button2).toBeInTheDocument()
    })
  })

  describe('Skeleton Styling', () => {
    it('applies gray background to all skeleton elements', () => {
      const { container } = render(<ProductCardSkeleton />)

      const skeletonElements = container.querySelectorAll('.bg-b2b-gray-100')
      // Should have multiple skeleton elements
      expect(skeletonElements.length).toBeGreaterThan(5)
    })

    it('applies rounded corners to skeleton elements', () => {
      const { container } = render(<ProductCardSkeleton />)

      const roundedElements = container.querySelectorAll('.rounded')
      // Should have multiple rounded elements
      expect(roundedElements.length).toBeGreaterThan(5)
    })

    it('applies rounded-t-lg to image skeleton', () => {
      const { container } = render(<ProductCardSkeleton />)

      const imageSkeleton = container.querySelector('.rounded-t-lg')
      expect(imageSkeleton).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('uses flexbox for category and price', () => {
      const { container } = render(<ProductCardSkeleton />)

      const categoryPrice = container.querySelector('.flex.items-start.justify-between')
      expect(categoryPrice).toBeInTheDocument()
    })

    it('uses flexbox for price and stock', () => {
      const { container } = render(<ProductCardSkeleton />)

      const priceStock = container.querySelector('.flex.items-baseline.justify-between')
      expect(priceStock).toBeInTheDocument()
    })

    it('uses flexbox for buttons', () => {
      const { container } = render(<ProductCardSkeleton />)

      const buttons = container.querySelector('.flex.gap-2')
      expect(buttons).toBeInTheDocument()
    })

    it('applies spacing between content sections', () => {
      const { container } = render(<ProductCardSkeleton />)

      const contentSkeleton = container.querySelector('.space-y-3')
      expect(contentSkeleton).toBeInTheDocument()
    })

    it('applies spacing between additional info lines', () => {
      const { container } = render(<ProductCardSkeleton />)

      const additionalInfo = container.querySelector('.space-y-1')
      expect(additionalInfo).toBeInTheDocument()
    })
  })

  describe('Dimensions', () => {
    it('image skeleton has correct height', () => {
      const { container } = render(<ProductCardSkeleton />)

      const imageSkeleton = container.querySelector('.h-48')
      expect(imageSkeleton).toBeInTheDocument()
    })

    it('image skeleton has full width', () => {
      const { container } = render(<ProductCardSkeleton />)

      const imageSkeleton = container.querySelector('.w-full')
      expect(imageSkeleton).toBeInTheDocument()
    })

    it('category skeleton has correct dimensions', () => {
      const { container } = render(<ProductCardSkeleton />)

      const category = container.querySelector('.h-5.w-20')
      expect(category).toBeInTheDocument()
    })

    it('title line 1 has full width', () => {
      const { container } = render(<ProductCardSkeleton />)

      const titleLine1 = container.querySelector('.h-6.w-full')
      expect(titleLine1).toBeInTheDocument()
    })

    it('title line 2 has 3/4 width', () => {
      const { container } = render(<ProductCardSkeleton />)

      const titleLine2 = container.querySelector('.w-3\\/4')
      expect(titleLine2).toBeInTheDocument()
    })

    it('price skeleton has correct dimensions', () => {
      const { container } = render(<ProductCardSkeleton />)

      const price = container.querySelector('.h-8.w-24')
      expect(price).toBeInTheDocument()
    })

    it('button 1 has fixed width', () => {
      const { container } = render(<ProductCardSkeleton />)

      const button1 = container.querySelector('.h-10.w-20')
      expect(button1).toBeInTheDocument()
    })

    it('button 2 has flex-1 width', () => {
      const { container } = render(<ProductCardSkeleton />)

      const button2 = container.querySelector('.h-10.flex-1')
      expect(button2).toBeInTheDocument()
    })
  })

  describe('Multiple Skeletons', () => {
    it('renders multiple skeletons independently', () => {
      const { container } = render(
        <>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </>
      )

      const cards = container.querySelectorAll('[data-testid="card"]')
      expect(cards.length).toBe(3)
    })

    it('each skeleton has same structure', () => {
      const { container } = render(
        <>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </>
      )

      const imageSkeletons = container.querySelectorAll('.h-48.w-full.bg-b2b-gray-100')
      expect(imageSkeletons.length).toBe(2)

      const contentSkeletons = container.querySelectorAll('.p-4.space-y-3')
      expect(contentSkeletons.length).toBe(2)
    })
  })

  describe('Accessibility', () => {
    it('does not have interactive elements', () => {
      const { container } = render(<ProductCardSkeleton />)

      const buttons = container.querySelectorAll('button')
      const links = container.querySelectorAll('a')
      const inputs = container.querySelectorAll('input')

      expect(buttons.length).toBe(0)
      expect(links.length).toBe(0)
      expect(inputs.length).toBe(0)
    })

    it('is purely visual (no semantic content)', () => {
      const { container } = render(<ProductCardSkeleton />)

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const paragraphs = container.querySelectorAll('p')

      expect(headings.length).toBe(0)
      expect(paragraphs.length).toBe(0)
    })
  })

  describe('Use Cases', () => {
    it('can be used in product grid loading state', () => {
      const { container } = render(
        <div className="grid grid-cols-3 gap-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      )

      const cards = container.querySelectorAll('[data-testid="card"]')
      expect(cards.length).toBe(6)
    })

    it('can be used in product list loading state', () => {
      const { container } = render(
        <div className="space-y-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      )

      const cards = container.querySelectorAll('[data-testid="card"]')
      expect(cards.length).toBe(3)
    })
  })
})

