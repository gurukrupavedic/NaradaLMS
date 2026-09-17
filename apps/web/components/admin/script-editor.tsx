'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import { useSaveChapterScript } from '@/lib/query/use-content-mutations'
import { SegmentSplitter } from '@/components/admin/segment-splitter'
import { RichTextField } from '@/components/admin/rich-text-field'
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
 * One script's text + segment offsets. Segment boundaries are placed visually via `SegmentSplitter`
 * (click between characters to split), which always derives from — and writes back — exact
 * character offsets into the text above.
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
  const [segments, setSegments] = useState(existing?.segments.map(({ start, end }) => ({ start, end })) ?? [])

  const mutation = useSaveChapterScript(chapterId)

  function handleTextChange(nextText: string) {
    setText(nextText)
    // Editing the text invalidates any segment boundary past the new length — drop those splits
    // rather than let a stale offset point past the end of the (now shorter) text.
    setSegments(prev => prev.filter(s => s.end <= nextText.length))
  }

  function handleSave() {
    if (segments.length === 0) return
    mutation.mutate({ script, data: { label, short, fontClass, text, segments } })
  }

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : null

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

      <div>
        <span className="label text-ink-muted">Text</span>
        <div className="mt-1.5">
          <RichTextField value={text} onChangeText={handleTextChange} fontClass={fontClass} />
        </div>
      </div>

      <SegmentSplitter text={text} segments={segments} onChange={setSegments} fontClass={fontClass} />

      {errorMessage && <p className="label text-vermilion">{errorMessage}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending || segments.length === 0}
          className={cn(
            'label border border-rule px-3 py-1.5 transition-colors',
            mutation.isPending || segments.length === 0
              ? 'text-ink-muted/50'
              : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {mutation.isPending ? 'Saving…' : 'Save script'}
        </button>
        {mutation.isSuccess && <span className="label text-ink-muted">Saved — persists for real.</span>}
      </div>
    </div>
  )
}
