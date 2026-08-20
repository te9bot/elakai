import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Eye, ImageOff, Inbox, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/admin/confirm'
import { RowAction, RowActions } from '@/components/admin/row-actions'
import { useToast } from '@/components/admin/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionLabel } from '@/lib/listings'
import { useReducedMotion } from '@/lib/motion'
import { captureRows, playFlip, tossToTarget, type FlipSnapshot } from '@/lib/toss'
import { categoryLabel } from '@/lib/submission-fields'
import {
  adminDeleteSubmission,
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

  /* ------------------------------------------------------------------ *
   * Deleting an approved submission
   *
   * Same shape as the listings table's delete, and deliberately so — the same
   * `tossToTarget` and the same FLIP, so a deletion feels identical wherever an
   * administrator performs one. Reusing lib/toss.ts rather than writing a
   * second animation is the whole reason that file takes a source and a target
   * instead of knowing about rows.
   *
   * Supabase is authoritative here exactly as it is there: the row leaves the
   * cache only after `adminDeleteSubmission` resolves, and a refusal puts the
   * card back and says so.
   * ------------------------------------------------------------------ */

  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()

  const listRef = useRef<HTMLUListElement>(null)
  const cardNodes = useRef(new Map<string, HTMLElement>())
  const menuNodes = useRef(new Map<string, HTMLButtonElement>())

  const [pendingDelete, setPendingDelete] = useState<Submission | null>(null)
  /** §17's guard, held across the animation as well as the request. */
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const flipFrom = useRef<FlipSnapshot | null>(null)
  useLayoutEffect(() => {
    if (!flipFrom.current) return
    playFlip(listRef.current, flipFrom.current, { reduced })
    flipFrom.current = null
  })

  const remove = useMutation({
    mutationFn: (submission: Submission) => adminDeleteSubmission(submission),
  })

  const runDelete = useCallback(
    async (submission: Submission) => {
      if (deletingId !== null) return
      setDeletingId(submission.id)

      const card = cardNodes.current.get(submission.id) ?? null
      // The ⋮ button the delete was chosen from — the same "throw it back where
      // the decision was made" rule the listings table follows.
      const menu = menuNodes.current.get(submission.id) ?? null

      const request = remove.mutateAsync(submission)
      request.catch(() => {})

      // One frame, so the confirmation dialog's overlay is gone before the
      // clone crosses the space it occupied.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const toss = card ? tossToTarget({ source: card, target: menu, reduced }) : null

      try {
        await request
        await toss?.finished

        flipFrom.current = captureRows(listRef.current)

        // Removed in the same commit the FLIP measures against; `invalidate`
        // below still reconciles with the server.
        queryClient.setQueryData<Submission[]>(['admin', 'submissions', queue], (current) =>
          current?.filter((row) => row.id !== submission.id),
        )

        toast('Submission deleted successfully.', 'success')
        // Every admin key: the queue itself, the counts behind the sidebar
        // badge, and the contributor list whose totals include this row.
        void queryClient.invalidateQueries({ queryKey: ['admin'] })
      } catch (error) {
        toss?.restore()
        toast(submissionError(error, 'Could not delete the submission.'), 'error')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId, reduced, remove, queryClient, queue, toast],
  )

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
          <ul ref={listRef} className="space-y-2">
            {rows.map((s) => (
              <li key={s.id}>
                <QueueRow
                  submission={s}
                  /*
                   * The menu is offered on approved rows only.
                   *
                   * Not an inconsistency — it is the only queue with a
                   * destructive action to put in a menu. A ⋮ on a pending row
                   * would open onto "View details", which is what clicking the
                   * card already does, so it would be an extra control that
                   * duplicates the card it sits on. Pending and rejected cards
                   * are therefore exactly as they were.
                   *
                   * Edit is deliberately absent even here. An approved
                   * submission cannot be edited at all: `guard_submission_status`
                   * in migration 0008 raises on any UPDATE to a row whose old
                   * status is 'approved', because the row is the record of what
                   * was approved. A menu item for it would be a button that
                   * always fails.
                   */
                  actions={s.status === 'approved'}
                  busy={deletingId === s.id}
                  locked={deletingId !== null}
                  register={(node) => {
                    if (node) cardNodes.current.set(s.id, node)
                    else cardNodes.current.delete(s.id)
                  }}
                  registerMenu={(node) => {
                    if (node) menuNodes.current.set(s.id, node)
                    else menuNodes.current.delete(s.id)
                  }}
                  onView={() => navigate(`/admin/submissions/${s.id}`)}
                  onDelete={() => setPendingDelete(s)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        What is actually about to happen, rather than "are you sure?".
        Three consequences, and two of them are the ones an administrator is
        most likely to have the wrong idea about: the public listing survives
        this, and the contributor keeps the points it earned.
      */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete submission?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently removed from the review records and from ${
                pendingDelete.contributor?.fullName ||
                pendingDelete.contributor?.email ||
                'the contributor'
              }’s contribution history. The published listing stays on the public site and the 50 RP Points already awarded are not taken back. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        destructive
        /*
         * Not awaited, and the dialog closes first — the same reasoning as the
         * listings table: awaiting here would hold the modal and its dimmed
         * overlay over the whole animation.
         */
        onConfirm={() => {
          const submission = pendingDelete
          setPendingDelete(null)
          if (submission) void runDelete(submission)
        }}
      />
    </>
  )
}

function QueueRow({
  submission: s,
  actions = false,
  busy = false,
  locked = false,
  register,
  registerMenu,
  onView,
  onDelete,
}: {
  submission: Submission
  actions?: boolean
  busy?: boolean
  locked?: boolean
  register?: (node: HTMLElement | null) => void
  registerMenu?: (node: HTMLButtonElement | null) => void
  onView?: () => void
  onDelete?: () => void
}) {
  const place = [s.location, s.address].filter(Boolean)[0] ?? ''

  /*
   * THE CARD WAS A `<Link>`. IT IS NOW A DIV WITH THE LINK STRETCHED ACROSS IT.
   *
   * Every class below is the one that was on the `<Link>` — same border, same
   * radius, same padding, same shadow, same hover, same gap. The card looks and
   * measures identically; what changed is where the anchor is.
   *
   * It had to change, because a `<button>` inside an `<a>` is invalid HTML and
   * browsers resolve it by swallowing the button's clicks into the link. The
   * menu would have navigated instead of opening. So the anchor becomes an
   * overlay covering the card, the menu sits above it, and the whole card is
   * still one click target.
   *
   * The focus ring moves with it: `:has(a:focus-visible)` puts the ring on the
   * card when the stretched link is focused, which is what a keyboard user was
   * seeing before. Written as an arbitrary variant rather than `focus-within`
   * on purpose — `focus-within` would also ring the card when the ⋮ button is
   * focused, and that button has a ring of its own.
   */
  return (
    <div
      ref={register}
      data-flip-key={s.id}
      className={cn(
        'relative flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card',
        'transition-colors hover:border-primary/40 hover:bg-surface-2',
        '[&:has(a:focus-visible)]:outline-none [&:has(a:focus-visible)]:ring-2 [&:has(a:focus-visible)]:ring-primary',
      )}
    >
      <Link
        to={`/admin/submissions/${s.id}`}
        // The whole card, as one target. `rounded-card` so the focus ring and
        // any future outline follow the card's corners rather than a rectangle
        // over them.
        className="absolute inset-0 z-0 rounded-card focus-visible:outline-none"
      >
        <span className="sr-only">Review {s.title}</span>
      </Link>
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

      {/*
        The trailing slot: the chevron the card has always had, or the actions
        menu in its place. One or the other, never both, and both are laid out
        the same way — `shrink-0` in the same flex row at the same right-hand
        padding — so swapping them moves nothing else on the card.

        `relative z-10` lifts the menu above the stretched link behind it.
        Without it the anchor would take the click and navigate.
      */}
      {actions ? (
        <div className="relative z-10 shrink-0">
          <RowActions label={s.title} disabled={locked} triggerRef={registerMenu}>
            {(close) => (
              <>
                <RowAction
                  icon={Eye}
                  onSelect={() => {
                    close()
                    onView?.()
                  }}
                >
                  View details
                </RowAction>
                <RowAction
                  icon={Trash2}
                  destructive
                  disabled={busy}
                  onSelect={() => {
                    // Closed first: the confirmation dialog moves focus, and a
                    // popover still open underneath it fights for that focus
                    // and closes on the dialog's first outside-click.
                    close()
                    onDelete?.()
                  }}
                >
                  Delete
                </RowAction>
              </>
            )}
          </RowActions>
        </div>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
      )}
    </div>
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
