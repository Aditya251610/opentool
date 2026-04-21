'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-black text-white flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-6">An unexpected error occurred. Please try again.</p>
          {error.digest && <p className="text-xs text-gray-600 mb-4">Error ID: {error.digest}</p>}
          <button
            onClick={reset}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
