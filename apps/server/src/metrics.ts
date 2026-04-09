/**
 * Lightweight in-memory metrics collector with Prometheus text format export.
 */

interface CounterMetric {
  name: string
  help: string
  labels: Record<string, number>
}

interface HistogramBucket {
  le: number
  count: number
}

interface HistogramMetric {
  name: string
  help: string
  sum: number
  count: number
  buckets: HistogramBucket[]
}

class Metrics {
  private counters = new Map<string, CounterMetric>()
  private histograms = new Map<string, HistogramMetric>()

  counter(name: string, help: string) {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, labels: {} })
    }
    return {
      inc: (labels: Record<string, string> = {}) => {
        const key = Object.entries(labels)
          .sort()
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')
        const metric = this.counters.get(name)!
        metric.labels[key] = (metric.labels[key] || 0) + 1
      },
    }
  }

  histogram(
    name: string,
    help: string,
    buckets = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  ) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        sum: 0,
        count: 0,
        buckets: buckets.map((le) => ({ le, count: 0 })),
      })
    }
    return {
      observe: (value: number) => {
        const metric = this.histograms.get(name)!
        metric.sum += value
        metric.count++
        for (const bucket of metric.buckets) {
          if (value <= bucket.le) bucket.count++
        }
      },
    }
  }

  toPrometheus(): string {
    const lines: string[] = []

    for (const [, metric] of this.counters) {
      lines.push(`# HELP ${metric.name} ${metric.help}`)
      lines.push(`# TYPE ${metric.name} counter`)
      for (const [labelStr, value] of Object.entries(metric.labels)) {
        const labels = labelStr ? `{${labelStr}}` : ''
        lines.push(`${metric.name}${labels} ${value}`)
      }
    }

    for (const [, metric] of this.histograms) {
      lines.push(`# HELP ${metric.name} ${metric.help}`)
      lines.push(`# TYPE ${metric.name} histogram`)
      for (const bucket of metric.buckets) {
        lines.push(`${metric.name}_bucket{le="${bucket.le}"} ${bucket.count}`)
      }
      lines.push(`${metric.name}_bucket{le="+Inf"} ${metric.count}`)
      lines.push(`${metric.name}_sum ${metric.sum}`)
      lines.push(`${metric.name}_count ${metric.count}`)
    }

    return lines.join('\n') + '\n'
  }
}

export const metrics = new Metrics()

// Pre-define metrics
export const toolExecutions = metrics.counter(
  'opentool_tool_executions_total',
  'Total tool executions',
)
export const toolErrors = metrics.counter(
  'opentool_tool_errors_total',
  'Total tool execution errors',
)
export const toolDuration = metrics.histogram(
  'opentool_tool_duration_seconds',
  'Tool execution duration in seconds',
)
export const authEvents = metrics.counter(
  'opentool_auth_events_total',
  'Total authentication events',
)
export const httpRequests = metrics.counter(
  'opentool_http_requests_total',
  'Total HTTP requests',
)
