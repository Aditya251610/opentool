'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const apiKey = searchParams.get('apiKey')
    const email = searchParams.get('email')
    const name = searchParams.get('name')
    const error = searchParams.get('error')

    if (error) {
      router.replace(`/login?error=${error}`)
      return
    }

    if (apiKey && email) {
      login(apiKey, { id: '', email, name: name || null })
      router.replace('/dashboard')
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
