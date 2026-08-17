import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Users } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminListContributors, submissionError } from '@/lib/submissions'

/**
 * Everyone who holds an ELAKAI account.
 *
 * Read-only, and that is the design rather than a gap. There is no promote
 * button, no points adjustment and no delete: `authenticated` has no UPDATE
 * grant on `profiles.role` or `profiles.points`, so a control for either would
 * be a control the database refuses. Promoting an administrator is a deliberate
 * statement in the SQL editor — see section 1 of migration 0008 — because an
 * app that can promote an account is an app whose compromise is total.
 */
export default function AdminContributorsPage() {
  const query = useQuery({
    queryKey: ['admin', 'contributors'],
    queryFn: adminListContributors,
  })

  const rows = query.data ?? []

  return (
    <>
      <div>
        <h1 className="text-title">Contributors</h1>
        <p className="mt-1 text-body-sm text-ink-muted">
          Everyone with an ELAKAI account, ordered by points earned.
        </p>
      </div>

      {query.isError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-danger-ink">
              Could not load contributors.
            </p>
            <p className="mt-1 text-meta text-danger-ink/80">
              {submissionError(query.error, 'Unknown error')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {query.isPending ? (
          <Skeleton className="h-72 w-full rounded-card" />
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-line px-6 py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-ink-subtle">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-heading">No accounts yet</p>
            <p className="mx-auto mt-2 max-w-[44ch] text-body-sm text-pretty text-ink-muted">
              Accounts appear here as people sign up to contribute.
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            {/* The table scrolls inside its own container rather than making
                the page scroll sideways on a phone. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th align="right">Points</Th>
                    <Th>Joined</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2">
                      <Td className="font-semibold">{c.fullName ?? '—'}</Td>
                      <Td className="break-all text-ink-muted">{c.email}</Td>
                      <Td align="right" className="tnum font-bold text-primary">
                        {c.points}
                      </Td>
                      <Td className="text-ink-muted">
                        {c.joinedAt
                          ? new Date(c.joinedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-micro font-bold uppercase tracking-wide text-ink-subtle ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = '',
  align = 'left',
}: {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`px-4 py-3 text-body-sm ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      {children}
    </td>
  )
}
