'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import { BookOpen, ClipboardList, FileText, Search, UserPlus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { globalSearchQuery } from '@/lib/query/options'
import type { ApiSearchResult, ApiSearchResultKind } from '@/lib/api/api-types'

/**
 * The command palette — Cmd/Ctrl+K anywhere in the app, or the "Search" button in `AppShell`'s
 * header. One text field fanned out server-side (`GET /v1/search`) across students, batches,
 * tracks, chapters, and registrations, rather than five separate lookups the reader would
 * otherwise have to know to run.
 *
 * Mounted for every signed-in caller, not just admins — the endpoint itself scopes each category
 * to what that caller could already see by browsing (their own batchmates, published chapters,
 * registrations skipped outright for anyone who isn't a school admin), so there's no separate
 * "does this caller get search at all" gate here. A caller with no active profile selected yet
 * (and no admin role either) will 403 on every non-admin-visible category — `isError` below
 * degrades that to a plain "couldn't search" message rather than a stuck spinner.
 */

const DEBOUNCE_MS = 200

const KIND_ORDER: ApiSearchResultKind[] = ['student', 'batch', 'track', 'chapter', 'registration']

const KIND_LABEL: Record<ApiSearchResultKind, string> = {
  student: 'Students',
  batch: 'Batches',
  track: 'Tracks',
  chapter: 'Chapters',
  registration: 'Registrations',
}

const KIND_ICON: Record<ApiSearchResultKind, React.ComponentType<{ className?: string }>> = {
  student: Users,
  batch: ClipboardList,
  track: BookOpen,
  chapter: FileText,
  // Distinct from `batch`'s icon (both used ClipboardList before) — a registration and a batch
  // are visually indistinguishable rows otherwise, undermining the point of grouping by category.
  registration: UserPlus,
}

function hrefFor(result: ApiSearchResult): string {
  switch (result.kind) {
    case 'student':
      return `/students/${result.id}`
    case 'batch':
      return `/admin/batches/${result.code}`
    case 'track':
      return `/admin/tracks/${result.id}`
    case 'chapter':
      return `/chapters/${result.code}`
    case 'registration':
      return `/admin/registrations/${result.id}`
  }
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isFetching, isError } = useQuery(globalSearchQuery(debouncedQuery))
  const groups = useMemo(() => groupByKind(results ?? []), [results])
  const flat = useMemo(() => groups.flatMap(g => g.results), [groups])

  // Reset the selection whenever the settled query changes, so an old row's position doesn't
  // carry over to an unrelated new result set. Adjusted during render (React's own pattern for
  // this) rather than in an effect, which would cascade an extra render on every keystroke.
  const [settledForIndex, setSettledForIndex] = useState(debouncedQuery)
  if (settledForIndex !== debouncedQuery) {
    setSettledForIndex(debouncedQuery)
    setActiveIndex(0)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setDebouncedQuery('')
      setActiveIndex(0)
    }
  }

  function navigateTo(result: ApiSearchResult) {
    router.push(hrefFor(result))
    handleOpenChange(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (flat.length === 0 ? 0 : (i + 1) % flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flat[activeIndex]
      if (selected) navigateTo(selected)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
        aria-label="Search"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden border border-rule px-1.5 py-0.5 text-[0.625rem] text-ink-muted/70 sm:inline">
          ⌘K
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            initialFocus={inputRef}
            className="fixed top-[14%] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 border border-rule bg-card shadow-none outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            onKeyDown={handleKeyDown}
          >
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search students, batches, tracks, chapters, and registrations.
            </Dialog.Description>

            <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search students, batches, tracks, chapters…"
                className="flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-muted/50"
              />
              <span className="label shrink-0 text-ink-muted/60">Esc</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {debouncedQuery.trim().length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  Start typing to search across the school.
                </p>
              ) : isError ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  Couldn&rsquo;t search right now.
                </p>
              ) : isFetching && flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">Searching…</p>
              ) : flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  No matches for &ldquo;{debouncedQuery}&rdquo;.
                </p>
              ) : (
                groups.map(group => (
                  <div key={group.kind} className="border-b border-rule-soft last:border-0">
                    <p className="label px-4 pt-3 pb-1 text-ink-muted/70">
                      {KIND_LABEL[group.kind]}
                    </p>
                    <ul>
                      {group.results.map(result => {
                        const index = flat.indexOf(result)
                        const Icon = KIND_ICON[result.kind]
                        return (
                          <li key={`${result.kind}-${result.id}`}>
                            <button
                              type="button"
                              onClick={() => navigateTo(result)}
                              onMouseEnter={() => setActiveIndex(index)}
                              className={cn(
                                'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.8125rem] transition-colors',
                                index === activeIndex ? 'bg-ink/[0.04] text-ink' : 'text-ink-muted',
                              )}
                            >
                              <Icon className="size-4 shrink-0 text-ink-muted/70" aria-hidden />
                              <span className="flex-1 truncate">{result.title}</span>
                              {result.subtitle && (
                                <span className="shrink-0 truncate text-ink-muted/60">
                                  {result.subtitle}
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function groupByKind(
  results: ApiSearchResult[],
): { kind: ApiSearchResultKind; results: ApiSearchResult[] }[] {
  return KIND_ORDER.map(kind => ({ kind, results: results.filter(r => r.kind === kind) })).filter(
    group => group.results.length > 0,
  )
}
