'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { getBatchDetailAction } from '@/lib/admin-actions'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CalendarBlankIcon, ClockIcon, UsersIcon, VideoCameraIcon } from '@/components/ui/icons'
import type { ApiBatchDetail, BatchStatus } from '@/lib/types'

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
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

function BatchDetailBody({ row, detail }: { row: AdminBatchRow; detail: ApiBatchDetail }) {
  const instructors = detail.members.filter(m => m.role !== 'student')
  const students = detail.members.filter(m => m.role === 'student')

  return (
    <div className="space-y-5">
      {(row.startDate || row.meetingUrl) && (
        <div className="space-y-1">
          {row.startDate && (
            <p className="flex items-center gap-1.5 text-sm">
              <CalendarBlankIcon className="size-3.5 text-muted-foreground" />
              {formatDate(row.startDate)}
            </p>
          )}
          {row.meetingUrl && (
            <a
              href={row.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <VideoCameraIcon className="size-3.5" />
              Meeting link
            </a>
          )}
        </div>
      )}

      {detail.classSlots.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Schedule
          </p>
          <div className="space-y-1">
            {detail.classSlots.map(slot => (
              <p key={slot.dayOfWeek} className="text-sm">
                {DAY_NAMES[slot.dayOfWeek]} · {formatTime(slot.time)} · {slot.durationMinutes}min
              </p>
            ))}
          </div>
        </div>
      )}

      {instructors.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <UsersIcon className="size-3.5" />
            Instructors &amp; TAs
          </p>
          <div className="space-y-1.5">
            {instructors.map(member => (
              <div key={member.profileId} className="flex items-center justify-between gap-2">
                <span className="text-sm">{member.name}</span>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Students ({students.length})
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students enrolled.</p>
        ) : (
          <div className="space-y-1.5">
            {students.map(member => (
              <p key={member.profileId} className="text-sm">
                {member.name}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminBatchList({ groups }: { groups: AdminBatchGroup[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AdminBatchRow | null>(null)
  const [detail, setDetail] = useState<ApiBatchDetail | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSelect(row: AdminBatchRow) {
    setSelected(row)
    setDetail(null)
    setOpen(true)
    startTransition(async () => {
      const result = await getBatchDetailAction(row.id)
      setDetail(result)
    })
  }

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
                <button
                  key={batch.id}
                  onClick={() => handleSelect(batch)}
                  className={cn(
                    'bg-card flex w-full items-center justify-between gap-3 px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/50',
                  )}
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
                      <p className="mt-1 flex items-center justify-end gap-1 text-primary">
                        <VideoCameraIcon className="size-3.5" />
                        Meeting link
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col overflow-hidden">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{selected.code}</SheetTitle>
                <SheetDescription>{selected.trackLabel}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-auto px-4 pb-4">
                {detail ? (
                  <BatchDetailBody row={selected} detail={detail} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isPending ? 'Loading…' : 'No data.'}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
