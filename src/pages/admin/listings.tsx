import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Eye,
  ExternalLink,
  EyeOff,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { ConfirmDialog } from '@/components/admin/confirm'
import { Select } from '@/components/admin/form'
import { ListingDialog } from '@/components/admin/listing-dialog'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/use-debounce'
import {
  categoriesForSection,
  categoryLabel,
  LISTING_SECTIONS,
  sectionLabel,
  type Listing,
  type ListingStatus,
} from '@/lib/listings'
import {
  adminListListings,
  deleteListing,
  errorMessage,
  setListingStatus,
  type ListingSort,
} from '@/lib/listings-admin'
import { formatPhone, isDialable } from '@/lib/phone'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Listings management.
 *
 * Every filter and both sorts run in Postgres rather than over a fetched array,
 * so the screen behaves the same at forty listings and at four thousand.
 *
 * The row is the unit of work: edit, show/hide and delete all sit on it, and
 * the two destructive-ish ones announce what they change on the public site
 * rather than asking an abstract "are you sure?".
 * ========================================================================== */

const SORTS: { id: ListingSort; label: string }[] = [
  { id: 'display_order', label: 'Display order' },
  { id: 'created_at', label: 'Date created' },
  { id: 'updated_at', label: 'Last updated' },
  { id: 'title', label: 'Title' },
]

export default function AdminListingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // The section filter is held in the URL so a filtered view is linkable — the
  // dashboard's per-section tiles land here already narrowed, and the browser
  // back button steps out of the filter rather than off the screen.
  const [urlParams, setUrlParams] = useSearchParams()
  const section = urlParams.get('section') ?? ''

  function setSection(next: string) {
    setUrlParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next) out.set('section', next)
        else out.delete('section')
        return out
      },
      { replace: true },
    )
  }

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<ListingStatus | 'all'>('all')
  const [sort, setSort] = useState<ListingSort>('display_order')
  const [ascending, setAscending] = useState(true)

  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null)

  const debouncedSearch = useDebounce(search, 200)

  const params = { search: debouncedSearch, section, category, status, sort, ascending }

  const listings = useQuery({
    queryKey: ['admin', 'listings', params],
    queryFn: () => adminListListings(params),
  })

  /**
   * Which listing the editor is open on, held in the URL.
   *
   * `?edit=<id>` is the canonical `public.listings.id` — the same value the row
   * shows, the same one `/listing/:id` resolves, and the same one the PATCH
   * targets. Never an array index, a display order or a title.
   *
   * Keeping it in the URL rather than in component state is what makes an open
   * editor a real location: it can be linked to, reloaded, and stepped out of
   * with the browser's Back button instead of trapping the admin in a modal.
   * `?edit=new` opens the same form with no record behind it.
   */
  const editParam = urlParams.get('edit')
  const editing = useMemo(
    () =>
      editParam && editParam !== 'new'
        ? (listings.data ?? []).find((l) => String(l.id) === editParam) ?? null
        : null,
    [editParam, listings.data],
  )
  // Held open through the fetch, so a deep link to ?edit=12 does not flash the
  // "new listing" form while the row it names is still loading.
  const formOpen = editParam !== null

  function openEditor(id: number | 'new') {
    setUrlParams((prev) => {
      const out = new URLSearchParams(prev)
      out.set('edit', String(id))
      return out
    })
  }

  function closeEditor() {
    setUrlParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        out.delete('edit')
        return out
      },
      { replace: true },
    )
  }

  /**
   * Everything that could be showing the row just written goes stale.
   *
   * The third key is the public site's own: the admin panel and the public
   * pages are one SPA sharing one query cache, so without invalidating it a
   * publish would sit behind the public query's stale window until it happened
   * to refetch. Clearing it here is what makes "save, click View site, see it"
   * true rather than true-within-thirty-seconds.
   */
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'listing-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['listings'] })
  }

  const toggleStatus = useMutation({
    mutationFn: ({ id, next }: { id: number; next: ListingStatus }) => setListingStatus(id, next),
    onSuccess: (_data, { next }) => {
      toast(next === 'active' ? 'Listing is now live.' : 'Listing hidden from the public site.')
      refresh()
    },
    onError: (error) => toast(errorMessage(error, 'Could not change the status.'), 'error'),
  })

  const remove = useMutation({
    mutationFn: (listing: Listing) => deleteListing(listing),
    onSuccess: () => {
      toast('Listing deleted.')
      refresh()
    },
    onError: (error) => toast(errorMessage(error, 'Could not delete the listing.'), 'error'),
  })

  // Scoped to the chosen section so the dropdown never offers a category that
  // cannot match anything alongside it.
  const categoryOptions = useMemo(
    () => (section ? categoriesForSection(section) : []),
    [section],
  )

  const filtered = Boolean(debouncedSearch || section || category || status !== 'all')
  const rows = listings.data ?? []

  function clearFilters() {
    setSearch('')
    setSection('')
    setCategory('')
    setStatus('all')
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title">Listings</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            Everything the public site shows. Active listings are live.
          </p>
        </div>
        <Button onClick={() => openEditor('new')}>
          <Plus aria-hidden="true" />
          New listing
        </Button>
      </div>

      {/* ---- Filters ---- */}
      <div className="mt-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-subtle"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings"
              aria-label="Search listings"
              className="pl-11"
            />
          </div>

          <Select
            aria-label="Filter by section"
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setCategory('')
            }}
          >
            <option value="">All sections</option>
            {LISTING_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by category"
            value={category}
            disabled={!section}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{section ? 'All categories' : 'Pick a section first'}</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ListingStatus | 'all')}
          >
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-meta font-bold text-ink-subtle">Sort by</span>
          <Select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as ListingSort)}
            className="h-10 w-auto text-body-sm"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAscending((v) => !v)}
            aria-label={ascending ? 'Sort descending' : 'Sort ascending'}
          >
            {ascending ? <ArrowUpAZ aria-hidden="true" /> : <ArrowDownAZ aria-hidden="true" />}
            {ascending ? 'Ascending' : 'Descending'}
          </Button>

          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
              <X aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="mt-4">
        {listings.isPending ? (
          <TableSkeleton />
        ) : listings.isError ? (
          <ErrorState message={errorMessage(listings.error, 'Could not load listings.')} />
        ) : rows.length === 0 ? (
          <EmptyState filtered={filtered} onClear={clearFilters} onCreate={() => openEditor('new')} />
        ) : (
          <>
            <p className="mb-2 text-meta text-ink-subtle">
              {rows.length} {rows.length === 1 ? 'listing' : 'listings'}
            </p>

            <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {/* Horizontal scroll is contained here so the page itself never
                  scrolls sideways on a phone. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-2">
                      <Th className="w-[46%]">Listing</Th>
                      <Th>Section</Th>
                      <Th>Category</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Order</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((listing) => (
                      <Row
                        key={listing.id}
                        listing={listing}
                        busy={
                          (toggleStatus.isPending && toggleStatus.variables?.id === listing.id) ||
                          (remove.isPending && remove.variables?.id === listing.id)
                        }
                        onToggle={() =>
                          toggleStatus.mutate({
                            id: listing.id,
                            next: listing.status === 'active' ? 'inactive' : 'active',
                          })
                        }
                        onDelete={() => setPendingDelete(listing)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ListingDialog
        open={formOpen}
        onOpenChange={(next) => !next && closeEditor()}
        listing={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete this listing?"
        description={
          pendingDelete
            ? `“${pendingDelete.title || 'Untitled listing'}” will be removed from the public site and permanently deleted, along with its image. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return
          await remove.mutateAsync(pendingDelete).catch(() => {
            // The mutation's onError has already reported this; swallowing here
            // keeps the dialog from rethrowing into an unhandled rejection.
          })
          setPendingDelete(null)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Table parts                                                         */
/* ------------------------------------------------------------------ */

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('px-4 py-3 text-meta font-bold uppercase text-ink-subtle', className)}
    >
      {children}
    </th>
  )
}

function Row({
  listing,
  busy,
  onToggle,
  onDelete,
}: {
  listing: Listing
  busy: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const active = listing.status === 'active'

  return (
    <tr
      className={cn(
        'border-b border-line last:border-0 transition-colors hover:bg-surface-2',
        busy && 'opacity-50',
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-canvas">
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <ImageOff className="size-4 text-ink-subtle" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-bold text-ink">
              {listing.title || 'Untitled listing'}
            </p>
            <p className="truncate text-meta text-ink-subtle">
              {listing.location || listing.address || '—'}
            </p>
            {/* The number as the public site would dial it, or a warning that
                it would not. This is the column an admin scans when working
                through the placeholders, so it says which is which. */}
            {listing.phone && (
              <p
                className={cn(
                  'tnum mt-0.5 truncate text-meta',
                  isDialable(listing.phone) ? 'text-ink-subtle' : 'text-warning-ink',
                )}
              >
                {isDialable(listing.phone)
                  ? formatPhone(listing.phone)
                  : `${formatPhone(listing.phone)} · will not dial`}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-body-sm text-ink-muted">
        {listing.section ? sectionLabel(listing.section) : '—'}
      </td>

      <td className="px-4 py-3 text-body-sm text-ink-muted">
        {listing.category ? categoryLabel(listing.category) : '—'}
      </td>

      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-meta font-bold',
            active ? 'bg-success-soft text-success-ink' : 'bg-surface-2 text-ink-muted',
          )}
        >
          <span
            className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-ink-subtle')}
            aria-hidden="true"
          />
          {active ? 'Active' : 'Inactive'}
        </span>
      </td>

      <td className="tnum px-4 py-3 text-right text-body-sm text-ink-muted">
        {listing.displayOrder}
      </td>

      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {/* The real public page for this row, at its canonical id — not a
              preview built from a separate dataset. Opens in a new tab so the
              admin does not lose their place in a filtered list. Only offered
              when the listing is actually reachable: an inactive row 404s on
              the public site, which would look like a broken link here. */}
          {active && (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              aria-label={`View ${listing.title || 'listing'} on the public site`}
              title="View on the public site"
            >
              <a href={`/elakai/listing/${listing.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            disabled={busy}
            aria-label={active ? 'Hide from the public site' : 'Show on the public site'}
            title={active ? 'Hide from the public site' : 'Show on the public site'}
          >
            {active ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
          {/* A link, not a button: the editor is a real route keyed on this
              row's database id, so it opens in a new tab on middle-click and
              can be copied out of the context menu like any other address. */}
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${listing.title || 'listing'}`}
            title="Edit"
          >
            <Link to={`/admin/listings/${listing.id}/edit`}>
              <Pencil aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${listing.title || 'listing'}`}
            title="Delete"
            className="text-danger hover:bg-danger-soft"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-12 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-body-sm font-bold text-danger-ink">Could not load listings.</p>
        <p className="mt-1 text-meta text-danger-ink/80">{message}</p>
      </div>
    </div>
  )
}

function EmptyState({
  filtered,
  onClear,
  onCreate,
}: {
  filtered: boolean
  onClear: () => void
  onCreate: () => void
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-2 text-ink-muted">
        {filtered ? (
          <Search className="size-6" aria-hidden="true" />
        ) : (
          <Plus className="size-6" aria-hidden="true" />
        )}
      </span>
      <h2 className="mt-4 text-heading">
        {filtered ? 'Nothing matches those filters' : 'No listings yet'}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-ink-muted">
        {filtered
          ? 'Try a different search, or clear the filters to see everything.'
          : 'The first listing you create appears on the public site straight away.'}
      </p>
      <Button className="mt-5" variant={filtered ? 'secondary' : 'primary'} onClick={filtered ? onClear : onCreate}>
        {filtered ? 'Clear filters' : 'Create the first listing'}
      </Button>
    </div>
  )
}
