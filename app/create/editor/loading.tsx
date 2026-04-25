import { Skeleton } from '@/components/ui/skeleton'

export default function EditorLoading() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden h-0">
        {/* Email Sidebar */}
        <div className="w-64 border-r border-border p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="h-20 w-full"
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="border-b border-border bg-card p-4 h-20">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </main>
      </div>
    </div>
  )
}
