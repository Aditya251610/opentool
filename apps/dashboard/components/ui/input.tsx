'use client'

import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
}

export function Input({ label, helper, error, className, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">{label}</label>
      )}
      <input
        className={cn(
          'w-full h-9 px-3 rounded-lg bg-[#111111] border text-sm text-[#ededed] placeholder-[#525252] transition-all outline-none',
          error
            ? 'border-[#ef4444] focus:ring-2 focus:ring-[rgba(239,68,68,0.15)]'
            : 'border-[#1f1f1f] focus:border-[#0070F3] focus:ring-2 focus:ring-[rgba(0,112,243,0.15)]',
          className
        )}
        {...props}
      />
      {helper && !error && (
        <p className="text-[11px] text-[#525252] mt-1">{helper}</p>
      )}
      {error && (
        <p className="text-[11px] text-[#ef4444] mt-1">{error}</p>
      )}
    </div>
  )
}
