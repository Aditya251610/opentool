'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function ParallaxStars() {
  const slowRef = useRef<HTMLDivElement>(null)
  const medRef = useRef<HTMLDivElement>(null)
  const fastRef = useRef<HTMLDivElement>(null)
  const [layers, setLayers] = useState<{ slow: string; med: string; fast: string } | null>(null)

  // Defer star generation to after initial paint
  useEffect(() => {
    const generate = () => {
      setLayers({
        slow: generateStars(50),
        med: generateStars(35),
        fast: generateStars(20),
      })
    }

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(generate)
      return () => cancelIdleCallback(id)
    } else {
      const timer = setTimeout(generate, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!layers) return
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
  }, [layers])

  if (!layers) return null

  const base = 'fixed inset-0 pointer-events-none'

  return (
    <div aria-hidden="true">
      <div ref={slowRef} className={base} style={{ background: layers.slow, zIndex: 0 }} />
      <div ref={medRef} className={base} style={{ background: layers.med, zIndex: 0 }} />
      <div ref={fastRef} className={base} style={{ background: layers.fast, zIndex: 0 }} />
    </div>
  )
}
