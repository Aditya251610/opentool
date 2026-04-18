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
  title: {
    default: 'OpenTool — Open Source MCP Server for AI Agents',
    template: '%s | OpenTool',
  },
  description:
    'OpenTool is an open-source, self-hosted MCP server that gives AI agents secure access to GitHub, Notion, Slack, and 10+ tools. The free alternative to Arcade.dev. MIT licensed.',
  metadataBase: new URL('https://opentool.dev'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.svg',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'AI agent tools',
    'open source MCP',
    'self-hosted MCP server',
    'Arcade.dev alternative',
    'AI tool integration',
    'GitHub MCP',
    'Notion MCP',
    'Slack MCP',
    'Claude tools',
    'Cursor MCP',
    'AI developer tools',
    'MCP TypeScript',
    'open source AI tools',
  ],
  openGraph: {
    title: 'OpenTool — Open Source MCP Server for AI Agents',
    description:
      'One MCP server. All your tools. 10 providers, 23 tools. Self-hosted, MIT licensed. The open-source alternative to Arcade.dev.',
    type: 'website',
    siteName: 'OpenTool',
    url: 'https://opentool.dev',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTool — Open Source MCP Server for AI Agents',
    description:
      'Self-hosted MCP server with 10 providers & 23 tools. Free, open-source alternative to Arcade.dev.',
  },
  robots: { index: true, follow: true },
  other: {
    'google-site-verification': '',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'OpenTool',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Linux, macOS, Windows (Docker)',
    description:
      'Open-source, self-hosted MCP server that gives AI agents secure access to GitHub, Notion, Slack, and 10+ tools. The open-source alternative to Arcade.dev.',
    url: 'https://opentool.dev',
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Aditya',
      url: 'https://github.com/Aditya251610',
    },
    codeRepository: 'https://github.com/Aditya251610/opentool',
    programmingLanguage: ['TypeScript', 'JavaScript'],
    keywords:
      'MCP server, Model Context Protocol, AI tools, open source, self-hosted, GitHub integration, Notion integration, Slack integration, Arcade.dev alternative, AI agent tools',
  }

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OpenTool',
    url: 'https://opentool.dev',
    logo: 'https://opentool.dev/icon.svg',
    sameAs: ['https://github.com/Aditya251610/opentool'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is OpenTool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenTool is an open-source, self-hosted MCP (Model Context Protocol) server that gives AI agents like Claude, GPT, and Cursor secure, authenticated access to tools like GitHub, Notion, Slack, and more. It is the open-source alternative to Arcade.dev.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is an MCP server?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MCP (Model Context Protocol) is a standard by Anthropic that lets AI agents call external tools securely. An MCP server handles authentication, tool execution, and security so your agent can create GitHub issues, send Slack messages, or query databases.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is OpenTool different from Arcade.dev?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenTool is fully open-source (MIT licensed), self-hosted (runs on your infrastructure), and free forever. Your OAuth tokens and API keys never leave your server. Arcade.dev is proprietary, cloud-hosted, and paid.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which AI agents work with OpenTool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Any MCP-compatible agent — Claude Desktop, Cursor, Windsurf, Claude Code, and any custom agent using the MCP SDK.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I deploy OpenTool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'One command: docker compose up -d. OpenTool ships as a Docker image with PostgreSQL included. No external dependencies needed.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my data secure with OpenTool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. OpenTool runs entirely on your infrastructure. OAuth tokens are encrypted with AES-256-GCM. API keys are hashed with bcrypt. Every tool call is logged in an audit trail. Your tokens never leave your server.',
        },
      },
    ],
  }

  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
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
