import { Skeleton } from "@/components/ui/skeleton"

export default function StationsLoading() {
  return (
    <div
      className="flex flex-col gap-6 my-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading stations"
    >
      <span className="sr-only">Loading stations…</span>
      {/* Stats Cards Loading */}      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Header Loading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table Loading */}
      <div className="space-y-3">
        {/* Table Header */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-16 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
