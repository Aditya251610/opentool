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
]

const toolMap = new Map<string, ToolDefinition<any>>()

for (const tool of allTools) {
  toolMap.set(tool.id, tool)
}

export function getToolById(id: string): ToolDefinition<any> | undefined {
  return toolMap.get(id)
}

export function getToolsByProvider(provider: string): ToolDefinition<any>[] {
  return allTools.filter(t => t.provider === provider)
}

export function getAllTools(): ToolDefinition<any>[] {
  return allTools
}

export function getToolIds(): string[] {
  return allTools.map(t => t.id)
}