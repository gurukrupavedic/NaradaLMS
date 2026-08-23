'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { enrollStudent, searchStudentsToEnroll } from '@/lib/admin-actions'
import type { ApiProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function EnrollStudentDialog({ batchId }: { batchId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiProfile[]>([])
  const [searched, setSearched] = useState(false)
  const [isSearching, startSearch] = useTransition()
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [isEnrolling, startEnroll] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setResults([])
      setSearched(false)
    }
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    startSearch(async () => {
      try {
        const found = await searchStudentsToEnroll(batchId, query)
        setResults(found)
        setSearched(true)
      } catch {
        toast.error('Search failed. Please try again.')
      }
    })
  }

  function handleEnroll(profile: ApiProfile) {
    setEnrollingId(profile.id)
    startEnroll(async () => {
      try {
        await enrollStudent(batchId, profile.id)
        toast.success('Student enrolled', { description: profile.name })
        setResults(current => current.filter(p => p.id !== profile.id))
      } catch {
        toast.error('Failed to enroll student')
      } finally {
        setEnrollingId(null)
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Enroll student
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" aria-describedby="enroll-student-description">
          <DialogHeader>
            <DialogTitle>Enroll a student</DialogTitle>
            <DialogDescription id="enroll-student-description">
              Search by name to add a student to this batch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Student name"
              autoFocus
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <Button type="submit" size="sm" disabled={isSearching || !query.trim()}>
              {isSearching ? 'Searching…' : 'Search'}
            </Button>
          </form>

          <div className="max-h-72 divide-y divide-border/40 overflow-y-auto border border-border/70">
            {!searched && (
              <p className="p-4 text-xs text-muted-foreground">Search for a student to enroll.</p>
            )}
            {searched && results.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">
                No unenrolled students match &ldquo;{query}&rdquo;.
              </p>
            )}
            {results.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile.name}</p>
                  {profile.city && (
                    <p className="truncate text-xs text-muted-foreground">{profile.city}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isEnrolling && enrollingId === profile.id}
                  onClick={() => handleEnroll(profile)}
                >
                  {isEnrolling && enrollingId === profile.id ? 'Enrolling…' : 'Enroll'}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
