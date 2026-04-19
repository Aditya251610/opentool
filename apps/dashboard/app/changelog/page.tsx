import { Metadata } from 'next'
import { ChangelogContent } from './changelog-content'

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Track every update to the OpenTool MCP server — new features, bug fixes, and security improvements.',
}

// ISR: revalidate every 5 minutes so pushes to GitHub reflect automatically
export const revalidate = 300

/* ─── Changelog parser ─── */

interface ChangelogSection {
  title: string
  items: string[]
}

interface ChangelogEntry {
  version: string
  date: string | null
  isUnreleased: boolean
  sections: ChangelogSection[]
}

function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  const lines = markdown.split('\n')

  let entry: ChangelogEntry | null = null
  let section: ChangelogSection | null = null

  for (const line of lines) {
    // ## [0.1.1] - 2025-04-18  or  ## [Unreleased]
    const vm = line.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?/)
    if (vm) {
      if (entry) {
        if (section) entry.sections.push(section)
        entries.push(entry)
      }
      entry = {
        version: vm[1],
        date: vm[2]?.trim() || null,
        isUnreleased: vm[1].toLowerCase() === 'unreleased',
        sections: [],
      }
      section = null
      continue
    }

    // ### Added, ### Fixed, etc.
    const sm = line.match(/^### (.+)/)
    if (sm && entry) {
      if (section) entry.sections.push(section)
      section = { title: sm[1], items: [] }
      continue
    }

    // - item text
    const im = line.match(/^- (.+)/)
    if (im && section) {
      section.items.push(im[1])
    }
  }

  if (entry) {
    if (section) entry.sections.push(section)
    entries.push(entry)
  }

  return entries
}

/* ─── Data fetching (GitHub raw → ISR) ─── */

const CHANGELOG_URL = 'https://raw.githubusercontent.com/Aditya251610/opentool/main/CHANGELOG.md'

async function getChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch(CHANGELOG_URL, { next: { revalidate: 300 } })
    if (res.ok) {
      const md = await res.text()
      return parseChangelog(md)
    }
  } catch {
    // GitHub unreachable — fall back to local file
  }

  // Fallback: read from monorepo root (works during build)
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const local = await fs.readFile(path.join(process.cwd(), '../../CHANGELOG.md'), 'utf-8')
    return parseChangelog(local)
  } catch {
    return []
  }
}

/* ─── Page (server component) ─── */

export default async function ChangelogPage() {
  const entries = await getChangelog()
  return <ChangelogContent entries={entries} />
}
