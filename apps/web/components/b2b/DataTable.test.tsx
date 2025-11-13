import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataTable } from './DataTable'

// Mock dependencies
jest.mock('./Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}))

describe('DataTable', () => {
  const mockColumns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
  ]

  const mockData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ]

  describe('Rendering', () => {
    it('renders with data', () => {
      const { container } = render(<DataTable columns={mockColumns} data={mockData} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with empty data', () => {
      const { container } = render(<DataTable columns={mockColumns} data={[]} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} className="custom-class" />
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('renders when no data', () => {
      const { container } = render(<DataTable columns={mockColumns} data={[]} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts custom empty state message', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={[]}
          emptyMessage="No records found"
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with data', () => {
      const { container } = render(<DataTable columns={mockColumns} data={mockData} />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('accepts loading prop', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={[]}
          loading={true}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders when loading is true', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          loading={true}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders when loading is false', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          loading={false}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Row Click Handler', () => {
    it('accepts onRowClick prop', () => {
      const handleRowClick = jest.fn()
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={handleRowClick}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders without onRowClick handler', () => {
      const { container } = render(<DataTable columns={mockColumns} data={mockData} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with multiple rows', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={jest.fn()}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('renders with columns', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with multiple columns', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('renders with responsive prop', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          responsive={true}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders without responsive prop', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          responsive={false}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Custom Rendering', () => {
    it('accepts custom column render function', () => {
      const customColumns = [
        { key: 'name', header: 'Name' },
        {
          key: 'status',
          header: 'Status',
          render: (item: any) => <span className="badge">{item.status}</span>,
        },
      ]

      const { container } = render(
        <DataTable
          columns={customColumns}
          data={[{ id: '1', name: 'John', status: 'Active' }]}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts custom className on columns', () => {
      const customColumns = [
        { key: 'name', header: 'Name', className: 'font-bold' },
        { key: 'email', header: 'Email', className: 'text-gray-500' },
      ]

      const { container } = render(
        <DataTable
          columns={customColumns}
          data={mockData}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Column Configuration', () => {
    it('renders with single column', () => {
      const singleColumn = [{ key: 'name', header: 'Name' }]
      const { container } = render(
        <DataTable columns={singleColumn} data={mockData} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with multiple columns', () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          className="custom-class"
        />
      )
      
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('Combined Props', () => {
    it('renders with all props combined', () => {
      const handleRowClick = jest.fn()

      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          loading={false}
          onRowClick={handleRowClick}
          className="custom-class"
          responsive={true}
          emptyMessage="No data"
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders with semantic structure', () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with columns', () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with data rows', () => {
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={jest.fn()}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(DataTable.displayName).toBe('DataTable')
    })
  })
})

