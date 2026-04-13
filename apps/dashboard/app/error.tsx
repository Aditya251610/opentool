'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { OpenToolLogo } from '@/components/icons'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Only log digest in production — no stack traces
    if (error.digest) {
      console.error('Error digest:', error.digest)
    }
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <Link href="/" className="mb-8">
        <OpenToolLogo className="h-6 w-auto" />
      </Link>
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] flex items-center justify-center mx-auto mb-5">
          <span className="text-[#ef4444] text-lg">!</span>
        </div>
        <h2 className="text-xl font-semibold text-[#ededed] tracking-tight">Something went wrong</h2>
        <p className="text-[14px] text-[#525252] mt-2 leading-relaxed">
          An unexpected error occurred. Please try again or go back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="h-9 px-4 rounded-lg bg-[#0070F3] text-white text-sm font-medium hover:bg-[#2884FF] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-lg border border-[#1f1f1f] text-[#a1a1aa] text-sm font-medium hover:bg-[#111111] hover:text-white transition-colors flex items-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
