'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-[#15153a] ${className}`} aria-hidden="true" />
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[rgba(139,92,246,0.12)] bg-[#0a0a1a] p-5">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="rounded-xl border border-[rgba(139,92,246,0.12)] bg-[#0a0a1a] p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-[rgba(139,92,246,0.12)]">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-48 flex-1" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard content">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function ToolsPageSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading tools">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function KeysPageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading API keys">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
}
