'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * PageHeader — consistent professional page header with title, description,
 * and optional actions. Used at the top of every feature page.
 *
 * Example:
 * <PageHeader
 *   title="Kartu Inventaris Barang"
 *   description="Kelola data barang inventaris sekolah"
 *   actions={<Button>Tambah</Button>}
 * />
 */
export interface PageHeaderProps {
  title: string
  description?: string
  /** Optional small badge / pill shown next to the title */
  badge?: React.ReactNode
  /** Optional icon shown to the left of the title */
  icon?: React.ElementType
  /** Right-aligned action buttons */
  actions?: React.ReactNode
  /** Optional breadcrumb content above the title */
  breadcrumbs?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between animate-fade-in', className)}>
      <div className="flex-1 min-w-0">
        {breadcrumbs && (
          <div className="mb-2 text-sm text-muted-foreground">{breadcrumbs}</div>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

/**
 * PageContainer — standard page wrapper with consistent spacing and
 * subtle background gradient.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-5', className)}>
      {children}
    </div>
  )
}

/**
 * SectionHeader — compact section title within a page (for grouping
 * cards or content blocks).
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string
  description?: string
  icon?: React.ElementType
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
