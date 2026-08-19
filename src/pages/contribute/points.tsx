import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import {
  EmptyState,
  LoadFailure,
  formatDate,
} from '@/components/contribute/contribute-parts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/lib/auth'
import { listMyPoints, myContributionStats, submissionError } from '@/lib/submissions'
import { rpPoints } from '@/lib/format'

/* ==========================================================================
 * Points.
 *
 * §40, and the last line of it is the brief for the whole screen: *do not
 * over-gamify*. So there is no progress bar to the next tier, no badge shelf,
 * no leaderboard, no streak. There is a number and the list of things that
 * produced it.
 *
 * That list is not decoration either — it is the ledger from
 * `points_transactions`, read straight through. The balance shown at the top is
 * the cached total on the profile, and the entries beneath it are what the
 * trigger added it up from, so "why do I have 250" always has an answer and the
 * two can be compared by eye.
 * ========================================================================== */

/** Human wording for the machine reasons stored in the ledger. */
const REASON_LABEL: Record<string, string> = {
  submission_approved: 'Information approved',
}

function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, ' ')
}

export default function ContributePointsPage() {
  const { schemaReady } = useAccount()

  const stats = useQuery({
    queryKey: ['contribute', 'stats'],
    queryFn: myContributionStats,
    enabled: schemaReady,
  })

  const ledger = useQuery({
    queryKey: ['contribute', 'points'],
    queryFn: listMyPoints,
    enabled: schemaReady,
  })

  if (!schemaReady) {
    return <LoadFailure message="Contributions are not switched on for this site yet." />
  }

  const entries = ledger.data ?? []

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <p className="text-meta font-semibold uppercase tracking-wide text-ink-subtle">
            Total RP Points
          </p>
          {stats.isPending ? (
            <Skeleton className="mt-2 h-12 w-24" />
          ) : (
            <p className="tnum mt-1 text-display font-extrabold leading-none text-primary">
              {stats.data?.points ?? 0}
            </p>
          )}
        </div>
        <p className="max-w-[34ch] text-meta text-pretty text-ink-subtle">
          Every submission an administrator approves earns 50 RP Points. Pending and
          refused submissions earn none.
        </p>
      </Card>

      {(stats.isError || ledger.isError) && (
        <LoadFailure message={submissionError(stats.error ?? ledger.error)} />
      )}

      <section>
        <h2 className="text-heading">History</h2>

        <div className="mt-4">
          {ledger.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-card" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="No RP Points yet"
              body="RP Points arrive when an administrator approves something you submitted. Nothing is deducted for a submission that is not accepted."
              actionLabel="Submit information"
              actionTo="/contribute/submit"
            />
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line bg-surface">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3.5"
                >
                  <span
                    className="tnum shrink-0 text-body font-extrabold text-primary"
                    // The sign is meaning, not decoration: a future correcting
                    // entry would be negative and has to read as one.
                    aria-label={`${entry.points > 0 ? 'plus' : 'minus'} ${rpPoints(Math.abs(entry.points))}`}
                  >
                    {entry.points > 0 ? '+' : ''}
                    {entry.points}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-ink">
                      {entry.submissionTitle ?? reasonLabel(entry.reason)}
                    </p>
                    <p className="mt-0.5 truncate text-meta text-ink-subtle">
                      {[reasonLabel(entry.reason), formatDate(entry.createdAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  {entry.submissionId && (
                    <Link
                      to={`/contribute/submissions/${entry.submissionId}`}
                      className="shrink-0 rounded-control px-2 py-1 text-meta font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      View
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
