import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Page not found</h2>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
