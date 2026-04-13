import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OpenTool — One MCP Server. All Your Tools.',
  description: 'One MCP server. All your tools. Fully open-source and self-hosted. Connect GitHub, Notion, Slack, and more to your AI agents.',
  metadataBase: new URL('https://opentool.dev'),
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'OpenTool — One MCP Server. All Your Tools.',
    description: 'Fully open-source, self-hosted MCP server. 10 providers, 23 tools. Connect your AI agents to GitHub, Notion, Slack, and more.',
    type: 'website',
    siteName: 'OpenTool',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTool — One MCP Server. All Your Tools.',
    description: 'Fully open-source, self-hosted MCP server. Connect your AI agents to everything.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid #1f1f1f',
              borderRadius: '12px',
              color: '#ededed',
              fontSize: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            },
            duration: 4000,
          }}
          theme="dark"
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
