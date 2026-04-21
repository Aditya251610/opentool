import type { Metadata } from 'next'
import LandingPage from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'OpenTool — One MCP Server. All Your Tools.',
  description:
    'The open-source Model Context Protocol server that connects AI agents to GitHub, Gmail, Slack, Linear, and more. Self-host or use the cloud.',
  openGraph: {
    title: 'OpenTool — One MCP Server. All Your Tools.',
    description:
      'The open-source Model Context Protocol server that connects AI agents to GitHub, Gmail, Slack, Linear, and more.',
    url: 'https://opentool.dev',
    siteName: 'OpenTool',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTool — One MCP Server. All Your Tools.',
    description:
      'The open-source MCP server that connects AI agents to GitHub, Gmail, Slack, Linear, and more.',
  },
  alternates: {
    canonical: 'https://opentool.dev',
  },
}

export default function Page() {
  return <LandingPage />
}
