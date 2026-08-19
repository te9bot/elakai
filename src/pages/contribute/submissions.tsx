import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, ImageOff } from 'lucide-react'

import {
  EmptyState,
  LoadFailure,
  StatusPill,
  formatDate,
} from '@/components/contribute/contribute-parts'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/lib/auth'
import { sectionLabel } from '@/lib/listings'
import { categoryLabel } from '@/lib/submission-fields'
import {
  listMySubmissions,
  submissionError,
  type Submission,
  type SubmissionStatus,
} from '@/lib/submissions'
import { cn } from '@/lib/utils'

/**
 * My contributions.
 *
 * §14: title, category, date, status, last updated, points earned, thumbnail.
 * All of it on one row, because the question this screen answers is "where is
 * the thing I sent" and answering it should not require opening anything.
 */
const FILTERS: { id: SubmissionStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Not accepted' },
]

export default function ContributeSubmissionsPage() {
  const { schemaReady } = useAccount()
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all')

  const query = useQuery({
    queryKey: ['contribute', 'submissions'],
    queryFn: listMySubmissions,
    enabled: schemaReady,
  })

  const all = query.data ?? []
  const shown = useMemo(
    () => (filter === 'all' ? all : all.filter((s) => s.status === filter)),
    [all, filter],
  )

  // Counted from what is already loaded rather than asked for separately: the
  // whole list is in memory, so a second round trip would buy nothing.
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: all.length }
    for (const s of all) out[s.status] = (out[s.status] ?? 0) + 1
    return out
  }, [all])

  if (!schemaReady) {
    return <LoadFailure message="Contributions are not switched on for this site yet." />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              'rounded-pill px-3.5 py-2 text-body-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-ink-muted hover:text-ink',
            )}
          >
            {f.label}
            {counts[f.id] !== undefined && (
              <span className="tnum ml-1.5 opacity-70">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </div>

      {query.isError && <LoadFailure message={submissionError(query.error)} />}

      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-card" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          title="You have not submitted anything yet"
          body="Add a pharmacy, a service, a rental or an emergency contact. An administrator checks it, and you get 50 RP Points when it is approved."
          actionLabel="Submit information"
          actionTo="/contribute/submit"
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={`Nothing ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}`}
          body="Choose another filter to see the rest of your contributions."
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => (
            <li key={s.id}>
              <SubmissionRow submission={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SubmissionRow({ submission: s }: { submission: Submission }) {
  return (
    <Link
      to={`/contribute/submissions/${s.id}`}
      className={cn(
        'flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card',
        'transition-colors hover:border-primary/40 hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <Thumbnail url={s.imageUrl} alt="" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-body-sm font-bold">{s.title}</p>
          {s.targetListingId && (
            <span className="shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-ink-subtle">
              Change
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-meta text-ink-subtle">
          {[
            s.category ? categoryLabel(s.category) : sectionLabel(s.section),
            `Sent ${formatDate(s.submittedAt)}`,
            // Only worth saying when it differs from the submission date;
            // otherwise every row carries the same date twice.
            s.updatedAt && s.updatedAt.slice(0, 10) !== s.submittedAt.slice(0, 10)
              ? `Updated ${formatDate(s.updatedAt)}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {/* The rejection reason on the row itself, not hidden behind a click.
            It is the one piece of information a contributor with a refused
            submission actually came here for. */}
        {s.status === 'rejected' && s.rejectionReason && (
          <p className="mt-1 truncate text-meta font-semibold text-danger-ink">
            {s.rejectionReason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {s.status === 'approved' && (
          <span className="tnum hidden text-body-sm font-extrabold text-primary sm:block">
            +50
          </span>
        )}
        <StatusPill status={s.status} />
        <ChevronRight className="size-4 text-ink-subtle" aria-hidden="true" />
      </div>
    </Link>
  )
}

/**
 * A 56px square.
 *
 * `object-cover` with a fixed box rather than an intrinsic image, so a portrait
 * shopfront and a landscape signboard produce rows of the same height — a list
 * whose rows jump around by fifty pixels is much harder to scan than one with a
 * uniform crop.
 */
function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span className="grid size-14 shrink-0 place-items-center rounded-control bg-surface-2 text-ink-subtle">
        <ImageOff className="size-5" aria-hidden="true" />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="size-14 shrink-0 rounded-control bg-surface-2 object-cover"
    />
  )
}
