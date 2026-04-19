import Link from 'next/link'
import { OpenToolLogo } from '@/components/icons'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8">
        <OpenToolLogo className="h-6 w-auto" />
      </Link>
      <div className="text-center max-w-md">
        <div className="text-[64px] font-extrabold text-[#15153a] leading-none select-none">
          404
        </div>
        <h2 className="text-xl font-semibold text-[#ededed] tracking-tight mt-2">Page not found</h2>
        <p className="text-sm text-[#737373] mt-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-lg bg-[#00d4ff] text-black text-sm font-medium hover:bg-[#38e0ff] transition-colors flex items-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="h-9 px-4 rounded-lg border border-[rgba(139,92,246,0.12)] text-[#a1a1aa] text-sm font-medium hover:bg-[#0d0d24] hover:text-white transition-colors flex items-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
