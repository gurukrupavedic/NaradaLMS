'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { Section } from '@/components/section'
import { ScreenError } from '@/components/screen-error'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import { useResegmentChapter, useSaveChapterScript } from '@/lib/query/use-content-mutations'
import { SegmentPicker, type PickedSegment } from '@/components/admin/segment-picker'
import { AudioMapStep } from '@/components/admin/audio-map-step'
import { PreviewStep } from '@/components/admin/preview-step'
import type { ApiChapterDetail, ApiScriptKey, ApiScriptText } from '@/lib/api/api-types'

const SCRIPTS: ApiScriptKey[] = ['sa', 'te', 'en']

const SCRIPT_LABEL: Record<ApiScriptKey, { label: string; short: string; fontClass: string }> = {
  sa: { label: 'Devanagari', short: 'देव', fontClass: 'font-deva' },
  te: { label: 'Telugu', short: 'తెలు', fontClass: 'font-telugu' },
  en: { label: 'Transliteration', short: 'EN', fontClass: 'font-sans' },
}

type Step = 'text' | 'segments' | 'audio' | 'preview'
const STEPS: { id: Step; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'segments', label: 'Segments' },
  { id: 'audio', label: 'Audio' },
  { id: 'preview', label: 'Preview' },
]

type ScriptFormState = {
  label: string
  short: string
  fontClass: string
  text: string
  segments: PickedSegment[]
}

function draftFromExisting(script: ApiScriptKey, existing: ApiScriptText | undefined): ScriptFormState {
  const defaults = SCRIPT_LABEL[script]
  return {
    label: existing?.label ?? defaults.label,
    short: existing?.short ?? defaults.short,
    fontClass: existing?.fontClass ?? defaults.fontClass,
    text: existing?.text ?? '',
    segments: existing?.segments ?? [],
  }
}

function draftIsDirty(draft: ScriptFormState, existing: ApiScriptText | undefined): boolean {
  if (!existing) return draft.text.trim().length > 0 || draft.segments.length > 0
  if (draft.label !== existing.label || draft.short !== existing.short || draft.fontClass !== existing.fontClass) return true
  if (draft.text !== existing.text) return true
  if (draft.segments.length !== existing.segments.length) return true
  return draft.segments.some((s, i) => s.start !== existing.segments[i]!.start || s.end !== existing.segments[i]!.end)
}

/**
 * A dedicated full-page editor for one chapter's content — text, segmentation, and audio mapping
 * as a focused, step-at-a-time surface, rather than three accordion panels inside the track's
 * chapter list (`chapter-row.tsx` links here instead of expanding them inline; the row itself
 * still owns the lightweight code/title/status fields that don't need this much room).
 */
export function ChapterEditor({ chapterId }: { chapterId: string }) {
  const { data: detail, error } = useQuery(chapterAuthoringDetailQuery(chapterId))

  if (error) return <ScreenError error={error} backHref="/admin" backLabel="← Administration" />
  if (!detail) {
    return (
      <div className="min-h-dvh bg-paper p-6">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-8 w-64 bg-ink/[0.07]" />
          <div className="h-40 bg-ink/[0.07]" />
        </div>
      </div>
    )
  }

  return <ChapterEditorView detail={detail} />
}

function ChapterEditorView({ detail }: { detail: ApiChapterDetail }) {
  const [step, setStep] = useState<Step>('text')
  const [scriptTab, setScriptTab] = useState<ApiScriptKey>(detail.script ?? detail.scripts[0]?.key ?? 'sa')
  const [resegmentMode, setResegmentMode] = useState(false)

  // Lifted above every script tab, and never remounted when the tab changes — switching from
  // Sanskrit to Telugu to check something used to throw away whatever you'd just typed in
  // Sanskrit, because the old editor kept this state inside a component keyed by the tab itself.
  // One `drafts` record survives tab switches, step switches, and the resegment detour alike.
  const [drafts, setDrafts] = useState<Record<ApiScriptKey, ScriptFormState>>(
    () => Object.fromEntries(SCRIPTS.map(code => [code, draftFromExisting(code, detail.scripts.find(s => s.key === code))])) as Record<
      ApiScriptKey,
      ScriptFormState
    >,
  )

  function updateDraft(script: ApiScriptKey, patch: Partial<ScriptFormState>) {
    setDrafts(prev => ({ ...prev, [script]: { ...prev[script], ...patch } }))
  }

  function resetDraftFrom(detail: ApiChapterDetail) {
    setDrafts(prev => {
      const next = { ...prev }
      for (const code of SCRIPTS) next[code] = draftFromExisting(code, detail.scripts.find(s => s.key === code))
      return next
    })
  }

  const referenceScript = detail.scripts[0]
  const mappableSegments = referenceScript
    ? referenceScript.segments.map(s => ({ id: s.id, text: referenceScript.text.slice(s.start, s.end) }))
    : []

  const scriptsWithText = SCRIPTS.filter(code => drafts[code].text.trim().length > 0)
  const persistedCounts = detail.scripts.map(s => s.segments.length)
  const audioFullyMapped = detail.audio.some(a => mappableSegments.length > 0 && a.mappings.length === mappableSegments.length)

  const completion: Record<Step, boolean> = {
    text: Boolean(detail.scripts.find(s => s.key === scriptTab)?.text.trim()),
    segments: detail.scripts.length > 0 && persistedCounts.every(c => c > 0) && new Set(persistedCounts).size === 1,
    audio: audioFullyMapped,
    preview: mappableSegments.length > 0 && audioFullyMapped,
  }
  const currentDirty = draftIsDirty(drafts[scriptTab], detail.scripts.find(s => s.key === scriptTab))

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex h-16 shrink-0 items-center gap-5 border-b border-rule px-5">
        <Link
          href={`/admin/tracks/${detail.trackId}`}
          className="label shrink-0 text-ink-muted transition-colors hover:text-vermilion"
        >
          ← {detail.code}
        </Link>
        <h1 className="display min-w-0 truncate text-[1.25rem]">{detail.title}</h1>

        <nav className="ml-auto flex shrink-0 items-center gap-1">
          {STEPS.map((s, i) => {
            const active = step === s.id
            const done = completion[s.id]
            const dirty = (s.id === 'text' || s.id === 'segments') && currentDirty
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                aria-pressed={active}
                className={cn(
                  'label flex items-center gap-1.5 px-2.5 py-1.5 transition-colors',
                  active ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center text-[0.5625rem] font-bold',
                    active ? 'bg-paper text-ink' : done ? 'bg-vermilion text-paper' : 'border border-current',
                  )}
                >
                  {done && !active ? '✓' : i + 1}
                </span>
                {s.label}
                {dirty && <span className="size-1.5 shrink-0 rounded-full bg-vermilion" title="Unsaved changes" />}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {step === 'text' && (
            <Section title="Text" count={`${drafts[scriptTab].text.length} characters`}>
              <ScriptTabs scriptTab={scriptTab} detail={detail} onSelect={setScriptTab} />
              <TextEditor
                draft={drafts[scriptTab]}
                onChange={patch => updateDraft(scriptTab, patch)}
                onContinue={() => setStep('segments')}
              />
            </Section>
          )}

          {step === 'segments' && (
            <Section title="Segments">
              <ScriptTabs scriptTab={scriptTab} detail={detail} onSelect={setScriptTab} />
              {resegmentMode ? (
                <ResegmentPanel
                  chapterId={detail.id}
                  scripts={detail.scripts}
                  onDone={updated => {
                    setResegmentMode(false)
                    if (updated) resetDraftFrom(updated)
                  }}
                />
              ) : (
                <SegmentsGrid
                  chapterId={detail.id}
                  scripts={scriptsWithText}
                  drafts={drafts}
                  detail={detail}
                  onDraftChange={updateDraft}
                  onNeedsResegment={() => setResegmentMode(true)}
                />
              )}
            </Section>
          )}

          {step === 'audio' && (
            <Section title="Audio">
              <AudioMapStep chapterId={detail.id} segments={mappableSegments} audio={detail.audio} />
            </Section>
          )}

          {step === 'preview' && (
            <Section title="Preview">
              <PreviewStep
                text={referenceScript?.text ?? ''}
                fontClass={referenceScript?.fontClass}
                segments={referenceScript?.segments ?? []}
                audio={detail.audio}
              />
            </Section>
          )}
        </div>
      </main>
    </div>
  )
}

function ScriptTabs({
  scriptTab,
  detail,
  onSelect,
}: {
  scriptTab: ApiScriptKey
  detail: ApiChapterDetail
  onSelect: (script: ApiScriptKey) => void
}) {
  return (
    <div className="flex w-fit items-center gap-px border border-rule">
      {SCRIPTS.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onSelect(code)}
          aria-pressed={scriptTab === code}
          className={cn(
            'label px-2.5 py-1.5 transition-colors',
            scriptTab === code ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
          )}
        >
          {code.toUpperCase()}
          {detail.scripts.some(s => s.key === code) ? '' : ' (new)'}
        </button>
      ))}
    </div>
  )
}

/** Composing text — no save action of its own. `upsertScript` always takes text and segments together, so the actual write happens from the Segments step, where a script's line-by-line marking is what makes it ready to persist at all. */
/**
 * Text first, nothing else in the way — `label`/`short`/`fontClass` already have a sensible
 * default per script (`SCRIPT_LABEL`) and are really internal display config (`fontClass` is a
 * raw CSS class name), not something an admin composing a chapter's text should have to look at
 * before they can start typing. Tucked behind "Advanced" instead of sitting above the textarea.
 */
function TextEditor({
  draft,
  onChange,
  onContinue,
}: {
  draft: ScriptFormState
  onChange: (patch: Partial<ScriptFormState>) => void
  onContinue: () => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => onChange({ text: String(reader.result ?? '') })
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="label text-ink-muted">Text</span>
          <label className="label cursor-pointer text-ink-muted transition-colors hover:text-vermilion">
            Upload .txt
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                e.target.value = ''
              }}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          value={draft.text}
          onChange={e => onChange({ text: e.target.value })}
          rows={14}
          autoFocus
          className={cn(
            'mt-1.5 w-full resize-y border border-rule bg-paper p-3 text-[1.0625rem] leading-loose focus:border-vermilion focus:outline-none',
            draft.fontClass,
          )}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={!draft.text.trim()}
          className={cn(
            'label border border-rule px-3 py-1.5 transition-colors',
            draft.text.trim() ? 'text-ink hover:border-vermilion hover:text-vermilion' : 'text-ink-muted/50',
          )}
        >
          Continue to Segments →
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="label text-ink-muted transition-colors hover:text-ink"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced
        </button>
      </div>

      {showAdvanced && (
        <div className="grid gap-3.5 border-t border-rule-soft pt-4 sm:grid-cols-3">
          <label className="block">
            <span className="label text-ink-muted">Label</span>
            <input
              value={draft.label}
              onChange={e => onChange({ label: e.target.value })}
              className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="label text-ink-muted">Short (tab label)</span>
            <input
              value={draft.short}
              onChange={e => onChange({ short: e.target.value })}
              className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="label text-ink-muted">Font class</span>
            <input
              value={draft.fontClass}
              onChange={e => onChange({ fontClass: e.target.value })}
              className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  )
}

/**
 * Every script that has text gets its own picker, side by side, all the time — not just once a
 * save fails. Segments have to line up 1:1 across scripts (same count, shared ids), and that was
 * previously invisible until you hit a 422 while resegmenting; showing them together makes the
 * actual constraint visible while marking, not after.
 *
 * Each panel still saves independently (`upsertScript`, safe as long as its own segment count
 * doesn't change once a sibling or a mapping depends on it) — a shared "resegment all scripts"
 * action only exists as the explicit escalation `ResegmentPanel` offers, not as the default.
 */
function SegmentsGrid({
  chapterId,
  scripts,
  drafts,
  detail,
  onDraftChange,
  onNeedsResegment,
}: {
  chapterId: string
  scripts: ApiScriptKey[]
  drafts: Record<ApiScriptKey, ScriptFormState>
  detail: ApiChapterDetail
  onDraftChange: (script: ApiScriptKey, patch: Partial<ScriptFormState>) => void
  onNeedsResegment: () => void
}) {
  if (scripts.length === 0) {
    return <p className="label text-ink-muted">Add text in the Text step first.</p>
  }

  const counts = scripts.map(code => drafts[code].segments.length)
  const mismatched = new Set(counts).size > 1 && counts.some(c => c > 0)

  return (
    <div className="space-y-4">
      {mismatched && (
        <p className="label border border-vermilion/40 bg-vermilion/[0.04] px-3 py-2 text-vermilion">
          These don&apos;t line up yet — every script needs the same number of segments (the same lines, marked separately in each).
        </p>
      )}
      <div className={cn('grid gap-4', scripts.length > 1 && 'lg:grid-cols-2')}>
        {scripts.map(code => (
          <ScriptSegmentPanel
            key={code}
            chapterId={chapterId}
            script={code}
            draft={drafts[code]}
            existing={detail.scripts.find(s => s.key === code)}
            onChange={patch => onDraftChange(code, patch)}
            onNeedsResegment={onNeedsResegment}
          />
        ))}
      </div>
    </div>
  )
}

function ScriptSegmentPanel({
  chapterId,
  script,
  draft,
  existing,
  onChange,
  onNeedsResegment,
}: {
  chapterId: string
  script: ApiScriptKey
  draft: ScriptFormState
  existing: ApiScriptText | undefined
  onChange: (patch: Partial<ScriptFormState>) => void
  onNeedsResegment: () => void
}) {
  const mutation = useSaveChapterScript(chapterId)
  const dirty = draftIsDirty(draft, existing)

  function handleSave() {
    if (draft.segments.length === 0) return
    mutation.mutate({ script, data: { ...draft } })
  }

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : null
  const needsResegment = errorMessage?.toLowerCase().includes('resegment') ?? false

  return (
    <div className="space-y-2.5 border border-rule-soft p-3.5">
      <div className="flex items-center justify-between">
        <span className="label text-ink-muted">
          {SCRIPT_LABEL[script].label} · {draft.segments.length} segment{draft.segments.length === 1 ? '' : 's'}
        </span>
        {dirty && <span className="size-1.5 shrink-0 rounded-full bg-vermilion" title="Unsaved changes" />}
      </div>

      <SegmentPicker text={draft.text} fontClass={draft.fontClass} segments={draft.segments} onChange={segments => onChange({ segments })} />

      {draft.segments.length === 0 && <p className="label text-ink-muted">Select text above to mark this script&apos;s first segment.</p>}

      {errorMessage && (
        <div className="space-y-2">
          <p className="label text-vermilion">{errorMessage}</p>
          {needsResegment && (
            <button type="button" onClick={onNeedsResegment} className="label border border-vermilion px-2.5 py-1.5 text-vermilion">
              Resegment all scripts together →
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={mutation.isPending || draft.segments.length === 0 || !dirty}
        className={cn(
          'label border border-rule px-3 py-1.5 transition-colors',
          mutation.isPending || draft.segments.length === 0 || !dirty ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
        )}
      >
        {mutation.isPending ? 'Saving…' : mutation.isSuccess && !dirty ? 'Saved' : 'Save'}
      </button>
    </div>
  )
}

/**
 * The escalation path a panel reaches for when the server refuses a single-script segment count
 * change: every script that already exists gets its own picker here too, but this action submits
 * all of them together (`resegmentChapter`) — the same invariant `SegmentsGrid` shows by default,
 * enforced in one request instead of one script's request colliding with another's.
 */
function ResegmentPanel({
  chapterId,
  scripts,
  onDone,
}: {
  chapterId: string
  scripts: ApiScriptText[]
  onDone: (updated?: ApiChapterDetail) => void
}) {
  const [segmentsByScript, setSegmentsByScript] = useState<Record<ApiScriptKey, PickedSegment[]>>(
    () => Object.fromEntries(scripts.map(s => [s.key, s.segments])) as unknown as Record<ApiScriptKey, PickedSegment[]>,
  )
  const mutation = useResegmentChapter(chapterId)

  const counts = scripts.map(s => segmentsByScript[s.key]?.length ?? 0)
  const countsMismatch = counts.length > 0 && counts.some(c => c !== counts[0])

  function handleSubmit() {
    const parsedByScript: Partial<Record<ApiScriptKey, { segments: PickedSegment[] }>> = {}
    for (const s of scripts) parsedByScript[s.key] = { segments: segmentsByScript[s.key] ?? [] }
    mutation.mutate({ scripts: parsedByScript }, { onSuccess: updated => onDone(updated) })
  }

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : null

  return (
    <div className="space-y-4 border border-vermilion/30 bg-vermilion/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label text-vermilion">Resegmenting clears every existing audio mapping on this chapter.</p>
        <button type="button" onClick={() => onDone()} className="label shrink-0 text-ink-muted transition-colors hover:text-vermilion">
          Cancel
        </button>
      </div>

      <div className={cn('grid gap-4', scripts.length > 1 && 'lg:grid-cols-2')}>
        {scripts.map(script => (
          <div key={script.key} className="space-y-2">
            <span className="label text-ink-muted">
              {script.label} ({segmentsByScript[script.key]?.length ?? 0} segments)
            </span>
            <SegmentPicker
              text={script.text}
              fontClass={script.fontClass}
              segments={segmentsByScript[script.key] ?? []}
              onChange={next => setSegmentsByScript(prev => ({ ...prev, [script.key]: next }))}
            />
          </div>
        ))}
      </div>

      {countsMismatch && <p className="label text-vermilion">Every script must have the same number of segments.</p>}
      {errorMessage && <p className="label text-vermilion">{errorMessage}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={mutation.isPending || countsMismatch}
        className={cn(
          'label border border-rule px-3 py-1.5 transition-colors',
          mutation.isPending || countsMismatch ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
        )}
      >
        {mutation.isPending ? 'Resegmenting…' : 'Resegment all scripts'}
      </button>
    </div>
  )
}
