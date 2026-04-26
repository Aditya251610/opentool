'use client'

import { useEffect, useRef } from 'react'
import {
  GitHubIcon,
  NotionIcon,
  SlackIcon,
  LinearIcon,
  GmailIcon,
  GoogleCalendarIcon,
  VercelIcon,
  ResendIcon,
  NeonIcon,
  GitLabIcon,
  JiraIcon,
  MicrosoftIcon,
  SentryIcon,
  CloudflareIcon,
  DiscordIcon,
} from '@/components/icons'

const PROVIDERS = [
  { Icon: GitHubIcon, opacity: 0.12 },
  { Icon: NotionIcon, opacity: 0.1 },
  { Icon: SlackIcon, opacity: 0.11 },
  { Icon: LinearIcon, opacity: 0.1 },
  { Icon: GmailIcon, opacity: 0.09 },
  { Icon: GoogleCalendarIcon, opacity: 0.09 },
  { Icon: VercelIcon, opacity: 0.11 },
  { Icon: ResendIcon, opacity: 0.08 },
  { Icon: NeonIcon, opacity: 0.09 },
  { Icon: GitLabIcon, opacity: 0.09 },
  { Icon: JiraIcon, opacity: 0.08 },
  { Icon: MicrosoftIcon, opacity: 0.09 },
  { Icon: SentryIcon, opacity: 0.08 },
  { Icon: CloudflareIcon, opacity: 0.09 },
  { Icon: DiscordIcon, opacity: 0.1 },
]

// Pre-generate positions so they don't change on re-render
const POSITIONS = PROVIDERS.map((_, i) => ({
  // Scatter across full area but avoid dead center (where text is)
  x: 5 + ((i * 37 + 13) % 90),
  y: 5 + ((i * 29 + 7) % 85),
  size: 28 + (i % 3) * 12, // 28, 40, 52
  drift: 15 + (i % 4) * 8, // how far they float
  duration: 18 + (i % 5) * 6, // 18-42s cycle
  delay: -(i * 3.7), // stagger start
  rotateRange: 8 + (i % 3) * 4, // subtle rotation
}))

export default function FloatingLogos() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll<HTMLDivElement>('[data-float]')
    const animations: Animation[] = []

    items.forEach((el, i) => {
      const p = POSITIONS[i]
      if (!p) return

      const anim = el.animate(
        [
          { transform: `translate(0px, 0px) rotate(0deg)`, opacity: PROVIDERS[i].opacity },
          {
            transform: `translate(${p.drift * 0.6}px, -${p.drift}px) rotate(${p.rotateRange}deg)`,
            opacity: PROVIDERS[i].opacity * 1.3,
          },
          {
            transform: `translate(-${p.drift * 0.4}px, ${p.drift * 0.5}px) rotate(-${p.rotateRange * 0.5}deg)`,
            opacity: PROVIDERS[i].opacity * 0.8,
          },
          { transform: `translate(0px, 0px) rotate(0deg)`, opacity: PROVIDERS[i].opacity },
        ],
        {
          duration: p.duration * 1000,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: p.delay * 1000,
        },
      )
      animations.push(anim)
    })

    return () => animations.forEach((a) => a.cancel())
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {PROVIDERS.map(({ Icon, opacity }, i) => {
        const p = POSITIONS[i]
        return (
          <div
            key={i}
            data-float
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity,
              filter: 'blur(0.5px)',
            }}
          >
            <Icon size={p.size} />
          </div>
        )
      })}
    </div>
  )
}
