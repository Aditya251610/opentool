// Real SVG provider icons as React components
// Using official brand marks — monochrome variants adapted for dark UI

import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  className?: string
  style?: CSSProperties
}

export function GitHubIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

export function NotionIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.56 2.16c-.42-.326-.98-.7-2.055-.607L3.72 2.55c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.42c.093.42 0 .84-.42.887l-.7.14v10.264c-.607.327-1.167.514-1.634.514-.746 0-.933-.234-1.493-.934l-4.577-7.186v6.953l1.447.327s0 .84-1.167.84l-3.22.187c-.093-.187 0-.653.327-.727l.84-.233V9.854L7.46 9.62c-.093-.42.14-1.026.793-1.073l3.453-.234 4.764 7.28v-6.44l-1.214-.14c-.093-.514.28-.886.747-.933zM2.8 1.02l13.356-.98c1.634-.14 2.054-.047 3.08.7l4.25 2.987c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.447-.094-1.96-.747L1.024 18.4C.466 17.653.28 17.093.28 16.447V2.793C.28 1.96.653 1.066 2.8 1.02z"/>
    </svg>
  )
}

export function SlackIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z"/>
    </svg>
  )
}

export function LinearIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className} style={style}>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.22 61.52a3.49 3.49 0 001.18 4.77L42.44 98.77c-11.02 0-20.92-4.69-28.22-12.99L1.22 61.52zM42.44 98.77L1.22 57.56c0-11.02 4.69-20.92 12.99-28.22L70.66 85.79c-7.3 7.3-17.2 11.99-28.22 11.99v-.01zM70.66 85.79L13.21 28.34c7.3-7.3 17.2-11.99 28.22-11.99l57.56 57.56c0 11.02-4.69 20.92-12.99 28.22L70.66 85.79h-.01.01zM98.99 73.91L42.44 17.35a40.72 40.72 0 0115.12-2.89l44.33 44.33a40.72 40.72 0 01-2.89 15.12h-.01zM99.78 46.51L69.94 16.68a41.14 41.14 0 0115.44 6.45l20.85 20.85a41.08 41.08 0 01-6.45 2.54v-.01zM96.07 18.45L96.07 18.45a41.44 41.44 0 00-10.97-7.48l.32.32a41.44 41.44 0 017.48 10.97l3.17-3.81h-.01z"/>
    </svg>
  )
}

export function GmailIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  )
}

export function GoogleCalendarIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H5.684v5.684h12.632zM5.684 18.316H0V5.684h5.684v12.632zM7.895 12.947h2.526V9.474h1.263V8.21H10.42v-.737h-1.263v.737H7.895v4.737zM12.947 14.842h1.263v-1.895h1.263v-1.263H14.21v-1.263h-1.263v1.263h-1.263v1.263h1.263v1.895z"/>
    </svg>
  )
}

export function StripeIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  )
}

export function VercelIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 1L24 22H0L12 1z"/>
    </svg>
  )
}

export function ResendIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M2.023 0L22 12 2.023 24 2 12.757l12.13-1.257L2 10.142z"/>
    </svg>
  )
}

export function NeonIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className} style={style}>
      <path d="M27.516 0H8.484A8.484 8.484 0 000 8.484V24.6a2.916 2.916 0 005.088 1.944l6.468-7.344V27.6a2.4 2.4 0 004.32 1.44L18 26.4V8.4l9.516 12.816V8.484A8.484 8.484 0 0036 8.484v18.132A8.484 8.484 0 0127.516 36H8.484A8.484 8.484 0 010 27.516" fill="currentColor"/>
    </svg>
  )
}

// OpenTool logo from logo-wordmark.svg — pixel art, theme-adapted color
export function OpenToolLogo({ className = '', color = '#ededed' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 628 165" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={color}>
        {/* O */}
        <rect x="58" y="48" width="9" height="9"/>
        <rect x="68" y="48" width="9" height="9"/>
        <rect x="78" y="48" width="9" height="9"/>
        <rect x="48" y="58" width="9" height="9"/>
        <rect x="88" y="58" width="9" height="9"/>
        <rect x="48" y="68" width="9" height="9"/>
        <rect x="88" y="68" width="9" height="9"/>
        <rect x="48" y="78" width="9" height="9"/>
        <rect x="88" y="78" width="9" height="9"/>
        <rect x="48" y="88" width="9" height="9"/>
        <rect x="88" y="88" width="9" height="9"/>
        <rect x="48" y="98" width="9" height="9"/>
        <rect x="88" y="98" width="9" height="9"/>
        <rect x="58" y="108" width="9" height="9"/>
        <rect x="68" y="108" width="9" height="9"/>
        <rect x="78" y="108" width="9" height="9"/>
        {/* P */}
        <rect x="117" y="48" width="9" height="9"/>
        <rect x="127" y="48" width="9" height="9"/>
        <rect x="137" y="48" width="9" height="9"/>
        <rect x="147" y="48" width="9" height="9"/>
        <rect x="117" y="58" width="9" height="9"/>
        <rect x="157" y="58" width="9" height="9"/>
        <rect x="117" y="68" width="9" height="9"/>
        <rect x="157" y="68" width="9" height="9"/>
        <rect x="117" y="78" width="9" height="9"/>
        <rect x="127" y="78" width="9" height="9"/>
        <rect x="137" y="78" width="9" height="9"/>
        <rect x="147" y="78" width="9" height="9"/>
        <rect x="117" y="88" width="9" height="9"/>
        <rect x="117" y="98" width="9" height="9"/>
        <rect x="117" y="108" width="9" height="9"/>
        {/* E */}
        <rect x="186" y="48" width="9" height="9"/>
        <rect x="196" y="48" width="9" height="9"/>
        <rect x="206" y="48" width="9" height="9"/>
        <rect x="216" y="48" width="9" height="9"/>
        <rect x="226" y="48" width="9" height="9"/>
        <rect x="186" y="58" width="9" height="9"/>
        <rect x="186" y="68" width="9" height="9"/>
        <rect x="186" y="78" width="9" height="9"/>
        <rect x="196" y="78" width="9" height="9"/>
        <rect x="206" y="78" width="9" height="9"/>
        <rect x="216" y="78" width="9" height="9"/>
        <rect x="186" y="88" width="9" height="9"/>
        <rect x="186" y="98" width="9" height="9"/>
        <rect x="186" y="108" width="9" height="9"/>
        <rect x="196" y="108" width="9" height="9"/>
        <rect x="206" y="108" width="9" height="9"/>
        <rect x="216" y="108" width="9" height="9"/>
        <rect x="226" y="108" width="9" height="9"/>
        {/* N */}
        <rect x="255" y="48" width="9" height="9"/>
        <rect x="295" y="48" width="9" height="9"/>
        <rect x="255" y="58" width="9" height="9"/>
        <rect x="265" y="58" width="9" height="9"/>
        <rect x="295" y="58" width="9" height="9"/>
        <rect x="255" y="68" width="9" height="9"/>
        <rect x="275" y="68" width="9" height="9"/>
        <rect x="295" y="68" width="9" height="9"/>
        <rect x="255" y="78" width="9" height="9"/>
        <rect x="285" y="78" width="9" height="9"/>
        <rect x="295" y="78" width="9" height="9"/>
        <rect x="255" y="88" width="9" height="9"/>
        <rect x="295" y="88" width="9" height="9"/>
        <rect x="255" y="98" width="9" height="9"/>
        <rect x="295" y="98" width="9" height="9"/>
        <rect x="255" y="108" width="9" height="9"/>
        <rect x="295" y="108" width="9" height="9"/>
        {/* T */}
        <rect x="324" y="48" width="9" height="9"/>
        <rect x="334" y="48" width="9" height="9"/>
        <rect x="344" y="48" width="9" height="9"/>
        <rect x="354" y="48" width="9" height="9"/>
        <rect x="364" y="48" width="9" height="9"/>
        <rect x="344" y="58" width="9" height="9"/>
        <rect x="344" y="68" width="9" height="9"/>
        <rect x="344" y="78" width="9" height="9"/>
        <rect x="344" y="88" width="9" height="9"/>
        <rect x="344" y="98" width="9" height="9"/>
        <rect x="344" y="108" width="9" height="9"/>
        {/* O */}
        <rect x="403" y="48" width="9" height="9"/>
        <rect x="413" y="48" width="9" height="9"/>
        <rect x="423" y="48" width="9" height="9"/>
        <rect x="393" y="58" width="9" height="9"/>
        <rect x="433" y="58" width="9" height="9"/>
        <rect x="393" y="68" width="9" height="9"/>
        <rect x="433" y="68" width="9" height="9"/>
        <rect x="393" y="78" width="9" height="9"/>
        <rect x="433" y="78" width="9" height="9"/>
        <rect x="393" y="88" width="9" height="9"/>
        <rect x="433" y="88" width="9" height="9"/>
        <rect x="393" y="98" width="9" height="9"/>
        <rect x="433" y="98" width="9" height="9"/>
        <rect x="403" y="108" width="9" height="9"/>
        <rect x="413" y="108" width="9" height="9"/>
        <rect x="423" y="108" width="9" height="9"/>
        {/* O */}
        <rect x="472" y="48" width="9" height="9"/>
        <rect x="482" y="48" width="9" height="9"/>
        <rect x="492" y="48" width="9" height="9"/>
        <rect x="462" y="58" width="9" height="9"/>
        <rect x="502" y="58" width="9" height="9"/>
        <rect x="462" y="68" width="9" height="9"/>
        <rect x="502" y="68" width="9" height="9"/>
        <rect x="462" y="78" width="9" height="9"/>
        <rect x="502" y="78" width="9" height="9"/>
        <rect x="462" y="88" width="9" height="9"/>
        <rect x="502" y="88" width="9" height="9"/>
        <rect x="462" y="98" width="9" height="9"/>
        <rect x="502" y="98" width="9" height="9"/>
        <rect x="472" y="108" width="9" height="9"/>
        <rect x="482" y="108" width="9" height="9"/>
        <rect x="492" y="108" width="9" height="9"/>
        {/* L */}
        <rect x="531" y="48" width="9" height="9"/>
        <rect x="531" y="58" width="9" height="9"/>
        <rect x="531" y="68" width="9" height="9"/>
        <rect x="531" y="78" width="9" height="9"/>
        <rect x="531" y="88" width="9" height="9"/>
        <rect x="531" y="98" width="9" height="9"/>
        <rect x="531" y="108" width="9" height="9"/>
        <rect x="541" y="108" width="9" height="9"/>
        <rect x="551" y="108" width="9" height="9"/>
        <rect x="561" y="108" width="9" height="9"/>
        <rect x="571" y="108" width="9" height="9"/>
      </g>
    </svg>
  )
}
