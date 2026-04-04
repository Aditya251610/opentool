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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M1.043 12.478a.99.99 0 01.26.683l.003.17a10.97 10.97 0 009.366 9.363l.17.004a.99.99 0 01.683.26l.08.085a.626.626 0 01-.473 1.054l-.23-.007C4.922 23.665.335 19.078.007 13.098L0 12.868a.626.626 0 011.043-.39zM12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12c-.353 0-.703-.015-1.05-.045a.625.625 0 01-.39-1.08l8.376-8.376a.94.94 0 00.275-.665V7.586a.94.94 0 00-.94-.94h-6.248a.94.94 0 00-.664.275L4.983 15.297a.94.94 0 00-.275.664v.307a.625.625 0 01-1.08.428A11.945 11.945 0 010 12C0 5.373 5.373 0 12 0zM3.39 17.675a.625.625 0 01.027.856 .62.62 0 01-.003.003l-.02.022a10.9 10.9 0 002.05 2.05l.022-.02a.625.625 0 01.86.024l.066.073a.625.625 0 01-.479 1.044 12.009 12.009 0 01-3.64-3.64.625.625 0 011.117-.412z"/>
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

export function PostgreSQLIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M17.128 0a10.134 10.134 0 00-2.755.403l-.063.02A10.922 10.922 0 0012.6.258C11.422.238 10.4.524 9.594 1 8.79.711 7.122.392 5.366.53 4.064.636 2.543 1.117 1.4 2.456.258 3.797-.197 5.85.12 8.473c.09.742.397 2.082.863 3.607.464 1.518 1.103 3.215 1.942 4.634.418.71.908 1.353 1.517 1.82.606.466 1.38.726 2.163.565.523-.107.947-.398 1.29-.748a7.83 7.83 0 001.093.504 8.46 8.46 0 002.193.467 2.58 2.58 0 01-.5 1.26c-.356.448-.812.732-1.192.9a.33.33 0 00-.16.432.34.34 0 00.432.16c.463-.203 1.022-.55 1.46-1.103.443-.56.773-1.322.725-2.32a5.88 5.88 0 001.063-.387c.248-.12.478-.252.683-.393l.008.008a7.28 7.28 0 001.2.514c.766.248 1.722.378 2.698-.068.976-.447 1.378-1.152 1.572-1.898.195-.753.195-1.56.153-2.258a12.035 12.035 0 001.473-3.076c.275-.823.497-1.742.487-2.57-.01-.821-.23-1.673-.877-2.222-.652-.554-1.437-.557-2.078-.438a5.03 5.03 0 00-1.395.566 10.036 10.036 0 00-4.286-2.168A10.086 10.086 0 0017.128 0zM15.9.676a9.385 9.385 0 011.493.18 9.37 9.37 0 013.924 1.93c-.154.1-.304.212-.442.34-.945.877-1.32 2.15-1.46 3.15a9.1 9.1 0 00-.094 1.938c.016.293.044.563.074.792l.013.098c.024.187.042.357.05.514.027.5-.04.848-.232 1.126-.195.282-.553.534-1.2.723-.456.133-.835.168-1.198.148l.013-.183c.03-.413.04-.867-.02-1.293-.067-.49-.225-.97-.566-1.32-.368-.378-.738-.512-1.053-.586a5.94 5.94 0 00-.773-.136c.057-.386.075-.804.04-1.238a8.29 8.29 0 00-.196-1.152 6.735 6.735 0 00-.936-2.16A5.105 5.105 0 0015.9.676z"/>
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
