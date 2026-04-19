import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CSP is the only header not covered by next.config.js headers()
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.opentool.dev https://*.onrender.com https://vercel.live wss://ws-us3.pusher.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', CSP)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon.ico|_document|_error).*)'],
}
