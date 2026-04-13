import Link from 'next/link'
import { OpenToolLogo } from '@/components/icons'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
      <Link href="/" className="mb-8">
        <OpenToolLogo className="h-6 w-auto" />
      </Link>
      <div className="text-center max-w-md">
        <div className="text-[64px] font-extrabold text-[#1a1a1a] leading-none select-none">404</div>
        <h2 className="text-xl font-semibold text-[#ededed] tracking-tight mt-2">Page not found</h2>
        <p className="text-[14px] text-[#525252] mt-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-lg bg-[#0070F3] text-white text-sm font-medium hover:bg-[#2884FF] transition-colors flex items-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="h-9 px-4 rounded-lg border border-[#1f1f1f] text-[#a1a1aa] text-sm font-medium hover:bg-[#111111] hover:text-white transition-colors flex items-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
