import { Badge } from '@/components/ui/badge'
import { CalendarBlankIcon, VideoCameraIcon } from '@/components/ui/icons'
import type { BatchStatus } from '@/lib/types'

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type AdminBatchRow = {
  id: string
  code: string
  status: BatchStatus
  startDate: string | null
  meetingUrl: string | null
  trackLabel: string
}

export type AdminBatchGroup = {
  status: BatchStatus
  batches: AdminBatchRow[]
}

export function AdminBatchList({ groups }: { groups: AdminBatchGroup[] }) {
  return (
    <>
      {groups.map(group => {
        const st = STATUS_CONFIG[group.status]
        return (
          <div key={group.status} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="shrink-0 font-serif text-lg font-semibold">
                {st.label}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({group.batches.length})
                </span>
              </h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {group.batches.map(batch => (
                <a
                  key={batch.id}
                  href={`/admin/batches/${batch.id}`}
                  className="bg-card flex items-center justify-between gap-3 px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{batch.code}</span>
                      <Badge variant={st.variant} className="shrink-0">
                        {st.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{batch.trackLabel}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {batch.startDate && (
                      <p className="flex items-center justify-end gap-1">
                        <CalendarBlankIcon className="size-3.5" />
                        {formatDate(batch.startDate)}
                      </p>
                    )}
                    {batch.meetingUrl && (
                      <p className="mt-1 flex items-center justify-end gap-1">
                        <VideoCameraIcon className="size-3.5" />
                        Meeting link
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
