import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  highlighted?: boolean
  danger?: boolean
}

export function Card({ children, className, hover, highlighted, danger }: CardProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-[#111111] p-6',
      danger
        ? 'border-[rgba(239,68,68,0.3)]'
        : highlighted
        ? 'border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.02)]'
        : 'border-[#1f1f1f]',
      hover && 'transition-all duration-150 hover:border-[#2e2e2e] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] cursor-pointer',
      className
    )}>
      {children}
    </div>
  )
}

const BADGE_MAP = {
  default: 'bg-[#1a1a1a] text-[#a1a1aa] border-[#27272a]',
  success: 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)]',
  warning: 'bg-[rgba(234,179,8,0.1)] text-[#eab308] border-[rgba(234,179,8,0.2)]',
  error: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]',
  accent: 'bg-[rgba(6,182,212,0.1)] text-[#06b6d4] border-[rgba(6,182,212,0.2)]',
  purple: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border-[rgba(139,92,246,0.2)]',
} as const

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof BADGE_MAP
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-[0.04em] border',
      BADGE_MAP[variant]
    )}>
      {children}
    </span>
  )
}
