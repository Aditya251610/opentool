// Fuzzy matching for "Did you mean?" suggestions.

/**
 * Levenshtein edit distance (bounded to max 5 for perf).
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const MAX = 5
  if (Math.abs(a.length - b.length) > MAX) return MAX + 1

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/**
 * Find close matches from a pool of candidates.
 * Returns up to `limit` results sorted by relevance.
 */
export function suggest(input: string, pool: string[], limit = 3): string[] {
  const lower = input.toLowerCase()
  const scored = pool
    .map((candidate) => {
      const cl = candidate.toLowerCase()
      // Exact prefix match is best
      if (cl.startsWith(lower)) return { candidate, score: 0 }
      // Contains match
      if (cl.includes(lower)) return { candidate, score: 1 }
      // Edit distance
      const dist = editDistance(lower, cl)
      return { candidate, score: dist + 2 }
    })
    .filter(({ score }) => score <= 4)
    .sort((a, b) => a.score - b.score)

  return scored.slice(0, limit).map(({ candidate }) => candidate)
}
