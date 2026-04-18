import { describe, it, expect, beforeEach } from 'vitest'

// Fresh Metrics instance per test — import the class logic directly
// We test via the exported singleton + pre-defined metrics
import {
  metrics,
  toolExecutions,
  toolErrors,
  toolDuration,
  authEvents,
  httpRequests,
} from '../metrics'

describe('metrics', () => {
  describe('counter', () => {
    it('creates and increments a counter', () => {
      const counter = metrics.counter('test_counter_total', 'A test counter')
      counter.inc()
      counter.inc()
      const output = metrics.toPrometheus()
      expect(output).toContain('# HELP test_counter_total A test counter')
      expect(output).toContain('# TYPE test_counter_total counter')
      expect(output).toContain('test_counter_total 2')
    })

    it('tracks labeled counters separately', () => {
      const counter = metrics.counter('labeled_total', 'Labeled counter')
      counter.inc({ method: 'GET' })
      counter.inc({ method: 'GET' })
      counter.inc({ method: 'POST' })
      const output = metrics.toPrometheus()
      expect(output).toContain('labeled_total{method="GET"} 2')
      expect(output).toContain('labeled_total{method="POST"} 1')
    })

    it('returns the same counter when called twice with same name', () => {
      const c1 = metrics.counter('dedup_total', 'help')
      const c2 = metrics.counter('dedup_total', 'help')
      c1.inc()
      c2.inc()
      // Both point to same underlying metric, total should be 2
      const output = metrics.toPrometheus()
      expect(output).toContain('dedup_total 2')
    })
  })

  describe('histogram', () => {
    it('observes values into buckets', () => {
      const hist = metrics.histogram('test_duration', 'Duration', [0.1, 0.5, 1, 5])
      hist.observe(0.05) // fits in 0.1, 0.5, 1, 5
      hist.observe(0.3) // fits in 0.5, 1, 5
      hist.observe(2) // fits in 5
      hist.observe(10) // fits in none (only +Inf)

      const output = metrics.toPrometheus()
      expect(output).toContain('test_duration_bucket{le="0.1"} 1')
      expect(output).toContain('test_duration_bucket{le="0.5"} 2')
      expect(output).toContain('test_duration_bucket{le="1"} 2')
      expect(output).toContain('test_duration_bucket{le="5"} 3')
      expect(output).toContain('test_duration_bucket{le="+Inf"} 4')
      expect(output).toContain('test_duration_count 4')
    })

    it('tracks sum correctly', () => {
      const hist = metrics.histogram('sum_test', 'Sum test', [1, 10])
      hist.observe(3)
      hist.observe(7)
      const output = metrics.toPrometheus()
      expect(output).toContain('sum_test_sum 10')
    })
  })

  describe('pre-defined metrics', () => {
    it('toolExecutions counter exists and can be incremented', () => {
      toolExecutions.inc({ provider: 'github', tool: 'list_repos' })
      const output = metrics.toPrometheus()
      expect(output).toContain('opentool_tool_executions_total')
    })

    it('toolErrors counter exists', () => {
      toolErrors.inc({ provider: 'slack' })
      const output = metrics.toPrometheus()
      expect(output).toContain('opentool_tool_errors_total')
    })

    it('toolDuration histogram exists', () => {
      toolDuration.observe(0.42)
      const output = metrics.toPrometheus()
      expect(output).toContain('opentool_tool_duration_seconds')
    })

    it('authEvents counter exists', () => {
      authEvents.inc({ event: 'login' })
      const output = metrics.toPrometheus()
      expect(output).toContain('opentool_auth_events_total')
    })

    it('httpRequests counter exists', () => {
      httpRequests.inc({ method: 'GET', status: '200' })
      const output = metrics.toPrometheus()
      expect(output).toContain('opentool_http_requests_total')
    })
  })

  describe('toPrometheus', () => {
    it('ends with a newline', () => {
      const output = metrics.toPrometheus()
      expect(output.endsWith('\n')).toBe(true)
    })

    it('uses proper Prometheus format', () => {
      const output = metrics.toPrometheus()
      const lines = output.trim().split('\n')
      for (const line of lines) {
        // Each line is either a comment (# ...) or a metric line
        expect(line.startsWith('#') || /^[a-z_]+/.test(line)).toBe(true)
      }
    })
  })
})
