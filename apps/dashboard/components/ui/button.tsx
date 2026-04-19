'use client'

import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-[#00d4ff] text-black hover:bg-[#38e0ff] font-semibold',
        secondary:
          'bg-transparent border border-[rgba(139,92,246,0.15)] text-[#a1a1aa] hover:bg-[#15153a] hover:text-[#fafafa] hover:border-[rgba(139,92,246,0.25)]',
        ghost: 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#15153a]',
        danger:
          'border border-[rgba(239,68,68,0.3)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)]',
        destructive: 'bg-[#ef4444] text-white hover:bg-[#dc2626]',
      },
      size: {
        sm: 'h-7 px-3 text-xs rounded-md',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  loading?: boolean
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  loading,
  className,
  variant,
  size,
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      className={cn(buttonVariants({ variant, size }), className)}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      disabled={loading || disabled}
      onClick={onClick}
      type={type}
    >
      {loading ? (
        <>
          <motion.div
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          />
          {children}
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}
