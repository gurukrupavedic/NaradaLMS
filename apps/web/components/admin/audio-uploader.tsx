'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { useUploadChapterAudio } from '@/lib/query/use-content-mutations'

/** Upload one audio take, with a real byte-level progress bar driven by `XMLHttpRequest`. */
export function AudioUploader({ chapterId }: { chapterId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [reciter, setReciter] = useState('')
  const [progress, setProgress] = useState(0)

  const mutation = useUploadChapterAudio(chapterId)

  function handleUpload() {
    if (!file || !reciter.trim()) return
    setProgress(0)
    mutation.mutate(
      { file, label: label.trim() || null, reciter: reciter.trim(), onProgress: setProgress },
      {
        onSuccess: () => {
          setFile(null)
          setLabel('')
          setReciter('')
        },
      },
    )
  }

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="label text-ink-muted">Audio file</span>
          <input
            type="file"
            accept="audio/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-[0.8125rem]"
          />
        </label>
        <label className="block">
          <span className="label text-ink-muted">Label</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Practice take"
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label text-ink-muted">Reciter</span>
          <input
            value={reciter}
            onChange={e => setReciter(e.target.value)}
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
          />
        </label>
      </div>

      {errorMessage && <p className="label text-vermilion">{errorMessage}</p>}

      {mutation.isPending && (
        <div className="h-1 w-full bg-ink/10">
          <div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || !reciter.trim() || mutation.isPending}
        className={cn(
          'label border border-rule px-3 py-1.5 transition-colors',
          !file || !reciter.trim() || mutation.isPending
            ? 'text-ink-muted/50'
            : 'text-ink hover:border-vermilion hover:text-vermilion',
        )}
      >
        {mutation.isPending ? `Uploading… ${progress}%` : 'Upload'}
      </button>
    </div>
  )
}
