import * as React from "react"

export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: "default" | "destructive"
}

export interface ToastActionElement {
  altText: string
  action: React.ReactNode
}

export const Toast = React.forwardRef<
  HTMLDivElement,
  ToastProps
>(({ className, id, title, description, action, open, onOpenChange, variant, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
Toast.displayName = "Toast"

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    altText: string
  }
>(({ altText, ...props }, ref) => (
  <button ref={ref} {...props} />
))
ToastAction.displayName = "ToastAction"

export const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ ...props }, ref) => (
  <button ref={ref} {...props} />
))
ToastClose.displayName = "ToastClose"

export const ToastTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => (
  <div ref={ref} {...props} />
))
ToastTitle.displayName = "ToastTitle"

export const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => (
  <div ref={ref} {...props} />
))
ToastDescription.displayName = "ToastDescription"

export const ToastViewport = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>(({ ...props }, ref) => (
  <ol ref={ref} {...props} />
))
ToastViewport.displayName = "ToastViewport"

