'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * EmptyState — professional empty state with icon, title, description,
 * and optional action button. Used when a table or list has no data.
 */
export interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Size variant: "default" for full-page empty states, "compact" for inside cards */
  size?: 'default' | 'compact'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'default' ? 'py-16 px-4' : 'py-10 px-4',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-muted text-muted-foreground/40 mb-4',
            size === 'default' ? 'size-16' : 'size-12'
          )}
        >
          <Icon className={size === 'default' ? 'size-8' : 'size-6'} />
        </div>
      )}
      <p
        className={cn(
          'font-semibold text-foreground',
          size === 'default' ? 'text-base' : 'text-sm'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'text-muted-foreground mt-1 max-w-sm',
            size === 'default' ? 'text-sm' : 'text-xs'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
