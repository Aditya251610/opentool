import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create your OpenTool account to self-host an MCP server and connect AI agents to GitHub, Notion, Slack, and more.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
