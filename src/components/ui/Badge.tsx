import React from 'react'
import { cn } from '@/utils/cn'

type BadgeColor = 'gray' | 'orange' | 'green' | 'red' | 'blue' | 'amber' | 'purple' | 'slate'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const colors: Record<BadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-600',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-200 text-slate-700',
}

const dotColors: Record<BadgeColor, string> = {
  gray: 'bg-slate-400',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-500',
}

export function Badge({ color = 'gray', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors[color],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[color])} />}
      {children}
    </span>
  )
}

export function statusColor(status: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    active: 'green',
    on_hold: 'amber',
    completed: 'blue',
    archived: 'gray',
    draft: 'gray',
    submitted: 'blue',
    approved: 'green',
    rejected: 'red',
    open: 'red',
    in_progress: 'orange',
    resolved: 'green',
    pending: 'gray',
    done: 'green',
    missed: 'red',
    low: 'green',
    medium: 'amber',
    high: 'red',
  }
  return map[status] ?? 'gray'
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  return <Badge color={statusColor(status)} dot>{label}</Badge>
}
