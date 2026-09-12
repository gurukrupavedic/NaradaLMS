'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import { useSaveChapterScript } from '@/lib/query/use-content-mutations'
import { formatSegments, parseSegments } from '@/lib/segment-text'
import type { ApiScriptKey, ApiScriptText } from '@/lib/api/api-types'

const SCRIPT_LABEL: Record<ApiScriptKey, { label: string; short: string; fontClass: string }> = {
  sa: { label: 'Devanagari', short: 'देव', fontClass: 'font-deva' },
  te: { label: 'Telugu', short: 'తెలు', fontClass: 'font-telugu' },
  en: { label: 'Transliteration', short: 'EN', fontClass: 'font-sans' },
}

/**
 * Waits for the chapter's real content before mounting the form — `ScriptEditorForm` below reads
 * `existing` only in its `useState` initializers, which React only ever consults on that
 * component's *first* render. Rendering the form before the query resolves would freeze its
 * fields at "nothing loaded yet" forever, even once the real text/segments arrive a moment later.
 * Keyed by `script` so switching tabs remounts with a clean slate instead of leaking one script's
 * edits into another's fields.
 */
export function ScriptEditor({ chapterId, script }: { chapterId: string; script: ApiScriptKey }) {
  const { data: detail, isLoading } = useQuery(chapterAuthoringDetailQuery(chapterId))

  if (isLoading) return <p className="label text-ink-muted">Loading…</p>

  const existing = detail?.scripts.find(s => s.key === script)
  return <ScriptEditorForm key={script} chapterId={chapterId} script={script} existing={existing} />
}

/**
 * One script's text + segment offsets. Segment boundaries are entered as plain `start,end` pairs,
 * one per line — character offsets into the text above, not a visual scrubber (see the plan's own
 * non-goals: marking segments by ear/eye is real future work, not this pass).
 */
function ScriptEditorForm({
  chapterId,
  script,
  existing,
}: {
  chapterId: string
  script: ApiScriptKey
  existing: ApiScriptText | undefined
}) {
  const defaults = SCRIPT_LABEL[script]

  const [label, setLabel] = useState(existing?.label ?? defaults.label)
  const [short, setShort] = useState(existing?.short ?? defaults.short)
  const [fontClass, setFontClass] = useState(existing?.fontClass ?? defaults.fontClass)
  const [text, setText] = useState(existing?.text ?? '')
  const [segmentsText, setSegmentsText] = useState(existing ? formatSegments(existing.segments) : '')
  const [parseError, setParseError] = useState<string | null>(null)

  const mutation = useSaveChapterScript(chapterId)

  function handleSave() {
    const segments = parseSegments(segmentsText)
    if (!segments) {
      setParseError('Segments must be one "start,end" pair per line, e.g. "0,12".')
      return
    }
    setParseError(null)
    mutation.mutate({ script, data: { label, short, fontClass, text, segments } })
  }

  const errorMessage = parseError ?? (mutation.error instanceof ApiError ? mutation.error.message : null)

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <label className="block">
          <span className="label text-ink-muted">Label</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label text-ink-muted">Short (tab label)</span>
          <input
            value={short}
            onChange={e => setShort(e.target.value)}
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label text-ink-muted">Font class</span>
          <input
            value={fontClass}
            onChange={e => setFontClass(e.target.value)}
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="label text-ink-muted">Text</span>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          className="mt-1.5 w-full resize-y border border-rule bg-paper p-2.5 text-[0.9375rem] leading-relaxed focus:border-vermilion focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="label text-ink-muted">Segments — one &quot;start,end&quot; pair per line</span>
        <textarea
          value={segmentsText}
          onChange={e => setSegmentsText(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y border border-rule bg-paper p-2.5 font-mono text-[0.8125rem] focus:border-vermilion focus:outline-none"
          placeholder="0,12&#10;13,28"
        />
      </label>

      {errorMessage && <p className="label text-vermilion">{errorMessage}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className={cn(
            'label border border-rule px-3 py-1.5 transition-colors',
            mutation.isPending ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {mutation.isPending ? 'Saving…' : 'Save script'}
        </button>
        {mutation.isSuccess && <span className="label text-ink-muted">Saved — persists for real.</span>}
      </div>
    </div>
  )
}
