'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

const CHARS =
  '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export default function TextScramble({
  text,
  className = '',
  speed = 30,
}: {
  text: string
  className?: string
  speed?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(text.replace(/[^ ]/g, ' '))
  const hasRun = useRef(false)

  useEffect(() => {
    if (!inView || hasRun.current) return
    hasRun.current = true

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(text)
      return
    }

    let frame = 0
    const totalFrames = text.length + 12

    const tick = () => {
      let result = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          result += ' '
        } else if (frame > i + 4) {
          result += text[i]
        } else if (frame > i - 2) {
          result += CHARS[Math.floor(Math.random() * CHARS.length)]
        } else {
          result += ' '
        }
      }
      setDisplay(result)
      frame++
      if (frame < totalFrames) {
        setTimeout(tick, speed)
      }
    }
    tick()
  }, [inView, text, speed])

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  )
}
