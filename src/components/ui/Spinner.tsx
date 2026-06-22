import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: number
  className?: string
  fullPage?: boolean
}

export function Spinner({ size = 20, className, fullPage }: SpinnerProps) {
  const el = <Loader2 size={size} className={cn('animate-spin text-orange-500', className)} />
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {el}
      </div>
    )
  }
  return el
}
