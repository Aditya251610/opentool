import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenTool',
  description: 'One MCP server. All your tools. Fully open-source and self-hosted.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
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
      </body>
    </html>
  )
}
