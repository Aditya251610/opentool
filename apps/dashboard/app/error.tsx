'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
