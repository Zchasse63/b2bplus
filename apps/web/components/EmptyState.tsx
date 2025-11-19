import { Card } from '@/components/b2b'
import { Button } from '@/components/b2b'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card variant="bordered" className="border-dashed border-b2b-gray-300">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon className="h-16 w-16 text-b2b-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-b2b-dark">{title}</h3>
        <p className="text-b2b-gray-500 mb-6 max-w-sm">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="primary" size="md">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  )
}
