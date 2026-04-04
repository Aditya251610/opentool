export const spring = {
  gentle: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  stiff: { type: 'spring' as const, stiffness: 500, damping: 40 },
}

export const ease = {
  out: [0.0, 0.0, 0.2, 1.0] as [number, number, number, number],
  in: [0.4, 0.0, 1.0, 1.0] as [number, number, number, number],
  smooth: [0.23, 1, 0.32, 1] as [number, number, number, number],
}

export const duration = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
}

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast } },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: duration.normal, ease: ease.out } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: duration.fast } },
}

export const stagger = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

export const staggerFast = {
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
}
