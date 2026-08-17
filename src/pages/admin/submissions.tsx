import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ImageOff, Inbox } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { sectionLabel } from '@/lib/listings'
import { categoryLabel } from '@/lib/submission-fields'
import {
  adminListSubmissions,
  submissionError,
  type AdminQueue,
  type Submission,
} from '@/lib/submissions'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The moderation queue.
 *
 * §30 and §57. An administrator opening this should be able to answer, without
 * clicking anything: how many are waiting, who sent them, what they are, where
 * they are, and whether there is a picture. Everything on a row is one of those
 * five, and nothing else is on a row.
 *
 * The queue defaults to Pending because that is the only tab with work in it.
 * The other two are history and are reachable, not offered first.
 * ========================================================================== */

const QUEUES: { id: AdminQueue; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

function isQueue(value: string | null): value is AdminQueue {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'all'
}

export default function AdminSubmissionsPage() {
  const [params, setParams] = useSearchParams()
  const queueParam = params.get('queue')
  const queue: AdminQueue = isQueue(queueParam) ? queueParam : 'pending'

  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'submissions', queue],
    queryFn: () => adminListSubmissions(queue),
  })

  const rows = useMemo(() => {
    const all = query.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter((s) =>
      [s.title, s.category, s.section, s.address, s.location, s.phone, s.contributor?.email]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    )
  }, [query.data, search])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-title">Submissions</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            Information sent in by contributors. Nothing here is on the public
            site until you approve it.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {QUEUES.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setParams(q.id === 'pending' ? {} : { queue: q.id })}
            aria-pressed={queue === q.id}
            className={cn(
              'rounded-pill px-3.5 py-2 text-body-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              queue === q.id
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-ink-muted hover:text-ink',
            )}
          >
            {q.label}
          </button>
        ))}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, contributor, place…"
          aria-label="Filter submissions"
          className="ml-auto h-10 w-full min-w-0 rounded-control border border-line bg-surface px-3.5 text-body-sm text-ink placeholder:text-ink-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-64"
        />
      </div>

      {query.isError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-danger-ink">
              Could not load submissions.
            </p>
            <p className="mt-1 text-meta text-danger-ink/80">
              {submissionError(query.error, 'Unknown error')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5">
        {query.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty queue={queue} filtered={!!search.trim()} />
        ) : (
          <ul className="space-y-2">
            {rows.map((s) => (
              <li key={s.id}>
                <QueueRow submission={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function QueueRow({ submission: s }: { submission: Submission }) {
  const place = [s.location, s.address].filter(Boolean)[0] ?? ''

  return (
    <Link
      to={`/admin/submissions/${s.id}`}
      className={cn(
        'flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card',
        'transition-colors hover:border-primary/40 hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      {s.imageUrl ? (
        <img
          src={s.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-16 shrink-0 rounded-control bg-surface-2 object-cover"
        />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-control bg-surface-2 text-ink-subtle">
          <ImageOff className="size-5" aria-hidden="true" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-body-sm font-bold">{s.title}</p>
          {s.targetListingId && (
            <span className="shrink-0 rounded-pill bg-primary-soft px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-primary-ink">
              Change to #{s.targetListingId}
            </span>
          )}
          {/* Advisory, set by the insert trigger. It never blocks a
              submission — it puts a second pair of eyes on one. §49. */}
          {s.duplicateHint && (
            <span className="shrink-0 rounded-pill bg-warning-soft px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-warning-ink">
              Possible duplicate
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-meta text-ink-subtle">
          {[
            s.category ? categoryLabel(s.category) : sectionLabel(s.section),
            place,
            s.phone,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <p className="mt-1 truncate text-meta text-ink-subtle">
          {s.contributor?.fullName || s.contributor?.email || 'Contributor'}
          {' · '}
          {new Date(s.submittedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
    </Link>
  )
}

function Empty({ queue, filtered }: { queue: AdminQueue; filtered: boolean }) {
  if (filtered) {
    return (
      <div className="rounded-card border border-dashed border-line px-6 py-12 text-center">
        <p className="text-heading">Nothing matches that</p>
        <p className="mt-2 text-body-sm text-ink-muted">Clear the filter to see the queue.</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-dashed border-line px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-ink-subtle">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-heading">
        {queue === 'pending' ? 'Nothing waiting' : 'Nothing here'}
      </p>
      <p className="mx-auto mt-2 max-w-[44ch] text-body-sm text-pretty text-ink-muted">
        {queue === 'pending'
          ? 'The review queue is empty. Anything a contributor sends in will appear here.'
          : 'No submissions in this state yet.'}
      </p>
    </div>
  )
}
