import { EvaluateAction } from '@/components/teacher/evaluate-action'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type ProficiencyLevel } from '@/lib/proficiency'
import { type PastBatch, type RosterStudent } from '@/lib/roster'
import { type ApiChapter, type ApiEvaluation } from '@/lib/types'

const BATCH_STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.at(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Single-column layout so it reads well both on the full student history page and squeezed into
// StudentHistoryDrawer, which is narrower than a page (Tailwind's lg: breakpoint is viewport-width
// based, so a two-column grid here would try to go two-up inside the drawer regardless of the
// drawer's actual rendered width).
export function StudentHistoryContent({
  batchId,
  student,
  currentChapter,
  historyRows,
  chapterById,
  evaluatorNameById,
  pastBatches,
}: {
  batchId: string
  student: RosterStudent
  currentChapter: { chapter: ApiChapter; level: ProficiencyLevel } | null
  historyRows: ApiEvaluation[]
  chapterById: Map<string, ApiChapter>
  evaluatorNameById: Map<string, string>
  pastBatches: PastBatch[]
}) {
  return (
    <div className="space-y-6">
      <div className="border border-border/70 bg-muted/25 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center bg-muted font-mono text-xs font-semibold text-muted-foreground ring-1 ring-border">
            {getInitials(student.name)}
          </span>
          <p className="min-w-0 truncate text-sm font-semibold">{student.name}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
          {[
            ['Phone', student.phone ?? 'Not provided'],
            ['City', student.city ?? 'Not provided'],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-1 truncate text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        {currentChapter ? (
          <div className="mt-5 border-t border-border/70 pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current chapter
            </p>
            <p className="mt-2 text-sm font-medium">
              {currentChapter.chapter.code} · {currentChapter.chapter.title}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <ProficiencyBadge level={currentChapter.level} compact />
              <EvaluateAction
                batchId={batchId}
                studentId={student.id}
                studentName={student.name}
                chapterId={currentChapter.chapter.id}
                chapterCode={currentChapter.chapter.code}
                chapterTitle={currentChapter.chapter.title}
                initialLevel={currentChapter.level}
                initialNotes={historyRows[0]?.notes ?? ''}
                trigger={
                  <Button size="sm" variant="outline">
                    Evaluate
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <p className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
            This batch&apos;s track has no chapters yet.
          </p>
        )}
      </div>

      {pastBatches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-serif text-xl font-semibold">Past batches</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="divide-y divide-border/40 border border-border/70 bg-card">
            {pastBatches.map(({ batch, trackName }) => {
              const st = BATCH_STATUS_CONFIG[batch.status]
              return (
                <div key={batch.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{batch.code}</span>
                      <Badge variant={st.variant} className="shrink-0">
                        {st.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{trackName}</p>
                  </div>
                  {batch.startDate && (
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(batch.startDate)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold">Evaluation history</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="divide-y divide-border/40 border border-border/70 bg-card">
          {historyRows.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No evaluations recorded yet.</p>
          )}
          {historyRows.map(evaluation => {
            const chapter = chapterById.get(evaluation.chapterId)
            return (
              <div key={evaluation.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {chapter?.code} · {chapter?.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {evaluation.evaluatedAt ? formatDate(evaluation.evaluatedAt) : '—'} by{' '}
                    {evaluatorNameById.get(evaluation.evaluatorId) ?? 'Unknown'}
                  </p>
                  {evaluation.notes && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {evaluation.notes}
                    </p>
                  )}
                </div>
                <ProficiencyBadge level={evaluation.level} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
