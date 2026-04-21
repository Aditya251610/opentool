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
    let raf: number | null = null
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      cx = lerp(cx, x, 0.08)
      cy = lerp(cy, y, 0.08)
      glow.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`

      // Stop RAF when close enough to target (mouse idle)
      if (Math.abs(cx - x) < 0.5 && Math.abs(cy - y) < 0.5) {
        raf = null
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const startAnimation = () => {
      if (raf === null) {
        raf = requestAnimationFrame(tick)
      }
      // Reset idle timer
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        // Let animation coast to a stop naturally via the distance check in tick
      }, 100)
    }

    const move = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      startAnimation()
    }

    window.addEventListener('mousemove', move, { passive: true })

    return () => {
      window.removeEventListener('mousemove', move)
      if (raf !== null) cancelAnimationFrame(raf)
      if (idleTimer) clearTimeout(idleTimer)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[400px] h-[400px] pointer-events-none z-[1] opacity-[0.12]"
      style={{
        background:
          'radial-gradient(circle, rgba(0,212,255,0.45) 0%, rgba(139,92,246,0.2) 35%, transparent 65%)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  )
}
