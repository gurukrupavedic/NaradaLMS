'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ScriptEditor } from '@/components/admin/script-editor'
import { AudioUploader } from '@/components/admin/audio-uploader'
import { WaveformMappingEditor } from '@/components/admin/waveform-mapping-editor'
import { ResegmentEditor } from '@/components/admin/resegment-editor'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import type { ApiScriptKey } from '@/lib/api/api-types'

const SCRIPTS: ApiScriptKey[] = ['sa', 'te', 'en']

/**
 * A chapter's full content — script text (per language, with segment splits), audio takes, and
 * their waveform mappings — as its own page rather than nested inside the track's chapter list.
 * Splitting text and timing boundaries by ear takes real, uninterrupted screen space; folding it
 * into an accordion on the track page (the previous layout) left no room for a real waveform.
 */
export function ChapterAuthoring({ trackId, chapterId }: { trackId: string; chapterId: string }) {
  const { data: detail, isLoading } = useQuery(chapterAuthoringDetailQuery(chapterId))
  const [scriptTab, setScriptTab] = useState<ApiScriptKey>('sa')

  const segments = detail?.scripts[0]?.segments ?? []

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/admin/tracks/${trackId}`} className="label text-ink-muted hover:text-vermilion">
        ← Back to track
      </Link>

      {isLoading || !detail ? (
        <p className="label mt-6 text-ink-muted">Loading…</p>
      ) : (
        <>
          <h1 className="display mt-3 text-[2rem]">
            {detail.code} — {detail.title}
          </h1>

          <section className="mt-8">
            <h2 className="label text-ink-muted">Script</h2>
            <div className="mt-2.5 flex items-center gap-px border border-rule">
              {SCRIPTS.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setScriptTab(code)}
                  aria-pressed={scriptTab === code}
                  className={cn(
                    'label px-3 py-1.5 transition-colors',
                    scriptTab === code
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                  )}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <ScriptEditor chapterId={chapterId} script={scriptTab} />
            </div>
          </section>

          <section className="mt-10 border-t border-rule-soft pt-8">
            <h2 className="label text-ink-muted">Audio</h2>
            <div className="mt-4 space-y-5">
              <AudioUploader chapterId={chapterId} />
              {detail.audio.length === 0 ? (
                <p className="label text-ink-muted">No audio uploaded for this chapter yet.</p>
              ) : segments.length === 0 ? (
                <p className="label text-ink-muted">Save a script with segments before mapping audio.</p>
              ) : (
                detail.audio.map(asset => (
                  <WaveformMappingEditor key={asset.id} chapterId={chapterId} asset={asset} segments={segments} />
                ))
              )}
            </div>
          </section>

          <section className="mt-10 border-t border-rule-soft pt-8">
            <h2 className="label text-ink-muted">Resegment</h2>
            <p className="label mt-1.5 text-ink-muted/70">
              Resize every script&apos;s segment count together — clears existing audio mappings.
            </p>
            <div className="mt-4">
              <ResegmentEditor chapterId={chapterId} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
