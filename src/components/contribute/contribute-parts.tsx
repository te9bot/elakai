import { Link, NavLink } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Plus,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SubmissionStatus } from '@/lib/submissions'
import { useI18n } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The contributor dashboard's shared pieces.
 *
 * §58: a contributor should be able to answer five questions without reading
 * anything — what have I submitted, what is pending, what was approved, how
 * many points do I have, how do I submit something new. Everything in this file
 * exists to answer one of those, and nothing in it exists for any other reason.
 *
 * §54, on minimalism, is the constraint that shaped it. The status of a
 * submission is a word with a coloured dot, not a card. A count is a number
 * with a label under it, not a tile with an icon, a border, a gradient and a
 * trend arrow. The dashboard is mostly whitespace and that is the intent.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export const CONTRIBUTE_NAV = [
  { to: '/contribute', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/contribute/submissions', label: 'My contributions', icon: FileText },
  { to: '/contribute/submit', label: 'Submit information', icon: Plus },
  { to: '/contribute/points', label: 'Points', icon: Sparkles },
  { to: '/contribute/profile', label: 'Profile', icon: User },
] as const

/**
 * A horizontal strip rather than a sidebar.
 *
 * The contributor dashboard sits inside the public shell — same header, same
 * footer, same map behind it — because §12 asks for it to be part of ELAKAI
 * rather than a second application bolted to the side of one. A left sidebar
 * would fight the site's own navigation for the same screen edge and would read
 * as a different product. Five items scroll comfortably on a phone.
 */
export function ContributeNav() {
  return (
    <nav
      aria-label="Contributor sections"
      className="-mx-4 overflow-x-auto px-4 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max items-center gap-1 border-b border-line">
        {CONTRIBUTE_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-2 rounded-t-control px-3.5 py-3 text-body-sm font-semibold',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive ? 'text-primary' : 'text-ink-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  SubmissionStatus,
  { key: TranslationKey; icon: typeof Clock; className: string; dot: string }
> = {
  pending: {
    key: 'contribute.status.pending',
    icon: Clock,
    className: 'bg-warning-soft text-warning-ink',
    dot: 'bg-warning',
  },
  approved: {
    key: 'contribute.status.approved',
    icon: CheckCircle2,
    className: 'bg-success-soft text-success-ink',
    dot: 'bg-success',
  },
  rejected: {
    key: 'contribute.status.rejected',
    icon: XCircle,
    className: 'bg-danger-soft text-danger-ink',
    dot: 'bg-danger',
  },
}

/**
 * "Not accepted" rather than "Rejected", in the contributor's own view.
 *
 * The admin screens say Rejected, because that is the action being taken and an
 * administrator needs the unambiguous word. This is the other end of it: the
 * person reading it volunteered their time, the outcome is the same either way,
 * and the reason underneath is what they actually need to act on. Softening the
 * label costs nothing and blunting the reason would cost everything, so the
 * reason is never softened.
 */
export function StatusPill({
  status,
  className,
}: {
  status: SubmissionStatus
  className?: string
}) {
  const { t } = useI18n()
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-bold uppercase tracking-wide',
        meta.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {t(meta.key)}
    </span>
  )
}


/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/**
 * One figure and its label.
 *
 * No icon, no border, no tinted background. Four of these in a row read as one
 * summary; four bordered cards read as four things competing, which is what
 * §54 asks to stop doing. The only colour is on the points figure, because it
 * is the one number that is a reward rather than a count.
 */
export function Stat({
  label,
  value,
  loading,
  accent = false,
}: {
  label: string
  value: number | undefined
  loading?: boolean
  accent?: boolean
}) {
  // Bangla digits in Bangla, the same as every other number on the site. The
  // dashboard was the one place still printing Latin numerals to a reader who
  // had seen ৭৪ everywhere else.
  const { n } = useI18n()
  return (
    <div className="min-w-0">
      {loading ? (
        <Skeleton className="h-9 w-14" />
      ) : (
        <p
          className={cn(
            'tnum text-display font-extrabold leading-none',
            accent ? 'text-primary' : 'text-ink',
          )}
        >
          {n(value ?? 0)}
        </p>
      )}
      <p className="mt-2 text-meta font-semibold text-ink-subtle">{label}</p>
    </div>
  )
}

/** The four counts plus the balance, as one grouped surface. */
export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('grid grid-cols-2 gap-6 p-5 sm:grid-cols-3 lg:grid-cols-5', className)}>
      {children}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Empty and error states                                              */
/* ------------------------------------------------------------------ */

/**
 * An empty state that offers the next action.
 *
 * "You have not submitted anything yet" is a fact. "You have not submitted
 * anything yet — add the first one" is a screen that knows what it is for.
 */
export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
}: {
  title: string
  body: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-12 text-center">
      <p className="text-heading">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-body-sm text-pretty text-ink-muted">{body}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-5 inline-flex items-center gap-2 rounded-control bg-primary px-5 py-3 text-body-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function LoadFailure({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5 text-body-sm text-danger-ink"
    >
      {message}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/**
 * A date a person can read, with the full timestamp on hover.
 *
 * `en-GB` rather than the browser's locale: the site is bilingual bn/en and
 * this is the English side, where day-month order is what Bangladesh uses. An
 * unparseable value renders as nothing rather than as "Invalid Date".
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
