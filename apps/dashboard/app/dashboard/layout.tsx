'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { PageTransition } from '@/components/layout/page-transition'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { apiKey, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !apiKey) {
      router.replace('/login')
    }
  }, [apiKey, isLoading, router])

  if (isLoading || !apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-60 pt-14 md:pt-0">
        <div className="pointer-events-none fixed top-0 left-0 md:left-60 right-0 h-[300px] bg-gradient-to-b from-[rgba(6,182,212,0.03)] to-transparent z-0" />
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
