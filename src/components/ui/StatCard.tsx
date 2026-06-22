import React from 'react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'amber'
  className?: string
}

const colorMap = {
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', trend: 'text-orange-600' },
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', trend: 'text-blue-600' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', trend: 'text-green-600' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', trend: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', trend: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', trend: 'text-amber-600' },
}

export function StatCard({ label, value, icon, trend, color = 'orange', className }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4', className)}>
      <div className={cn('p-2.5 rounded-xl', c.icon)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trend && (
          <p className={cn('text-xs mt-1', c.trend)}>
            {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
