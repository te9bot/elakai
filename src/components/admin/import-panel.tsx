import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, DatabaseZap, Loader2, Wand2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/admin/confirm'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { invalidateDirectory } from '@/lib/api'
import { sectionLabel } from '@/lib/listings'
import { errorMessage } from '@/lib/listings-admin'
import {
  backfillRichColumns,
  buildImportRows,
  describeUnmapped,
  hasRichColumns,
  importBundledListings,
  type BackfillReport,
  type ImportReport,
} from '@/lib/listings-import'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Bundled-data import.
 *
 * The directory shipped with the site before there was a backend. This moves
 * it into `public.listings` so the table becomes the single source of truth.
 *
 * Runs under the admin's own session — the same RLS policies that authorise a
 * hand-typed listing authorise these — and is idempotent on `slug`, so the
 * button is safe to press twice. It is shown permanently rather than only when
 * the table is empty, because the honest answer to "did that work?" is the
 * report it prints, not a panel that vanishes.
 * ========================================================================== */

export function ImportPanel({ totalListings }: { totalListings: number | undefined }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [confirming, setConfirming] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [report, setReport] = useState<ImportReport | null>(null)
  const [backfillReport, setBackfillReport] = useState<BackfillReport | null>(null)

  /**
   * Whether migration 0004 is applied. Decides which of the two jobs this panel
   * offers, and whether an import would carry the whole record or a flattened
   * one — so it is asked rather than assumed.
   */
  const schema = useQuery({
    queryKey: ['admin', 'listings-schema'],
    queryFn: hasRichColumns,
    staleTime: 60 * 1000,
  })
  const rich = schema.data === true

  async function runBackfill() {
    setBackfilling(true)
    setBackfillReport(null)
    setProgress({ done: 0, total: 0 })
    try {
      const result = await backfillRichColumns((done, total) => setProgress({ done, total }))
      setBackfillReport(result)
      // The public read path caches the directory per tab. See api.ts.
      invalidateDirectory()
      if (result.failed.length) {
        toast(`Filled ${result.updated}, ${result.failed.length} failed.`, 'error')
      } else {
        toast(`Filled the added columns on ${result.updated} listings.`)
      }
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['listings'] })
    } catch (error) {
      toast(errorMessage(error, 'The backfill could not run.'), 'error')
    } finally {
      setBackfilling(false)
    }
  }

  // Counted from the bundled modules themselves, so the number quoted on the
  // button is the number that will actually be attempted.
  const bundled = useMemo(() => buildImportRows().length, [])
  const unmapped = useMemo(() => describeUnmapped(), [])

  async function run() {
    setRunning(true)
    setReport(null)
    setProgress({ done: 0, total: 0 })
    try {
      const result = await importBundledListings((done, total) => setProgress({ done, total }))
      setReport(result)
      invalidateDirectory()

      if (result.failed.length) {
        toast(`Imported ${result.imported}, ${result.failed.length} failed.`, 'error')
      } else if (result.imported === 0) {
        toast('Everything was already imported.', 'info')
      } else {
        toast(`Imported ${result.imported} listings.`)
      }

      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['listings'] })
    } catch (error) {
      toast(errorMessage(error, 'The import could not run.'), 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="mt-8 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-ink">
          <DatabaseZap className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-heading">Bundled directory</h2>
          <p className="mt-1 max-w-prose text-body-sm text-ink-muted">
            {bundled} records ship with the site — businesses, rentals, emergency contacts,
            healthcare facilities and doctors. Importing copies them into{' '}
            <code className="text-meta">public.listings</code> so this panel becomes the one place
            they are edited. Records are matched on section and title, so running it again only
            adds what is missing.
          </p>

          {schema.isSuccess && !rich && (
            <div
              role="status"
              className="mt-3 max-w-prose rounded-control border border-warning/30 bg-warning-soft px-4 py-3"
            >
              <p className="flex items-center gap-2 text-body-sm font-bold text-warning-ink">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                The wider columns are missing
              </p>
              <p className="mt-1.5 text-meta text-warning-ink/85">
                Run{' '}
                <code className="text-meta">
                  supabase/migrations/0004_listings_full_schema.sql
                </code>{' '}
                in the Supabase SQL editor. Until then this table cannot hold{' '}
                {unmapped.length} kinds of detail, so imported records lose them and the public
                site keeps rendering the bundled copies instead. The migration only adds columns —
                nothing is dropped or renamed, and it is safe to run twice.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-meta font-bold text-warning-ink">
                  What is lost without it
                </summary>
                <ul className="mt-2 space-y-1">
                  {unmapped.map((u) => (
                    <li key={u.field} className="text-meta text-warning-ink/85">
                      <span className="font-semibold">{u.field}</span>{' '}
                      <span className="tnum">({u.records})</span> — {u.note}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {rich && (
            <p className="mt-3 max-w-prose rounded-control border border-line bg-canvas px-4 py-3 text-meta text-ink-muted">
              The wider columns are in place, so an import carries the whole record. If listings
              were imported <em>before</em> the migration, use <strong>Fill added columns</strong>{' '}
              to complete them — it writes only the new columns and leaves everything you have
              edited untouched.
            </p>
          )}

          {running && progress.total > 0 && (
            <div className="mt-3 max-w-sm">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 tnum text-meta text-ink-subtle">
                {progress.done} of {progress.total}
              </p>
            </div>
          )}

          {report && <Report report={report} />}
          {backfillReport && <BackfillSummary report={backfillReport} />}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button
            variant={totalListings === 0 ? 'primary' : 'secondary'}
            disabled={running || backfilling}
            onClick={() => setConfirming(true)}
          >
            {running ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <DatabaseZap aria-hidden="true" />
            )}
            {running ? 'Importing…' : 'Import bundled data'}
          </Button>

          {rich && (
            <Button
              variant="secondary"
              disabled={running || backfilling}
              onClick={() => void runBackfill()}
            >
              {backfilling ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 aria-hidden="true" />
              )}
              {backfilling ? 'Filling…' : 'Fill added columns'}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Import the bundled directory?"
        description={`This adds up to ${bundled} listings to public.listings. Anything already imported is skipped, and nothing existing is overwritten.`}
        confirmLabel="Import"
        onConfirm={run}
      />
    </Card>
  )
}

function Report({ report }: { report: ImportReport }) {
  const clean = report.failed.length === 0
  return (
    <div className="mt-4 rounded-control border border-line bg-canvas p-4">
      <p
        className={cn(
          'flex items-center gap-2 text-body-sm font-bold',
          clean ? 'text-success-ink' : 'text-danger-ink',
        )}
      >
        {clean ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-4" aria-hidden="true" />
        )}
        Import finished
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-meta sm:grid-cols-4">
        <Stat label="Found" value={report.found} />
        <Stat label="Already there" value={report.skipped} />
        <Stat label="Imported" value={report.imported} />
        <Stat label="Failed" value={report.failed.length} tone={report.failed.length ? 'bad' : undefined} />
      </dl>

      {Object.keys(report.bySection).length > 0 && (
        <p className="mt-3 text-meta text-ink-subtle">
          {Object.entries(report.bySection)
            .map(([section, n]) => `${sectionLabel(section)}: ${n}`)
            .join(' · ')}
        </p>
      )}

      {report.failed.length > 0 && (
        <ul className="mt-3 space-y-1">
          {report.failed.slice(0, 8).map((f) => (
            <li key={f.key} className="text-meta text-danger-ink">
              <span className="font-semibold">{f.key}</span> — {f.reason}
            </li>
          ))}
          {report.failed.length > 8 && (
            <li className="text-meta text-ink-subtle">
              …and {report.failed.length - 8} more.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function BackfillSummary({ report }: { report: BackfillReport }) {
  const clean = report.failed.length === 0
  return (
    <div className="mt-4 rounded-control border border-line bg-canvas p-4">
      <p
        className={cn(
          'flex items-center gap-2 text-body-sm font-bold',
          clean ? 'text-success-ink' : 'text-danger-ink',
        )}
      >
        {clean ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-4" aria-hidden="true" />
        )}
        Added columns filled
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-meta sm:grid-cols-5">
        <Stat label="Matched" value={report.matched} />
        <Stat label="Rows filled" value={report.updated} />
        <Stat label="Columns written" value={report.fieldsFilled} />
        <Stat label="Already complete" value={report.alreadyComplete} />
        <Stat
          label="Failed"
          value={report.failed.length}
          tone={report.failed.length ? 'bad' : undefined}
        />
      </dl>

      <p className="mt-3 text-meta text-ink-subtle">
        Only blank columns were written. Anything already set — including values you edited here —
        was left as it was, so this is safe to run again.
        {report.unmatched > 0 && (
          <>
            {' '}
            {report.unmatched} {report.unmatched === 1 ? 'listing' : 'listings'} had no bundled
            counterpart and {report.unmatched === 1 ? 'was' : 'were'} skipped entirely.
          </>
        )}
      </p>

      {report.failed.length > 0 && (
        <ul className="mt-3 space-y-1">
          {report.failed.slice(0, 8).map((f) => (
            <li key={f.key} className="text-meta text-danger-ink">
              <span className="font-semibold">{f.key}</span> — {f.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'bad' }) {
  return (
    <div>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className={cn('tnum text-body font-bold', tone === 'bad' ? 'text-danger-ink' : 'text-ink')}>
        {value}
      </dd>
    </div>
  )
}
