'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * LoadingSkeleton — professional loading state with shimmer animation.
 * Provides presets for common layouts (stat cards, tables, page).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-pro', className)} />
}

export function StatCardSkeleton() {
  return (
    <Card className="card-pro-flat">
      <CardContent className="p-5">
        <div className="flex items-start gap-3.5">
          <Skeleton className="size-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card className="card-pro-flat overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-pro">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><Skeleton className="h-3.5 w-16" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}><Skeleton className="h-4 w-full max-w-[140px]" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function PageLoading({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
