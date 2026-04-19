'use client'

import { useEffect, useRef } from 'react'

function generateStars(count: number): string {
  const stars: string[] = []
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100
    const y = Math.random() * 100
    const size = 0.5 + Math.random() * 1.2
    const opacity = 0.15 + Math.random() * 0.5
    stars.push(
      `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${opacity}), transparent)`,
    )
  }
  return stars.join(', ')
}

// Pre-generate layers
const LAYER_SLOW = generateStars(50)
const LAYER_MED = generateStars(35)
const LAYER_FAST = generateStars(20)

export default function ParallaxStars() {
  const slowRef = useRef<HTMLDivElement>(null)
  const medRef = useRef<HTMLDivElement>(null)
  const fastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (slowRef.current) slowRef.current.style.transform = `translateY(${y * 0.02}px)`
        if (medRef.current) medRef.current.style.transform = `translateY(${y * 0.06}px)`
        if (fastRef.current) fastRef.current.style.transform = `translateY(${y * 0.12}px)`
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const base = 'fixed inset-0 pointer-events-none'

  return (
    <div aria-hidden="true">
      <div
        ref={slowRef}
        className={base}
        style={{ background: LAYER_SLOW, zIndex: 0, willChange: 'transform' }}
      />
      <div
        ref={medRef}
        className={base}
        style={{ background: LAYER_MED, zIndex: 0, willChange: 'transform' }}
      />
      <div
        ref={fastRef}
        className={base}
        style={{ background: LAYER_FAST, zIndex: 0, willChange: 'transform' }}
      />
    </div>
  )
}
