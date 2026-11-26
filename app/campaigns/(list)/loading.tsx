import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/layouts/app-shell'

export default function CampaignsLoading() {
  return (
    <AppShell withFooter={false}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-3xl md:text-5xl mb-3">Campaigns</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Every sequence you have generated. Open one to keep editing.
          </p>
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="flex flex-col"
          >
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t pt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
