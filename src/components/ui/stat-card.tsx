'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * StatCard — professional statistics card with icon, value, label, and
 * optional trend/subtitle. Used in dashboards and list-page summaries.
 *
 * The icon container uses a soft tinted background that matches the
 * semantic color of the metric.
 */
export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  /** Semantic color theme for the icon container */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  /** Optional trend indicator shown next to the value */
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  delay?: number
  className?: string
  onClick?: () => void
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, { bg: string; text: string; ring: string }> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/20',
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-500/20',
  },
  info: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500/20',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    ring: 'ring-border',
  },
}

const trendStyles = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'primary',
  trend,
  delay = 0,
  className,
  onClick,
}: StatCardProps) {
  const styles = toneStyles[tone]
  const Comp = onClick ? 'button' : 'div'

  return (
    <Card
      className={cn(
        'card-pro overflow-hidden text-left animate-fade-in-up',
        delay && `stagger-${delay}`,
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        className
      )}
    >
      <CardContent className="p-5">
        <Comp
          className="flex w-full items-start gap-3.5"
          {...(onClick ? { onClick, type: 'button' as const } : {})}
        >
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1',
              styles.bg,
              styles.text,
              styles.ring
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground leading-none mb-1.5">
              {title}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-bold tracking-tight tabular-nums stat-value text-foreground">
                {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
              </p>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    trendStyles[trend.direction]
                  )}
                >
                  {trend.direction === 'up' && '↑'}
                  {trend.direction === 'down' && '↓'}
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
          </div>
        </Comp>
      </CardContent>
    </Card>
  )
}
