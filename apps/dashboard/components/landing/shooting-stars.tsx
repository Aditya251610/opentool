'use client'

import { useEffect, useState } from 'react'

interface Star {
  id: number
  top: number
  delay: number
  duration: number
  angle: number
}

export default function ShootingStars() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let id = 0
    const spawn = () => {
      const star: Star = {
        id: id++,
        top: Math.random() * 40, // top 40% of viewport
        delay: 0,
        duration: 1.5 + Math.random() * 2,
        angle: 15 + Math.random() * 25, // 15-40 degrees
      }
      setStars((prev) => [...prev.slice(-3), star]) // keep max 4

      // Next star in 8-20 seconds (rare, delightful)
      const next = 8000 + Math.random() * 12000
      timer = window.setTimeout(spawn, next)
    }

    // First star after 5-10 seconds
    let timer = window.setTimeout(spawn, 5000 + Math.random() * 5000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9998 }}
      aria-hidden="true"
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute"
          style={{
            top: `${star.top}%`,
            left: '-4px',
            width: '4px',
            height: '4px',
            background: '#00d4ff',
            borderRadius: '50%',
            boxShadow:
              '0 0 6px 2px rgba(0,212,255,0.6), -20px 0 30px 2px rgba(0,212,255,0.3), -40px 0 50px 1px rgba(139,92,246,0.2)',
            transform: `rotate(${star.angle}deg)`,
            animation: `shoot-star ${star.duration}s ease-out forwards`,
          }}
          onAnimationEnd={() => setStars((prev) => prev.filter((s) => s.id !== star.id))}
        />
      ))}
    </div>
  )
}
