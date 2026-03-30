import { ToolDefinition } from '@opentool/tool-schema'
import { githubTools } from '../../tools/github'

const allTools: ToolDefinition<any>[] = [
  ...githubTools,
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