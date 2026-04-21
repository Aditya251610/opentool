import { ToolDefinition } from '@opentool/tool-schema'
import { githubTools } from '../../tools/github'
import { notionTools } from '../../tools/notion'
import { slackTools } from '../../tools/slack'
import { linearTools } from '../../tools/linear'
import { gmailTools } from '../../tools/gmail'
import { gcalTools } from '../../tools/gcal'
import { stripeTools } from '../../tools/stripe'
import { vercelTools } from '../../tools/vercel'
import { resendTools } from '../../tools/resend'
import { postgresTools } from '../../tools/postgres'
import { metaTools } from '../../tools/meta'
import { META_PROVIDER } from '../constants'

const allTools: ToolDefinition<any>[] = [
  ...githubTools,
  ...notionTools,
  ...slackTools,
  ...linearTools,
  ...gmailTools,
  ...gcalTools,
  ...stripeTools,
  ...vercelTools,
  ...resendTools,
  ...postgresTools,
  ...metaTools,
]

const toolMap = new Map<string, ToolDefinition<any>>()

for (const tool of allTools) {
  toolMap.set(tool.id, tool)
}

export function getToolById(id: string): ToolDefinition<any> | undefined {
  return toolMap.get(id)
}

export function getToolsByProvider(provider: string): ToolDefinition<any>[] {
  return allTools.filter((t) => t.provider === provider)
}

export function getAllTools(): ToolDefinition<any>[] {
  return allTools
}

/** Returns only non-meta tools (the "real" tools agents execute). */
export function getUserTools(): ToolDefinition<any>[] {
  return allTools.filter((t) => t.provider !== META_PROVIDER)
}

/** Returns only meta-tools (search, details, execute). */
export function getMetaTools(): ToolDefinition<any>[] {
  return allTools.filter((t) => t.provider === META_PROVIDER)
}

export function getToolIds(): string[] {
  return allTools.map((t) => t.id)
}

/** Returns tools grouped by provider with counts. */
export function getToolCategories(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const tool of allTools) {
    if (tool.provider === META_PROVIDER) continue
    counts[tool.provider] = (counts[tool.provider] ?? 0) + 1
  }
  return counts
}
