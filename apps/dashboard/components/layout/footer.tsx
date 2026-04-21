'use client'

import Link from 'next/link'
import { OpenToolLogo, OpenToolMark } from '@/components/icons'
import { useGitHubStars } from '@/lib/github-stars'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      ['Features', '/#features'],
      ['Integrations', '/#tools'],
      ['Docs', '/docs'],
      ['Changelog', '/changelog'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['Documentation', '/docs'],
      ['GitHub', 'https://github.com/Aditya251610/opentool'],
      ['Self-hosting', '/docs#self-hosting'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy Policy', '/privacy'],
      ['Terms of Service', '/terms'],
      ['Report an issue', 'https://github.com/Aditya251610/opentool/issues'],
    ],
  },
]

export function Footer() {
  const stars = useGitHubStars()

  return (
    <footer className="border-t border-white/[0.06] bg-[#030014]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <OpenToolMark size={22} />
              <OpenToolLogo className="h-4 w-auto" />
            </div>
            <p className="text-xs text-white/40 leading-relaxed max-w-[220px]">
              The open-source MCP server for AI agents. Self-hosted. MIT licensed.
            </p>
            {stars !== null && (
              <Link
                href="https://github.com/Aditya251610/opentool"
                target="_blank"
                className="inline-flex items-center gap-1.5 mt-4 text-xs text-white/30 hover:text-brand transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="text-brand/50"
                >
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                </svg>
                {stars} stars on GitHub
              </Link>
            )}
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-4">
                {col.title}
              </h4>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-xs text-white/45 hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nebula accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand/20 to-transparent mb-6" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} OpenTool · MIT License
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-white/25 hover:text-white/60 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-white/25 hover:text-white/60 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="https://github.com/Aditya251610/opentool"
              target="_blank"
              className="text-xs text-white/25 hover:text-white/60 transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
