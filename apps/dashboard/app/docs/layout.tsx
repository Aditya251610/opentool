import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Complete documentation for OpenTool — setup guides, MCP configuration, API reference, and tool integration docs for the open-source MCP server.',
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'OpenTool Documentation',
    description: 'Setup guides, MCP config, API reference for the open-source MCP server.',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
