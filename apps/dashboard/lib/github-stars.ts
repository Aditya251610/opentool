'use client'

import { useEffect, useState } from 'react'

const REPO_URL = 'https://api.github.com/repos/Aditya251610/opentool'
const CACHE_KEY = 'gh-stars'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Shared hook to fetch GitHub star count.
 * Uses sessionStorage cache to avoid redundant API calls across components.
 */
export function useGitHubStars(): number | null {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    // Check cache first
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { count, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setStars(count)
          return
        }
      } catch {}
    }

    fetch(REPO_URL)
      .then((r) => r.json())
      .then((d) => {
        if (d.stargazers_count != null) {
          setStars(d.stargazers_count)
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ count: d.stargazers_count, ts: Date.now() }),
          )
        }
      })
      .catch(() => {})
  }, [])

  return stars
}
