'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  children: string
  title?: string
}

export function CodeBlock({ children, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg bg-[#0a0a0a] border border-[#1f1f1f] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f1f1f]">
          <span className="text-[11px] uppercase tracking-wider text-[#525252] font-medium">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-[#525252] hover:text-[#a1a1aa] transition-colors cursor-pointer"
          >
            {copied ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="p-4 text-[13px] font-mono leading-relaxed text-[#ededed] overflow-x-auto">
        {children}
      </pre>
    </div>
  )
}
