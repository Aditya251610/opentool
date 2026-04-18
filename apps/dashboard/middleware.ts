import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/docs', '/privacy', '/terms', '/icon.svg'])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files and internal Next.js routes without header overhead
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Security headers on all HTML responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.opentool.dev https://*.onrender.com https://vercel.live wss://ws-us3.pusher.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon.ico|_document|_error).*)'],
}
