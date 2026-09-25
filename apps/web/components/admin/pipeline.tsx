import { cn } from '@/lib/utils'
import { PIPELINE_STAGES, pipelineOf, type CatalogChapter } from '@/lib/models/catalog'

/**
 * Four ruled cells, filled left to right — the same reading as the mark book
 * (the first empty cell is what this chapter is waiting on), but plain indigo
 * rather than borrowing a proficiency colour: a content-pipeline stage isn't
 * a student's mark, and giving it e.g. "level 3 purple" would imply a
 * relationship to proficiency that doesn't exist.
 *
 * Stage order follows what the API requires. Text must exist before segments
 * can address character offsets into it; segments must exist before audio can
 * be mapped to them. So a half-built chapter always reads as a prefix, and a
 * gap in the middle would mean something has gone wrong.
 */
export function Pipeline({ chapter }: { chapter: CatalogChapter }) {
  const stages = pipelineOf(chapter.content)
  const { content } = chapter

  const detail = [
    content.script ? content.script.toUpperCase() : '—',
    content.segments > 0 ? String(content.segments) : '—',
    content.audioCount > 0 ? String(content.audioCount) : '—',
    stages[3] ? '✓' : '—',
  ]

  // The one cell that gets the spot colour: text missing on a chapter students
  // can already open. Tinting the whole row instead put vermilion on 8 of 11
  // rows, which is the same mistake as flagging a setup gap on all 43 batches —
  // a mark that appears on the majority has stopped marking anything.
  const breaks = chapter.status === 'published' && !content.hasText

  return (
    <span className="flex shrink-0 items-center gap-px" aria-label="Content pipeline">
      {stages.map((done, i) => (
        <span
          key={PIPELINE_STAGES[i]}
          title={`${PIPELINE_STAGES[i]}: ${done ? detail[i] : 'not done'}`}
          className={cn(
            'grid h-5 w-7 place-items-center font-mono text-[0.5625rem] leading-none',
            done
              ? 'bg-indigo text-card'
              : i === 0 && breaks
                ? 'border border-vermilion text-vermilion'
                : 'border border-dashed border-rule text-ink-muted/40',
          )}
        >
          {detail[i]}
        </span>
      ))}
    </span>
  )
}

export function PipelineKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="label text-ink-muted">Pipeline</span>
      {PIPELINE_STAGES.map((stage, i) => (
        <span key={stage} className="flex items-center gap-1.5">
          <span className="grid size-4 place-items-center border border-rule font-mono text-[0.5rem] text-ink-muted">
            {i + 1}
          </span>
          <span className="label text-ink-muted">{stage}</span>
        </span>
      ))}
    </div>
  )
}
