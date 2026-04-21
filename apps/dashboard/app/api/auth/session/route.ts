import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'ot_session'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Cookie config — httpOnly, secure, strict sameSite
function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  }
}

// POST /api/auth/session — Set session (called after login)
export async function POST(request: Request) {
  const body = await request.json()
  const { apiKey, user } = body

  if (!apiKey || !user) {
    return NextResponse.json({ error: 'Missing apiKey or user' }, { status: 400 })
  }

  // Verify the key is valid by calling the server
  const res = await fetch(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const sessionData = JSON.stringify({ apiKey, user })
  cookieStore.set(COOKIE_NAME, sessionData, cookieOptions())

  return NextResponse.json({ user })
}

// GET /api/auth/session — Get current session
export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  if (!session?.value) {
    return NextResponse.json({ user: null, authenticated: false })
  }

  try {
    const { user } = JSON.parse(session.value)
    return NextResponse.json({ user, authenticated: true })
  } catch {
    return NextResponse.json({ user: null, authenticated: false })
  }
}

// DELETE /api/auth/session — Clear session (logout)
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return NextResponse.json({ success: true })
}
