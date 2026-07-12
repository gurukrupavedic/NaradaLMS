'use client'

import { useState } from 'react'

import { EvaluateAction } from '@/components/teacher/evaluate-action'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRightIcon, CaretDownIcon, PencilSimpleIcon } from '@/components/ui/icons'
import { type RosterRow, type RosterStudent } from '@/lib/roster'
import { cn } from '@/lib/utils'

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function studentSubtitle(student: RosterStudent): string {
  const parts: string[] = []
  if (student.city) parts.push(student.city)
  if (student.joinedAt) parts.push(`joined ${formatShortDate(student.joinedAt)}`)
  return parts.join(' · ')
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.at(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function RosterAccordion({
  batchId,
  roster,
  onOpenHistory,
}: {
  batchId: string
  roster: RosterRow[]
  onOpenHistory: (studentId: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(studentId: string) {
    setExpandedId(current => (current === studentId ? null : studentId))
  }

  return (
    <div className="divide-y divide-border/30 border-t border-border/50">
      {roster.map(row => {
        const open = expandedId === row.student.id
        const subtitle = studentSubtitle(row.student)

        return (
          <div key={row.student.id}>
            <button
              type="button"
              onClick={() => toggle(row.student.id)}
              aria-expanded={open}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                open ? 'bg-muted/40' : 'hover:bg-muted/20',
              )}
            >
              <CaretDownIcon
                strokeWidth={2}
                className={cn(
                  'size-3 shrink-0 text-muted-foreground transition-transform',
                  !open && '-rotate-90',
                )}
              />
              <span className="flex size-9 shrink-0 items-center justify-center bg-muted font-mono text-xs font-semibold text-muted-foreground ring-1 ring-border">
                {getInitials(row.student.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{row.student.name}</span>
                {subtitle && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {subtitle}
                  </span>
                )}
              </span>
              {row.current && (
                <span className="hidden max-w-40 shrink-0 truncate text-right text-xs text-muted-foreground md:block">
                  {row.current.chapter.code} {row.current.chapter.title}
                </span>
              )}
              {row.current ? (
                <ProficiencyBadge level={row.current.level} compact />
              ) : (
                <span className="text-xs text-muted-foreground">No chapters yet</span>
              )}
            </button>

            {open && (
              <div className="divide-y divide-border/30 bg-muted/20">
                {row.chapterMarks.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    This batch&apos;s track has no chapters yet.
                  </p>
                )}
                {row.chapterMarks.map(mark => (
                  <div key={mark.chapter.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                      {mark.chapter.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{mark.chapter.title}</span>
                    <ProficiencyBadge level={mark.level} compact />
                    <EvaluateAction
                      batchId={batchId}
                      studentId={row.student.id}
                      studentName={row.student.name}
                      chapterId={mark.chapter.id}
                      chapterCode={mark.chapter.code}
                      chapterTitle={mark.chapter.title}
                      initialLevel={mark.level}
                      initialNotes={mark.latest?.notes ?? ''}
                      trigger={
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Evaluate ${mark.chapter.title}`}
                        >
                          <PencilSimpleIcon className="size-3.5" />
                        </Button>
                      }
                    />
                  </div>
                ))}
                <div className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenHistory(row.student.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View full history
                    <ArrowUpRightIcon className="size-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
