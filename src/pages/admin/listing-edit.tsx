import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileQuestion } from 'lucide-react'

import { ListingDialog } from '@/components/admin/listing-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { adminGetListing, errorMessage } from '@/lib/listings-admin'

/* ==========================================================================
 * /admin/listings/:id/edit — one listing, by its database id.
 *
 * A route rather than only a modal, so an editor is a place: it can be
 * bookmarked, opened in a second tab, shared with whoever else has the admin
 * account, and survives a hard refresh. The listings screen still opens the
 * same editor inline for quick edits; this is the addressable form of it.
 *
 * The id is `public.listings.id` and is used unchanged from URL to query to
 * update. There is no index, no display order, no title lookup and no second
 * identifier anywhere in the path.
 *
 * The record is fetched by id here rather than taken from the list screen's
 * cache. That is the difference between a link that works and one that only
 * works if you arrived from the right filtered view — a row hidden by the
 * current filters is still editable at its own URL.
 *
 * The form itself is `ListingDialog`, unchanged. A second copy of a
 * twenty-field form would drift from the first within a week, and both would
 * then have to be kept honest about validation, the image lifecycle and the
 * unsaved-changes guard.
 * ========================================================================== */

export default function AdminListingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const listing = useQuery({
    queryKey: ['admin', 'listing', id],
    queryFn: () => adminGetListing(id!),
    enabled: Boolean(id),
    // A bad id resolves to null rather than erroring, so retrying only delays
    // the not-found screen by a round trip.
    retry: false,
  })

  /** Back to the directory, which is where this was almost certainly opened from. */
  function close() {
    navigate('/admin/listings')
  }

  function onSaved() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'listing-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'listing', id] })
    // The public site shares this cache — see the note in pages/admin/listings.tsx.
    void queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  if (listing.isPending) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (listing.isError) {
    return (
      <Failure
        icon={<AlertTriangle className="size-6" aria-hidden="true" />}
        title="That listing could not be loaded."
        body={errorMessage(listing.error, 'Something went wrong reaching the database.')}
        action={<Button onClick={() => void listing.refetch()}>Try again</Button>}
      />
    )
  }

  if (!listing.data) {
    return (
      <Failure
        icon={<FileQuestion className="size-6" aria-hidden="true" />}
        title="No listing with that id."
        body={`Nothing in the database has id ${id}. It may have been deleted, or the link may be wrong.`}
        action={<Button onClick={close}>Back to listings</Button>}
      />
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={close}
        className="mb-4 inline-flex items-center gap-1.5 rounded-control text-body-sm font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All listings
      </button>

      {/* Held open for the life of the route: closing the form is what leaves
          it, so `onOpenChange(false)` navigates rather than hiding a dialog and
          stranding the admin on an otherwise blank screen. The unsaved-changes
          guard inside still runs first. */}
      <ListingDialog
        open
        onOpenChange={(next) => !next && close()}
        listing={listing.data}
        onSaved={onSaved}
      />
    </>
  )
}

function Failure({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-line bg-surface px-6 py-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-ink-muted">
        {icon}
      </span>
      <h1 className="mt-4 text-heading text-balance">{title}</h1>
      <p className="mt-2 text-body-sm text-pretty text-ink-muted">{body}</p>
      <div className="mt-5 flex justify-center">{action}</div>
    </div>
  )
}
