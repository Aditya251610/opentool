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
import { gitlabTools } from '../../tools/gitlab'
import { sentryTools } from '../../tools/sentry'
import { cloudflareTools } from '../../tools/cloudflare'
import { paypalTools } from '../../tools/paypal'
import { dockerTools } from '../../tools/docker'
import { telegramTools } from '../../tools/telegram'
import { discordTools } from '../../tools/discord'
import { twilioTools } from '../../tools/twilio'
import { gdriveTools } from '../../tools/gdrive'
import { gmeetTools } from '../../tools/gmeet'
import { jiraTools } from '../../tools/jira'
import { confluenceTools } from '../../tools/confluence'
import { microsoftTools } from '../../tools/microsoft'
import { awsTools } from '../../tools/aws'
import { azureTools } from '../../tools/azure'
import { gcpTools } from '../../tools/gcp'
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
  ...gitlabTools,
  ...sentryTools,
  ...cloudflareTools,
  ...paypalTools,
  ...dockerTools,
  ...telegramTools,
  ...discordTools,
  ...twilioTools,
  ...gdriveTools,
  ...gmeetTools,
  ...jiraTools,
  ...confluenceTools,
  ...microsoftTools,
  ...awsTools,
  ...azureTools,
  ...gcpTools,
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
