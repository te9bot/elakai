import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  EyeOff,
  Image as ImageIcon,
  LayoutList,
  Radio,
} from 'lucide-react'

import { ImportPanel } from '@/components/admin/import-panel'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryLabel, LISTING_SECTIONS, sectionLabel, type Listing } from '@/lib/listings'
import { errorMessage, fetchListingStats } from '@/lib/listings-admin'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Dashboard.
 *
 * Counts of things the admin actually acts on — how much exists, how much is
 * live, how much is hidden, how much has a picture. Deliberately no invented
 * engagement metrics: this system has no analytics behind it, and a chart of
 * numbers nobody measured is worse than no chart.
 * ========================================================================== */

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ['admin', 'listing-stats'], queryFn: fetchListingStats })

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-title">Dashboard</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            What the public site is showing right now.
          </p>
        </div>
        <Link
          to="/admin/listings"
          className="inline-flex items-center gap-1.5 text-body-sm font-bold text-primary hover:underline"
        >
          Manage listings
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {stats.isError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-danger-ink">Could not load the dashboard.</p>
            <p className="mt-1 text-meta text-danger-ink/80">
              {errorMessage(stats.error, 'Unknown error')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Total listings"
          value={stats.data?.total}
          loading={stats.isPending}
          icon={LayoutList}
          tone="neutral"
        />
        <Tile
          label="Active — live on the site"
          value={stats.data?.active}
          loading={stats.isPending}
          icon={Radio}
          tone="success"
        />
        <Tile
          label="Inactive — hidden"
          value={stats.data?.inactive}
          loading={stats.isPending}
          icon={EyeOff}
          tone="muted"
        />
        <Tile
          label="With an image"
          value={stats.data?.withImages}
          loading={stats.isPending}
          icon={ImageIcon}
          tone="primary"
        />
      </div>

      {/* Per-section counts, each a link into the listings screen already
          filtered to that section — so "12 healthcare listings" and "edit the
          healthcare listings" are the same click rather than two. */}
      <section className="mt-8">
        <h2 className="text-heading">By section</h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          Active listings on each part of the public site.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {LISTING_SECTIONS.map((s) => (
            <Link
              key={s.id}
              to={`/admin/listings?section=${s.id}`}
              className="group rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {stats.isPending ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="tnum text-title font-extrabold">{stats.data?.bySection[s.id] ?? 0}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-meta font-bold text-ink-subtle">
                {s.label}
                <ArrowRight
                  className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <ImportPanel totalListings={stats.data?.total} />

      <section className="mt-8">
        <h2 className="text-heading">Recently updated</h2>
        <p className="mt-1 text-body-sm text-ink-muted">The last five listings to change.</p>

        <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {stats.isPending ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="size-11 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.data?.recent.length ? (
            <ul className="divide-y divide-line">
              {stats.data.recent.map((listing) => (
                <li key={listing.id}>
                  <RecentRow listing={listing} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-body-sm text-ink-muted">
              Nothing has been published yet.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

const TONE = {
  neutral: 'bg-surface-2 text-ink-muted',
  success: 'bg-success-soft text-success-ink',
  muted: 'bg-warning-soft text-warning-ink',
  primary: 'bg-primary-soft text-primary-ink',
} as const

function Tile({
  label,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | undefined
  loading: boolean
  icon: typeof LayoutList
  tone: keyof typeof TONE
}) {
  return (
    <Card className="p-5">
      <span className={cn('grid size-11 place-items-center rounded-control', TONE[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="tnum mt-3 text-display font-extrabold">{value ?? 0}</p>
      )}
      <p className="mt-1 text-meta font-bold text-ink-subtle">{label}</p>
    </Card>
  )
}

/** Dates are rendered relative — "2 hours ago" reads faster than a timestamp. */
function relative(iso: string): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'

  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function RecentRow({ listing }: { listing: Listing }) {
  const active = listing.status === 'active'
  return (
    <Link
      to="/admin/listings"
      className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-canvas">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-4 text-ink-subtle" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-ink">
          {listing.title || 'Untitled listing'}
        </p>
        <p className="truncate text-meta text-ink-subtle">
          {[listing.section && sectionLabel(listing.section), listing.category && categoryLabel(listing.category)]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-meta text-ink-subtle">{relative(listing.updatedAt)}</p>
        <span
          className={cn(
            'mt-1 inline-flex items-center gap-1.5 text-meta font-bold',
            active ? 'text-success-ink' : 'text-ink-subtle',
          )}
        >
          <span
            className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-ink-subtle')}
            aria-hidden="true"
          />
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </Link>
  )
}
