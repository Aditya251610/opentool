'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

// Random space facts shown as toast
const SPACE_FACTS = [
  '🌌 There are more stars in the universe than grains of sand on Earth.',
  '🚀 Light from the Sun takes 8 minutes to reach Earth.',
  "🪐 Saturn would float if placed in water — it's less dense.",
  '⭐ Neutron stars spin up to 600 times per second.',
  "🌑 There's a planet made entirely of diamonds — 55 Cancri e.",
  '🔭 The observable universe is 93 billion light-years across.',
  '☄️ A day on Venus is longer than its year.',
  '🌟 You are literally made of star stuff — Carl Sagan',
]

export default function EasterEggs() {
  const [konamiIndex, setKonamiIndex] = useState(0)
  const [warpMode, setWarpMode] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [scrollSecret, setScrollSecret] = useState(false)

  // Konami code listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === KONAMI[konamiIndex]) {
        const next = konamiIndex + 1
        if (next === KONAMI.length) {
          setWarpMode(true)
          setKonamiIndex(0)
          setTimeout(() => setWarpMode(false), 4000)
        } else {
          setKonamiIndex(next)
        }
      } else {
        setKonamiIndex(0)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [konamiIndex])

  // Scroll to very bottom discovery
  useEffect(() => {
    let shown = false
    const check = () => {
      if (shown) return
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 20
      if (atBottom) {
        shown = true
        setScrollSecret(true)
        setTimeout(() => setScrollSecret(false), 5000)
      }
    }
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  // Logo click counter — exposed as a global
  const handleLogoClick = useCallback(() => {
    const count = ((window as unknown as Record<string, number>).__ot_clicks =
      ((window as unknown as Record<string, number>).__ot_clicks || 0) + 1)
    if (count === 7) {
      const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)]
      setToast(fact)
      ;(window as unknown as Record<string, number>).__ot_clicks = 0
      setTimeout(() => setToast(null), 4000)
    }
  }, [])

  // Attach logo click listener
  useEffect(() => {
    const logo = document.querySelector('nav a[href="/"]')
    if (!logo) return
    const handler = () => handleLogoClick()
    logo.addEventListener('click', handler)
    return () => logo.removeEventListener('click', handler)
  }, [handleLogoClick])

  return (
    <>
      {/* Warp speed overlay — Konami code activated */}
      <AnimatePresence>
        {warpMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {/* Warp streaks */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = Math.random() * 360
              const dist = 20 + Math.random() * 40
              const delay = Math.random() * 0.3
              const dur = 0.4 + Math.random() * 0.6
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-[2px] rounded-full"
                  style={{
                    height: `${30 + Math.random() * 120}px`,
                    background: `linear-gradient(to bottom, transparent, ${Math.random() > 0.5 ? '#00d4ff' : '#8b5cf6'}, transparent)`,
                    transformOrigin: 'center top',
                    rotate: `${angle}deg`,
                  }}
                  initial={{ opacity: 0, scaleY: 0, y: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scaleY: [0, 1.5, 2],
                    y: [0, -dist * 5, -dist * 15],
                  }}
                  transition={{ duration: dur, delay, ease: 'easeOut', repeat: 3 }}
                />
              )
            })}

            {/* Flash */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            {/* Text */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 1.2] }}
              transition={{ duration: 3, times: [0, 0.15, 0.7, 1] }}
            >
              <span className="text-[28px] md:text-[48px] font-extrabold text-white tracking-[0.2em] drop-shadow-[0_0_30px_rgba(0,212,255,0.5)]">
                WARP SPEED 🚀
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast — space fact */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
            transition={{ duration: 0.4 }}
            className="fixed bottom-8 left-1/2 z-[9999] max-w-[420px] px-5 py-3 rounded-xl border border-brand/30 bg-surface-card/95 backdrop-blur-xl shadow-[0_0_40px_rgba(0,212,255,0.2)]"
          >
            <p className="text-sm text-white/80 leading-relaxed">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll bottom secret */}
      <AnimatePresence>
        {scrollSecret && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] text-xs text-white/30 font-mono"
          >
            you found the edge of the universe 🌌 — thanks for scrolling this far
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
