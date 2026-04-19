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
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function NotionIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.56 2.16c-.42-.326-.98-.7-2.055-.607L3.72 2.55c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.42c.093.42 0 .84-.42.887l-.7.14v10.264c-.607.327-1.167.514-1.634.514-.746 0-.933-.234-1.493-.934l-4.577-7.186v6.953l1.447.327s0 .84-1.167.84l-3.22.187c-.093-.187 0-.653.327-.727l.84-.233V9.854L7.46 9.62c-.093-.42.14-1.026.793-1.073l3.453-.234 4.764 7.28v-6.44l-1.214-.14c-.093-.514.28-.886.747-.933zM2.8 1.02l13.356-.98c1.634-.14 2.054-.047 3.08.7l4.25 2.987c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.447-.094-1.96-.747L1.024 18.4C.466 17.653.28 17.093.28 16.447V2.793C.28 1.96.653 1.066 2.8 1.02z" />
    </svg>
  )
}

export function SlackIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
    </svg>
  )
}

export function LinearIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="96 96 320 320"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M357.358 374.306c1.758 1.758 4.581 1.866 6.416.189a163.595 163.595 0 005.316-5.081c62.547-62.547 62.547-163.956 0-226.504-62.548-62.547-163.957-62.547-226.504 0a163.595 163.595 0 00-5.081 5.316c-1.677 1.835-1.569 4.658.189 6.416l219.664 219.664Z" />
      <path d="M336.333 394.672c2.627-1.528 3.024-5.118.875-7.267L124.595 174.792c-2.149-2.149-5.739-1.752-7.267.875a158.87 158.87 0 00-7.119 13.725c-.811 1.771-.41 3.852.968 5.229l206.201 206.202c1.378 1.378 3.459 1.779 5.23.968a158.87 158.87 0 0013.725-7.119Z" />
      <path d="M286.659 413.348c3.619-.707 4.86-5.136 2.253-7.743L106.395 223.088c-2.607-2.607-7.036-1.366-7.743 2.253a160.813 160.813 0 00-2.502 18.462 4.666 4.666 0 001.366 3.654l167.027 167.027a4.667 4.667 0 003.654 1.366 160.834 160.834 0 0018.462-2.502Z" />
      <path d="M217.031 411.577c4.45 1.107 7.201-4.155 3.959-7.398L107.821 291.01c-3.243-3.242-8.504-.491-7.398 3.959 6.784 27.279 20.838 53.121 42.163 74.445 21.324 21.324 47.166 35.379 74.445 42.163Z" />
    </svg>
  )
}

export function GmailIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M2 11.956c0-3.485 0-5.227.678-6.558A6.956 6.956 0 015.397 2.678C6.728 2 8.471 2 11.956 2h8.088c3.485 0 5.228 0 6.558.678a6.956 6.956 0 012.72 2.72C30 6.728 30 8.47 30 11.956v8.088c0 3.485 0 5.228-.678 6.558a6.956 6.956 0 01-2.72 2.72C25.272 30 23.529 30 20.044 30h-8.088c-3.485 0-5.228 0-6.559-.678a6.956 6.956 0 01-2.72-2.72C2 25.272 2 23.529 2 20.044V11.956z"
        fill="white"
      />
      <path
        d="M22.052 8.523l-5.988 4.672L9.94 8.523v.001l.008.006v6.543l5.948 4.773 6.056-4.589V8.523z"
        fill="#EA4335"
      />
      <path
        d="M23.623 7.386l-1.572 1.137v6.735l4.948-3.798V9.17s-.6-3.268-3.376-1.784z"
        fill="#FBBC05"
      />
      <path
        d="M22.051 15.258v8.735h3.792s1.08-.112 1.157-1.341V11.459l-4.949 3.799z"
        fill="#34A853"
      />
      <path d="M9.948 24v-8.927l-.008-.006L9.948 24z" fill="#C5221F" />
      <path
        d="M9.94 8.524L8.376 7.394C5.602 5.91 5 9.177 5 9.177v2.288l4.94 3.601V8.524z"
        fill="#C5221F"
      />
      <path d="M9.94 8.524v6.543l.008.006-.008-6.549z" fill="#C5221F" />
      <path
        d="M5 11.467v11.192c.076 1.231 1.157 1.341 1.157 1.341h3.792l-.008-8.933L5 11.467z"
        fill="#4285F4"
      />
    </svg>
  )
}

export function GoogleCalendarIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      style={style}
    >
      <polygon
        fill="#FFFFFF"
        points="195.368 60.632 60.632 60.632 60.632 195.368 195.368 195.368"
      />
      <polygon
        fill="#EA4335"
        points="195.368 256 256 195.368 225.684 190.196 195.368 195.368 189.835 223.098"
      />
      <path
        d="M0 195.368v40.421C0 246.956 9.044 256 20.211 256h40.421l6.225-30.316-6.225-30.316-33.033-5.172L0 195.368z"
        fill="#188038"
      />
      <path
        d="M256 60.632V20.211C256 9.044 246.956 0 235.789 0h-40.421c-3.689 15.036-5.533 26.101-5.533 33.196 0 7.094 1.844 16.24 5.533 27.436 13.41 3.84 23.515 5.76 30.316 5.76s18.169-1.92 30.316-5.76z"
        fill="#1967D2"
      />
      <polygon fill="#FBBC04" points="256 60.632 195.368 60.632 195.368 195.368 256 195.368" />
      <polygon fill="#34A853" points="195.368 195.368 60.632 195.368 60.632 256 195.368 256" />
      <path
        d="M195.368 0H20.211C9.044 0 0 9.044 0 20.211v175.158h60.632V60.632h134.737V0z"
        fill="#4285F4"
      />
      <path
        d="M88.269 165.154c-5.036-3.402-8.522-8.371-10.425-14.939l11.688-4.817c1.061 4.042 2.914 7.175 5.558 9.398 2.627 2.223 5.827 3.318 9.566 3.318 3.823 0 7.108-1.162 9.853-3.486 2.745-2.324 4.126-5.289 4.126-8.876 0-3.672-1.448-6.67-4.345-8.994-2.897-2.324-6.535-3.486-10.88-3.486h-6.754v-11.571h6.063c3.739 0 6.889-1.011 9.449-3.032 2.56-2.021 3.84-4.783 3.84-8.303 0-3.133-1.145-5.625-3.436-7.495-2.29-1.869-5.187-2.813-8.707-2.813-3.436 0-6.164.91-8.185 2.745-2.02 1.841-3.538 4.165-4.413 6.754L79.697 104.741c1.533-4.345 4.345-8.185 8.472-11.503 4.126-3.318 9.398-4.986 15.797-4.986 4.733 0 8.994.91 12.767 2.745 3.773 1.836 6.737 4.38 8.876 7.613 2.139 3.25 3.2 6.888 3.2 10.93 0 4.126-.994 7.613-2.981 10.476-1.987 2.863-4.43 5.052-7.327 6.585v.69c3.74 1.543 6.99 4.075 9.398 7.326 2.442 3.285 3.672 7.209 3.672 11.79 0 4.581-1.163 8.673-3.487 12.261-2.324 3.587-5.54 6.417-9.616 8.471-4.093 2.055-8.69 3.099-13.794 3.099-5.911.017-11.368-1.684-16.404-5.087zM160.067 107.15l-12.833 9.28-6.417-9.735L163.84 90.088h8.825V168.42h-12.598V107.15z"
        fill="#4285F4"
      />
    </svg>
  )
}

export function StripeIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  )
}

export function VercelIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 1L24 22H0L12 1z" />
    </svg>
  )
}

export function ResendIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1800 1800"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" />
    </svg>
  )
}

export function NeonIcon({ size = 20, className = '', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M63 0.018V63.553L38.418 42.25V63.553H0V0L63 0.018ZM7.723 55.839H30.695V25.324L55.278 47.048V7.729L7.723 7.716V55.839Z"
        fill="#37C38F"
      />
    </svg>
  )
}

// OpenTool pixel wordmark — original pixel-art style with space gradient
export function OpenToolLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 628 165" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pixel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <g fill="url(#pixel-grad)">
        {/* O */}
        <rect x="58" y="48" width="9" height="9" />
        <rect x="68" y="48" width="9" height="9" />
        <rect x="78" y="48" width="9" height="9" />
        <rect x="48" y="58" width="9" height="9" />
        <rect x="88" y="58" width="9" height="9" />
        <rect x="48" y="68" width="9" height="9" />
        <rect x="88" y="68" width="9" height="9" />
        <rect x="48" y="78" width="9" height="9" />
        <rect x="88" y="78" width="9" height="9" />
        <rect x="48" y="88" width="9" height="9" />
        <rect x="88" y="88" width="9" height="9" />
        <rect x="48" y="98" width="9" height="9" />
        <rect x="88" y="98" width="9" height="9" />
        <rect x="58" y="108" width="9" height="9" />
        <rect x="68" y="108" width="9" height="9" />
        <rect x="78" y="108" width="9" height="9" />
        {/* P */}
        <rect x="117" y="48" width="9" height="9" />
        <rect x="127" y="48" width="9" height="9" />
        <rect x="137" y="48" width="9" height="9" />
        <rect x="147" y="48" width="9" height="9" />
        <rect x="117" y="58" width="9" height="9" />
        <rect x="157" y="58" width="9" height="9" />
        <rect x="117" y="68" width="9" height="9" />
        <rect x="157" y="68" width="9" height="9" />
        <rect x="117" y="78" width="9" height="9" />
        <rect x="127" y="78" width="9" height="9" />
        <rect x="137" y="78" width="9" height="9" />
        <rect x="147" y="78" width="9" height="9" />
        <rect x="117" y="88" width="9" height="9" />
        <rect x="117" y="98" width="9" height="9" />
        <rect x="117" y="108" width="9" height="9" />
        {/* E */}
        <rect x="186" y="48" width="9" height="9" />
        <rect x="196" y="48" width="9" height="9" />
        <rect x="206" y="48" width="9" height="9" />
        <rect x="216" y="48" width="9" height="9" />
        <rect x="226" y="48" width="9" height="9" />
        <rect x="186" y="58" width="9" height="9" />
        <rect x="186" y="68" width="9" height="9" />
        <rect x="186" y="78" width="9" height="9" />
        <rect x="196" y="78" width="9" height="9" />
        <rect x="206" y="78" width="9" height="9" />
        <rect x="216" y="78" width="9" height="9" />
        <rect x="186" y="88" width="9" height="9" />
        <rect x="186" y="98" width="9" height="9" />
        <rect x="186" y="108" width="9" height="9" />
        <rect x="196" y="108" width="9" height="9" />
        <rect x="206" y="108" width="9" height="9" />
        <rect x="216" y="108" width="9" height="9" />
        <rect x="226" y="108" width="9" height="9" />
        {/* N */}
        <rect x="255" y="48" width="9" height="9" />
        <rect x="295" y="48" width="9" height="9" />
        <rect x="255" y="58" width="9" height="9" />
        <rect x="265" y="58" width="9" height="9" />
        <rect x="295" y="58" width="9" height="9" />
        <rect x="255" y="68" width="9" height="9" />
        <rect x="275" y="68" width="9" height="9" />
        <rect x="295" y="68" width="9" height="9" />
        <rect x="255" y="78" width="9" height="9" />
        <rect x="285" y="78" width="9" height="9" />
        <rect x="295" y="78" width="9" height="9" />
        <rect x="255" y="88" width="9" height="9" />
        <rect x="295" y="88" width="9" height="9" />
        <rect x="255" y="98" width="9" height="9" />
        <rect x="295" y="98" width="9" height="9" />
        <rect x="255" y="108" width="9" height="9" />
        <rect x="295" y="108" width="9" height="9" />
        {/* T */}
        <rect x="324" y="48" width="9" height="9" />
        <rect x="334" y="48" width="9" height="9" />
        <rect x="344" y="48" width="9" height="9" />
        <rect x="354" y="48" width="9" height="9" />
        <rect x="364" y="48" width="9" height="9" />
        <rect x="344" y="58" width="9" height="9" />
        <rect x="344" y="68" width="9" height="9" />
        <rect x="344" y="78" width="9" height="9" />
        <rect x="344" y="88" width="9" height="9" />
        <rect x="344" y="98" width="9" height="9" />
        <rect x="344" y="108" width="9" height="9" />
        {/* O */}
        <rect x="403" y="48" width="9" height="9" />
        <rect x="413" y="48" width="9" height="9" />
        <rect x="423" y="48" width="9" height="9" />
        <rect x="393" y="58" width="9" height="9" />
        <rect x="433" y="58" width="9" height="9" />
        <rect x="393" y="68" width="9" height="9" />
        <rect x="433" y="68" width="9" height="9" />
        <rect x="393" y="78" width="9" height="9" />
        <rect x="433" y="78" width="9" height="9" />
        <rect x="393" y="88" width="9" height="9" />
        <rect x="433" y="88" width="9" height="9" />
        <rect x="393" y="98" width="9" height="9" />
        <rect x="433" y="98" width="9" height="9" />
        <rect x="403" y="108" width="9" height="9" />
        <rect x="413" y="108" width="9" height="9" />
        <rect x="423" y="108" width="9" height="9" />
        {/* O */}
        <rect x="472" y="48" width="9" height="9" />
        <rect x="482" y="48" width="9" height="9" />
        <rect x="492" y="48" width="9" height="9" />
        <rect x="462" y="58" width="9" height="9" />
        <rect x="502" y="58" width="9" height="9" />
        <rect x="462" y="68" width="9" height="9" />
        <rect x="502" y="68" width="9" height="9" />
        <rect x="462" y="78" width="9" height="9" />
        <rect x="502" y="78" width="9" height="9" />
        <rect x="462" y="88" width="9" height="9" />
        <rect x="502" y="88" width="9" height="9" />
        <rect x="462" y="98" width="9" height="9" />
        <rect x="502" y="98" width="9" height="9" />
        <rect x="472" y="108" width="9" height="9" />
        <rect x="482" y="108" width="9" height="9" />
        <rect x="492" y="108" width="9" height="9" />
        {/* L */}
        <rect x="531" y="48" width="9" height="9" />
        <rect x="531" y="58" width="9" height="9" />
        <rect x="531" y="68" width="9" height="9" />
        <rect x="531" y="78" width="9" height="9" />
        <rect x="531" y="88" width="9" height="9" />
        <rect x="531" y="98" width="9" height="9" />
        <rect x="531" y="108" width="9" height="9" />
        <rect x="541" y="108" width="9" height="9" />
        <rect x="551" y="108" width="9" height="9" />
        <rect x="561" y="108" width="9" height="9" />
        <rect x="571" y="108" width="9" height="9" />
      </g>
    </svg>
  )
}

// Compact pixel "OT" mark — for navbar & favicon
export function OpenToolMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  const id = `pm-${size}`
  const s = 3 // pixel size in viewBox units
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-g)`}>
        {/* O — left side */}
        <rect x={4} y={6} width={s} height={s} />
        <rect x={7} y={6} width={s} height={s} />
        <rect x={10} y={6} width={s} height={s} />
        <rect x={1} y={9} width={s} height={s} />
        <rect x={13} y={9} width={s} height={s} />
        <rect x={1} y={12} width={s} height={s} />
        <rect x={13} y={12} width={s} height={s} />
        <rect x={1} y={15} width={s} height={s} />
        <rect x={13} y={15} width={s} height={s} />
        <rect x={1} y={18} width={s} height={s} />
        <rect x={13} y={18} width={s} height={s} />
        <rect x={1} y={21} width={s} height={s} />
        <rect x={13} y={21} width={s} height={s} />
        <rect x={4} y={24} width={s} height={s} />
        <rect x={7} y={24} width={s} height={s} />
        <rect x={10} y={24} width={s} height={s} />
        {/* T — right side */}
        <rect x={18} y={6} width={s} height={s} />
        <rect x={21} y={6} width={s} height={s} />
        <rect x={24} y={6} width={s} height={s} />
        <rect x={27} y={6} width={s} height={s} />
        <rect x={22.5} y={9} width={s} height={s} />
        <rect x={22.5} y={12} width={s} height={s} />
        <rect x={22.5} y={15} width={s} height={s} />
        <rect x={22.5} y={18} width={s} height={s} />
        <rect x={22.5} y={21} width={s} height={s} />
        <rect x={22.5} y={24} width={s} height={s} />
      </g>
    </svg>
  )
}
