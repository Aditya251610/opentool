'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      router.replace(`/login?error=${error}`)
      return
    }

    if (code) {
      // Exchange the temp code for credentials server-side
      fetch('/api/auth/google-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Exchange failed')
          return res.json()
        })
        .then((data: { apiKey: string; email: string; name: string }) => {
          return login(data.apiKey, { id: '', email: data.email, name: data.name || null })
        })
        .then(() => router.replace('/dashboard'))
        .catch(() => router.replace('/login?error=exchange_failed'))
    } else {
      router.replace('/login?error=missing_credentials')
    }
  }, [searchParams, login, router])

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <div className="text-white/40 text-sm">Signing you in...</div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <CallbackInner />
    </Suspense>
  )
}
