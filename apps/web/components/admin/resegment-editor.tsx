'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/spinner'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import { useResegmentChapter } from '@/lib/query/use-content-mutations'
import { formatSegments, parseSegments } from '@/lib/segment-text'
import type { ApiScriptKey, ApiScriptText } from '@/lib/api/api-types'

/**
 * Waits for the chapter's real content before mounting the form, same reason as `ScriptEditor`:
 * `ResegmentEditorForm` only reads `existing` scripts in its `useState` initializers.
 */
export function ResegmentEditor({ chapterId }: { chapterId: string }) {
  const { data: detail, isLoading } = useQuery(chapterAuthoringDetailQuery(chapterId))

  if (isLoading) return <p className="label text-ink-muted">Loading…</p>
  if (!detail || detail.scripts.length === 0) {
    return <p className="label text-ink-muted">No scripts yet — nothing to resegment.</p>
  }

  return <ResegmentEditorForm key={detail.scripts.map(s => s.key).join(',')} chapterId={chapterId} scripts={detail.scripts} />
}

/**
 * Resizes every script's segment timeline together — the operation `upsertScript` (single-script
 * save) deliberately refuses once a sibling script or audio mapping depends on the current
 * segments (see that form's own doc comment). This form only ever submits for scripts the chapter
 * already has; the server rejects a payload with a missing or unexpected script key.
 */
function ResegmentEditorForm({ chapterId, scripts }: { chapterId: string; scripts: ApiScriptText[] }) {
  const [segmentsTextByScript, setSegmentsTextByScript] = useState<Record<ApiScriptKey, string>>(() =>
    Object.fromEntries(scripts.map(s => [s.key, formatSegments(s.segments)])) as Record<ApiScriptKey, string>,
  )
  const [parseError, setParseError] = useState<string | null>(null)

  const mutation = useResegmentChapter(chapterId)

  const lineCounts = scripts.map(s => {
    const text = segmentsTextByScript[s.key] ?? ''
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0).length
  })
  const countsMismatch = lineCounts.length > 0 && lineCounts.some(c => c !== lineCounts[0])

  function handleSubmit() {
    const parsedByScript: Partial<Record<ApiScriptKey, { segments: { start: number; end: number }[] }>> = {}
    for (const script of scripts) {
      const parsed = parseSegments(segmentsTextByScript[script.key] ?? '')
      if (!parsed) {
        setParseError(`${script.key.toUpperCase()}: segments must be one "start,end" pair per line, e.g. "0,12".`)
        return
      }
      parsedByScript[script.key] = { segments: parsed }
    }
    setParseError(null)
    mutation.mutate({ scripts: parsedByScript })
  }

  return (
    <div className="space-y-3.5">
      <p className="label text-vermilion">
        This clears every existing audio mapping — you&apos;ll need to re-map audio after resegmenting.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {scripts.map((script, i) => (
          <div key={script.key} className="space-y-2">
            <div>
              <span className="label text-ink-muted">{script.label} — text (reference only)</span>
              <div className={cn('mt-1.5 max-h-32 overflow-y-auto border border-rule-soft bg-ink/[0.02] p-2.5 text-[0.8125rem] leading-relaxed', script.fontClass)}>
                {script.text || <span className="text-ink-muted">No text yet.</span>}
              </div>
            </div>
            <label className="block">
              <span className="label text-ink-muted">
                {script.label} — new segments ({lineCounts[i]})
              </span>
              <textarea
                value={segmentsTextByScript[script.key] ?? ''}
                onChange={e =>
                  setSegmentsTextByScript(prev => ({ ...prev, [script.key]: e.target.value }))
                }
                rows={4}
                className="mt-1.5 w-full resize-y border border-rule bg-paper p-2.5 font-mono text-[0.8125rem] focus:border-vermilion focus:outline-none"
                placeholder="0,12&#10;13,28"
              />
            </label>
          </div>
        ))}
      </div>

      {countsMismatch && (
        <p className="label text-vermilion">Every script must have the same number of segment lines before resegmenting.</p>
      )}

      {parseError && <p className="label text-vermilion">{parseError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending || countsMismatch}
          aria-busy={mutation.isPending}
          className={cn(
            'label inline-flex items-center gap-2 border border-rule px-3 py-1.5 transition-colors',
            mutation.isPending || countsMismatch
              ? 'text-ink-muted/50'
              : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {mutation.isPending && <Spinner />}
          {mutation.isPending ? 'Resegmenting…' : 'Resegment all scripts'}
        </button>
      </div>
    </div>
  )
}
