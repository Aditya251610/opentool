import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// POST /api/auth/google-exchange — Exchange temp OAuth code for credentials (server-side proxy)
export async function POST(request: Request) {
  const body = await request.json()
  const { code } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/api/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Exchange failed' }))
    return NextResponse.json(err, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
