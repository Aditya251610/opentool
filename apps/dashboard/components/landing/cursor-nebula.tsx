'use client'

import { useEffect, useRef } from 'react'

export default function CursorNebula() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Skip on touch devices
    if ('ontouchstart' in window) return

    const glow = glowRef.current
    if (!glow) return

    let x = 0,
      y = 0
    let cx = 0,
      cy = 0
    let raf: number

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const move = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
    }

    const tick = () => {
      cx = lerp(cx, x, 0.08)
      cy = lerp(cy, y, 0.08)
      glow.style.transform = `translate(${cx - 300}px, ${cy - 300}px)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', move, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none z-[1] opacity-[0.11]"
      style={{
        background:
          'radial-gradient(circle, rgba(0,212,255,0.65) 0%, rgba(139,92,246,0.3) 30%, transparent 68%)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  )
}
