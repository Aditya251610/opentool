// OpenTool brand palette — centralized color tokens for CLI theming.
// Keep in sync with the dashboard/brand guidelines.

export const PALETTE = {
  accent: '#00BCD4', // cyan — primary brand
  accentBright: '#4DD0E1', // light cyan — highlights
  accentDim: '#00838F', // dark cyan — muted brand
  info: '#29B6F6', // blue — informational
  success: '#66BB6A', // green — ok states
  warn: '#FFA726', // orange — warnings
  error: '#EF5350', // red — errors
  muted: '#78909C', // blue-gray — secondary text
} as const

// Hex to ANSI 256 approximation for terminals that don't support truecolor.
// This gives us the closest 256-color match for our brand palette.
export function hexToAnsi256(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // Check if it's a grayscale value
  if (r === g && g === b) {
    if (r < 8) return 16
    if (r > 248) return 231
    return Math.round(((r - 8) / 247) * 24) + 232
  }

  return (
    16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5)
  )
}
