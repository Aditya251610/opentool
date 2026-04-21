import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Generate nonce for script-src
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://vercel.live`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.opentool.dev https://*.onrender.com https://vercel.live https://api.github.com wss://ws-us3.pusher.com wss://*.pusher.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon.ico|_document|_error).*)'],
}
