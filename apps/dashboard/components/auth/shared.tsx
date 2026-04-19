'use client'

import { motion } from 'framer-motion'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

export function TerminalLine({
  text,
  color,
  delay,
}: {
  text: string
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease }}
    >
      <span style={{ color, fontFamily: "'Geist Mono', monospace", fontSize: 13 }}>{text}</span>
    </motion.div>
  )
}

interface FloatingGridProps {
  /** SVG pattern ID — must be unique per page to avoid conflicts */
  patternId?: string
  /** Glow vertical position */
  glowPosition?: string
  /** Glow size in px */
  glowSize?: number
  /** Glow opacity */
  glowOpacity?: number
  /** Scan line animation duration in seconds */
  scanDuration?: number
}

export function FloatingGrid({
  patternId = 'auth-grid',
  glowPosition = 'top-1/4',
  glowSize = 600,
  glowOpacity = 0.08,
  scanDuration = 8,
}: FloatingGridProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={`absolute ${glowPosition} left-1/2 -translate-x-1/2 rounded-full`}
        style={{
          width: glowSize,
          height: glowSize,
          background: `radial-gradient(circle, rgba(0,212,255,${glowOpacity}) 0%, transparent 70%)`,
        }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: scanDuration, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
