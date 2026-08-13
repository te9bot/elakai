import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, FileEdit, Star } from 'lucide-react'

import { BrandLoader } from '@/components/brand-loader'
import { Card } from '@/components/ui/card'
import { requireSupabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Dashboard.
 *
 * Counts of things the admin actually acts on — how much is published, how
 * much is still a draft, how much is featured. Deliberately no invented
 * engagement metrics: this system has no analytics behind it, and a chart of
 * numbers nobody measured is worse than no chart.
 * ========================================================================== */

type Tile = { key: string; label: string; to: string; table: string }

const TILES: Tile[] = [
  { key: 'facilities', label: 'Healthcare facilities', to: '/admin/facilities', table: 'facilities' },
  { key: 'doctors', label: 'Doctors', to: '/admin/doctors', table: 'doctors' },
  { key: 'businesses', label: 'Local services', to: '/admin/businesses', table: 'businesses' },
  { key: 'rentals', label: 'Rentals', to: '/admin/rentals', table: 'rentals' },
  { key: 'emergency', label: 'Emergency contacts', to: '/admin/emergency', table: 'emergency_contacts' },
]

const CONTENT_TABLES = ['facilities', 'doctors', 'businesses', 'rentals'] as const

async function fetchCounts() {
  const db = requireSupabase()

  const count = async (table: string, apply?: (q: any) => any) => {
    let q = db.from(table).select('id', { count: 'exact', head: true })
    if (apply) q = apply(q)
    const { count: value, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    return value ?? 0
  }

  const [published, drafts, featured] = await Promise.all([
    Promise.all(TILES.map((t) => count(t.table, (q) => q.eq('status', 'published')))),
    Promise.all(CONTENT_TABLES.map((t) => count(t, (q) => q.eq('status', 'draft')))),
    Promise.all(CONTENT_TABLES.map((t) => count(t, (q) => q.eq('featured', true)))),
  ])

  return {
    perTile: Object.fromEntries(TILES.map((t, i) => [t.key, published[i]])) as Record<string, number>,
    drafts: drafts.reduce((a, b) => a + b, 0),
    featured: featured.reduce((a, b) => a + b, 0),
  }
}

export default function AdminDashboardPage() {
  const counts = useQuery({ queryKey: ['admin', 'counts'], queryFn: fetchCounts })

  if (counts.isPending) return <BrandLoader className="min-h-[50vh]" />

  if (counts.isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body-sm font-bold text-danger-ink">Could not load the dashboard.</p>
          <p className="mt-1 text-meta text-danger-ink/80">
            {counts.error instanceof Error ? counts.error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  const { perTile, drafts, featured } = counts.data

  return (
    <>
      <h1 className="text-title">Dashboard</h1>
      <p className="mt-1 text-body-sm text-ink-muted">
        Published records, by section. Drafts stay hidden from the public site.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={cn(
              'group rounded-card border border-line bg-surface p-5 shadow-card',
              'transition-[transform,box-shadow,border-color] duration-200',
              'hover:border-primary/40 hover:shadow-card-hover motion-safe:hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <p className="text-meta font-bold text-ink-subtle">{t.label}</p>
            <p className="tnum mt-2 text-display font-extrabold">{perTile[t.key] ?? 0}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-meta font-bold text-primary">
              Manage
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-control bg-warning-soft text-warning-ink">
            <FileEdit className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="tnum text-heading font-extrabold">{drafts}</p>
            <p className="text-meta text-ink-muted">Drafts — not visible publicly</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-ink">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="tnum text-heading font-extrabold">{featured}</p>
            <p className="text-meta text-ink-muted">Featured on the homepage</p>
          </div>
        </Card>
      </div>
    </>
  )
}
