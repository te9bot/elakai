import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, Plus } from 'lucide-react'

import {
  EmptyState,
  LoadFailure,
  Stat,
  StatRow,
  StatusPill,
  formatDate,
} from '@/components/contribute/contribute-parts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/lib/auth'
import {
  listMySubmissions,
  myContributionStats,
  submissionError,
} from '@/lib/submissions'
import { categoryLabel } from '@/lib/submission-fields'
import { sectionLabel } from '@/lib/listings'

/**
 * Overview.
 *
 * Five numbers and the last few things you sent. Nothing else — there is no
 * engagement metric this system actually measures, and a chart of numbers
 * nobody counted is worse than no chart. (The admin dashboard already made this
 * argument; it holds here too.)
 */
export default function ContributeOverviewPage() {
  const { schemaReady } = useAccount()

  const stats = useQuery({
    queryKey: ['contribute', 'stats'],
    queryFn: myContributionStats,
    enabled: schemaReady,
  })

  const recent = useQuery({
    queryKey: ['contribute', 'submissions'],
    queryFn: listMySubmissions,
    enabled: schemaReady,
  })

  if (!schemaReady) return <NotOpenYet />

  const latest = (recent.data ?? []).slice(0, 5)

  return (
    <div className="space-y-8">
      {stats.isError && <LoadFailure message={submissionError(stats.error)} />}

      <StatRow>
        <Stat label="Total" value={stats.data?.total} loading={stats.isPending} />
        <Stat label="Approved" value={stats.data?.approved} loading={stats.isPending} />
        <Stat label="Pending" value={stats.data?.pending} loading={stats.isPending} />
        <Stat label="Not accepted" value={stats.data?.rejected} loading={stats.isPending} />
        <Stat label="Points" value={stats.data?.points} loading={stats.isPending} accent />
      </StatRow>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-heading">Know somewhere that is missing?</p>
          <p className="mt-1 text-body-sm text-ink-muted">
            Add it and an administrator will check it. Approved information earns
            you 50 points.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link to="/contribute/submit">
            <Plus aria-hidden="true" />
            Submit information
          </Link>
        </Button>
      </Card>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-heading">Recent activity</h2>
          {latest.length > 0 && (
            <Link
              to="/contribute/submissions"
              className="group inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5 text-body-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              See all
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>

        {recent.isError && <LoadFailure message={submissionError(recent.error)} />}

        {recent.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-card" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            body="When you submit information it appears here with its status, so you can see what is waiting and what went live."
            actionLabel="Submit your first"
            actionTo="/contribute/submit"
          />
        ) : (
          <ul className="space-y-2">
            {latest.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/contribute/submissions/${s.id}`}
                  className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold">{s.title}</p>
                    <p className="mt-0.5 truncate text-meta text-ink-subtle">
                      {[
                        s.category ? categoryLabel(s.category) : sectionLabel(s.section),
                        formatDate(s.submittedAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <StatusPill status={s.status} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/**
 * What a contributor sees before migration 0008 has been applied.
 *
 * Not an error, and not a blank page. They have a real account — signing in
 * worked — and the thing it is for is not switched on yet. Saying exactly that
 * is better than a spinner that never resolves or a stack of empty zeroes that
 * implies they have contributed nothing.
 */
function NotOpenYet() {
  return (
    <Card className="flex items-start gap-3 p-5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
        <Info className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-heading">Contributions are not open yet</p>
        <p className="mt-1.5 max-w-prose text-body-sm text-pretty text-ink-muted">
          Your account works, but the contribution system has not been switched
          on for this site. Nothing is wrong with your account and nothing is
          lost — this page will fill in on its own once it is enabled.
        </p>
        <Button variant="secondary" size="md" className="mt-4" asChild>
          <Link to="/">Back to ELAKAI</Link>
        </Button>
      </div>
    </Card>
  )
}
