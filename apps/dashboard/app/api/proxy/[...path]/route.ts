import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const COOKIE_NAME = 'ot_session'

// Proxy all requests to the OpenTool server, injecting auth from httpOnly cookie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params)
}

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  // Build target URL
  const path = '/' + params.path.join('/')
  const search = request.nextUrl.search
  const targetUrl = `${API_URL}${path}${search}`

  // Build headers — forward most headers, inject auth
  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
  }

  // Inject auth from cookie if available
  if (session?.value) {
    try {
      const { apiKey } = JSON.parse(session.value)
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    } catch {
      // Invalid session — proceed without auth
    }
  }

  // Forward org slug header if present
  const orgSlug = request.headers.get('x-org-slug')
  if (orgSlug) headers['X-Org-Slug'] = orgSlug

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  }

  // Forward body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text()
    if (body) fetchOptions.body = body
  }

  try {
    const res = await fetch(targetUrl, fetchOptions)
    const data = await res.text()

    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    )
  }
}
