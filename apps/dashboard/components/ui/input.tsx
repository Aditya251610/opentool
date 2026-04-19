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
      {label && <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">{label}</label>}
      <input
        className={cn(
          'w-full h-9 px-3 rounded-lg bg-[#0d0d24] border text-sm text-[#ededed] placeholder-[#737373] transition-all outline-none',
          error
            ? 'border-[#ef4444] focus:ring-2 focus:ring-[rgba(239,68,68,0.15)]'
            : 'border-[rgba(139,92,246,0.12)] focus:border-[#00d4ff] focus:ring-2 focus:ring-[rgba(0,212,255,0.15)]',
          className,
        )}
        {...props}
      />
      {helper && !error && <p className="text-[11px] text-[#737373] mt-1">{helper}</p>}
      {error && <p className="text-[11px] text-[#ef4444] mt-1">{error}</p>}
    </div>
  )
}
