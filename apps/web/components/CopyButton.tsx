'use client'

import { useState } from 'react'
import { Button } from '@/components/b2b'
import { MdContentCopy, MdCheck } from 'react-icons/md'
import { useToast } from '@/hooks/use-toast'

interface CopyButtonProps {
  text: string
  label?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CopyButton({
  text,
  label,
  variant = 'ghost',
  size = 'sm',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: `${label || 'Text'} copied to clipboard`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
      title={`Copy ${label || 'text'}`}
    >
      {copied ? (
        <MdCheck className="h-4 w-4" />
      ) : (
        <MdContentCopy className="h-4 w-4" />
      )}
      <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
    </Button>
  )
}
