import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'

import { BrandLoader } from '@/components/brand-loader'
import { EmptyState, ErrorState } from '@/components/feedback'
import { ConfirmDialog } from '@/components/admin/confirm'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { useAdminAuth } from '@/lib/auth'
import {
  adminDelete,
  adminList,
  adminSetFeatured,
  adminSetStatus,
  type SortSpec,
} from '@/lib/admin-api'
import type { RecordStatus } from '@/lib/db'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Resource list.
 *
 * One implementation behind every directory screen. Six hand-written tables
 * would each grow their own idea of what "archive" means, and the one that
 * matters — that unpublishing hides a record from the public site without
 * destroying it — is exactly the kind of thing that drifts.
 *
 * On a phone the table becomes a stack of cards rather than a horizontally
 * scrolling grid. A row of eight columns squeezed into 360px is unreadable,
 * and the actions are the part that has to stay reachable.
 * ========================================================================== */

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Header cell width utility, e.g. 'w-40'. */
  className?: string
  /** Hidden on the mobile card view — used for low-value columns. */
  desktopOnly?: boolean
}

export type FilterDef = {
  column: string
  label: string
  options: { value: string; label: string }[]
}

export type ResourceConfig<T> = {
  table: string
  select: string
  title: string
  /** Lower-case singular, used in messages: "hospital created". */
  singular: string
  basePath: string
  searchColumns: string[]
  searchPlaceholder?: string
  columns: Column<T>[]
  filters?: FilterDef[]
  defaultSort: SortSpec
  hasFeatured?: boolean
  getId: (row: T) => string
  getLabel: (row: T) => string
  getStatus: (row: T) => RecordStatus
  getFeatured?: (row: T) => boolean
  /** Public route for the preview link, when the record has one. */
  publicPath?: (row: T) => string | null
}

const PAGE_SIZE = 25

const STATUS_STYLE: Record<RecordStatus, string> = {
  published: 'border-success/30 bg-success-soft text-success-ink',
  draft: 'border-warning/30 bg-warning-soft text-warning-ink',
  archived: 'border-line bg-surface-2 text-ink-subtle',
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2.5 py-1 text-micro uppercase',
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
  )
}

export function ResourceList<T>({ config }: { config: ResourceConfig<T> }) {
  const { profile } = useAdminAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rawSearch, setRawSearch] = useState('')
  const search = useDebounce(rawSearch, 250)
  const [status, setStatus] = useState<RecordStatus | 'all'>('all')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    id: string
    label: string
    kind: 'archive' | 'delete'
  } | null>(null)

  const actor = useMemo(
    () => ({ id: profile?.id ?? null, email: profile?.email ?? null }),
    [profile],
  )

  const queryKey = ['admin', config.table, { search, status, filters, page }]

  const list = useQuery({
    queryKey,
    queryFn: () =>
      adminList<T>({
        table: config.table,
        select: config.select,
        search,
        searchColumns: config.searchColumns,
        filters,
        status,
        sort: config.defaultSort,
        page,
        pageSize: PAGE_SIZE,
      }),
    // Holds the current page on screen while the next one loads, so paging
    // does not blank the table between clicks.
    placeholderData: (prev) => prev,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', config.table] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'counts'] })
  }

  /** Wraps a row action so every one of them reports success and failure. */
  async function run(id: string, message: string, action: () => Promise<void>) {
    setBusyId(id)
    try {
      await action()
      invalidate()
      toast(message)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Something went wrong', 'error')
    } finally {
      setBusyId(null)
    }
  }

  function patchFilter(column: string, value: string) {
    setPage(1)
    setFilters((prev) => {
      const next = { ...prev }
      if (value) next[column] = value
      else delete next[column]
      return next
    })
  }

  const rows = list.data?.rows ?? []
  const total = list.data?.total ?? 0
  const pageCount = list.data?.pageCount ?? 1

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-title">{config.title}</h1>
          <p className="tnum mt-1 text-body-sm text-ink-muted">
            {list.isPending ? 'Loading…' : `${total} record${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button asChild className="ml-auto">
          <Link to={`${config.basePath}/new`}>
            <Plus aria-hidden="true" />
            Add {config.singular}
          </Link>
        </Button>
      </div>

      {/* ---- Controls ---- */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <Input
            value={rawSearch}
            onChange={(e) => {
              setRawSearch(e.target.value)
              setPage(1)
            }}
            placeholder={config.searchPlaceholder ?? `Search ${config.title.toLowerCase()}…`}
            aria-label={`Search ${config.title}`}
            className="pl-11"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RecordStatus | 'all')
            setPage(1)
          }}
          aria-label="Filter by status"
          className="h-12 rounded-control border border-line bg-surface px-3 text-body-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        {config.filters?.map((f) => (
          <select
            key={f.column}
            value={filters[f.column] ?? ''}
            onChange={(e) => patchFilter(f.column, e.target.value)}
            aria-label={f.label}
            className="h-12 rounded-control border border-line bg-surface px-3 text-body-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* ---- Results ---- */}
      {list.isPending ? (
        <BrandLoader className="min-h-[40vh]" />
      ) : list.isError ? (
        <div className="mt-6">
          <ErrorState onRetry={() => void list.refetch()} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No ${config.title.toLowerCase()} found`}
            description={
              search || status !== 'all' || Object.keys(filters).length
                ? 'Nothing matches these filters. Try clearing them.'
                : `Nothing here yet. Add the first ${config.singular}.`
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card lg:block">
            <table className="w-full text-left">
              <thead className="border-b border-line">
                <tr>
                  {config.columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn('px-4 py-3 text-micro uppercase text-ink-subtle', c.className)}
                    >
                      {c.header}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-micro uppercase text-ink-subtle">
                    Status
                  </th>
                  <th scope="col" className="w-px whitespace-nowrap px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = config.getId(row)
                  return (
                    <tr key={id} className="border-b border-line last:border-0 hover:bg-surface-2/50">
                      {config.columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 align-middle text-body-sm">
                          {c.render(row)}
                        </td>
                      ))}
                      <td className="px-4 py-3 align-middle">
                        <StatusBadge status={config.getStatus(row)} />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <RowActions
                          config={config}
                          row={row}
                          busy={busyId === id}
                          onRun={run}
                          onConfirm={setConfirm}
                          actor={actor}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-5 space-y-3 lg:hidden">
            {rows.map((row) => {
              const id = config.getId(row)
              return (
                <li
                  key={id}
                  className="rounded-card border border-line bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-bold">{config.getLabel(row)}</p>
                      <dl className="mt-2 space-y-1">
                        {config.columns
                          .filter((c) => !c.desktopOnly && c.key !== 'name')
                          .map((c) => (
                            <div key={c.key} className="flex gap-2 text-meta">
                              <dt className="text-ink-subtle">{c.header}</dt>
                              <dd className="min-w-0 text-ink-muted">{c.render(row)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                    <StatusBadge status={config.getStatus(row)} />
                  </div>
                  <div className="mt-3 border-t border-line pt-3">
                    <RowActions
                      config={config}
                      row={row}
                      busy={busyId === id}
                      onRun={run}
                      onConfirm={setConfirm}
                      actor={actor}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          {/* ---- Pagination ---- */}
          {pageCount > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-5 flex items-center justify-between gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || list.isFetching}
              >
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
              <p className="tnum text-meta text-ink-muted">
                Page {page} of {pageCount}
                {list.isFetching && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount || list.isFetching}
              >
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive={confirm?.kind === 'delete'}
        title={confirm?.kind === 'delete' ? 'Delete permanently?' : 'Archive this record?'}
        description={
          confirm?.kind === 'delete'
            ? `“${confirm?.label}” will be erased. This cannot be undone — archive it instead if you only want it off the public site.`
            : `“${confirm?.label}” will be removed from public listings. It stays here and can be published again at any time.`
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Delete permanently' : 'Archive'}
        onConfirm={async () => {
          if (!confirm) return
          if (confirm.kind === 'delete') {
            await run(confirm.id, `${confirm.label} deleted.`, () =>
              adminDelete(config.table, confirm.id, actor),
            )
          } else {
            await run(confirm.id, `${confirm.label} archived.`, () =>
              adminSetStatus(config.table, confirm.id, 'archived', actor),
            )
          }
          setConfirm(null)
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Row actions                                                         */
/* ------------------------------------------------------------------ */

function RowActions<T>({
  config,
  row,
  busy,
  onRun,
  onConfirm,
  actor,
}: {
  config: ResourceConfig<T>
  row: T
  busy: boolean
  onRun: (id: string, message: string, action: () => Promise<void>) => Promise<void>
  onConfirm: (c: { id: string; label: string; kind: 'archive' | 'delete' }) => void
  actor: { id: string | null; email: string | null }
}) {
  const id = config.getId(row)
  const label = config.getLabel(row)
  const status = config.getStatus(row)
  const featured = config.getFeatured?.(row) ?? false
  const published = status === 'published'

  const iconButton =
    'grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40'

  return (
    <div className="flex items-center gap-0.5">
      {busy && <Loader2 className="mr-1 size-4 animate-spin text-ink-subtle" aria-hidden="true" />}

      <Link to={`${config.basePath}/${id}`} className={iconButton} aria-label={`Edit ${label}`}>
        <Pencil className="size-[18px]" />
      </Link>

      <button
        type="button"
        disabled={busy}
        className={iconButton}
        aria-label={published ? `Unpublish ${label}` : `Publish ${label}`}
        onClick={() =>
          void onRun(
            id,
            published ? `${label} unpublished — hidden from the site.` : `${label} published.`,
            () => adminSetStatus(config.table, id, published ? 'draft' : 'published', actor),
          )
        }
      >
        {published ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>

      {config.hasFeatured && (
        <button
          type="button"
          disabled={busy}
          className={iconButton}
          aria-label={featured ? `Remove ${label} from featured` : `Feature ${label}`}
          aria-pressed={featured}
          onClick={() =>
            void onRun(
              id,
              featured ? `${label} removed from featured.` : `${label} featured.`,
              () => adminSetFeatured(config.table, id, !featured, actor),
            )
          }
        >
          <Star className={cn('size-[18px]', featured && 'fill-warning text-warning')} />
        </button>
      )}

      <button
        type="button"
        disabled={busy || status === 'archived'}
        className={iconButton}
        aria-label={`Archive ${label}`}
        onClick={() => onConfirm({ id, label, kind: 'archive' })}
      >
        <Archive className="size-[18px]" />
      </button>

      <button
        type="button"
        disabled={busy}
        className={cn(iconButton, 'hover:bg-danger-soft hover:text-danger-ink')}
        aria-label={`Delete ${label}`}
        onClick={() => onConfirm({ id, label, kind: 'delete' })}
      >
        <Trash2 className="size-[18px]" />
      </button>
    </div>
  )
}
