import { HttpClient } from '../http'
import type { ToolUsageStat, UsageSummary, ExportFormat } from '../types'

export class AnalyticsResource {
  constructor(private http: HttpClient) {}

  /**
   * Get per-tool usage stats for the authenticated user.
   * @param days — lookback window (default 30, max 365)
   */
  async tools(days = 30): Promise<{ tools: ToolUsageStat[]; days: number }> {
    return this.http.get<{ tools: ToolUsageStat[]; days: number }>(
      `/api/analytics/tools?days=${days}`,
    )
  }

  /**
   * Get aggregated usage summary (totals, top tools/providers, daily breakdown).
   * @param days — lookback window (default 30, max 365)
   */
  async summary(days = 30): Promise<UsageSummary> {
    return this.http.get<UsageSummary>(`/api/analytics/summary?days=${days}`)
  }

  /**
   * Export context in a format suitable for agent configuration files.
   * Returns raw string content (Markdown, JSON, or plain text).
   *
   * @param format — one of: 'context.md', 'memory.json', '.cursorrules', 'CLAUDE.md'
   * @param days   — lookback window (default 30, max 365)
   */
  async export(format: ExportFormat = 'context.md', days = 30): Promise<string> {
    return this.http.get<string>(
      `/api/analytics/export?format=${encodeURIComponent(format)}&days=${days}`,
    )
  }
}
