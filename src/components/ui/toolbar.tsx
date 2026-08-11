'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * Toolbar — professional filter/action bar for list pages.
 * Contains a search input, optional filters, and action buttons.
 *
 * Example:
 * <Toolbar>
 *   <ToolbarSearch placeholder="Cari barang..." ... />
 *   <ToolbarFilters>
 *     <Select>...</Select>
 *   </ToolbarFilters>
 *   <ToolbarActions>
 *     <Button>Tambah</Button>
 *   </ToolbarActions>
 * </Toolbar>
 */
export interface ToolbarProps {
  children: React.ReactNode
  className?: string
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <Card className="card-pro-flat p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {children}
      </div>
    </Card>
  )
}

export function ToolbarSearch({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative w-full lg:max-w-xs', className)}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </div>
  )
}

export function ToolbarFilters({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {children}
    </div>
  )
}

export function ToolbarActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 lg:ml-auto', className)}>
      {children}
    </div>
  )
}
