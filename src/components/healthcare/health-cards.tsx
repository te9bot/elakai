import { Link } from 'react-router-dom'
import { ArrowRight, GraduationCap, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { CallButton } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { OpenStatus } from '@/components/status'
import { AREA_MAP } from '@/data/categories'
import type { Doctor, HealthFacility, HealthRecord } from '@/data/healthcare-types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { categoryOf, SourceBadge } from './health-parts'

/* ==========================================================================
 * Result cards.
 *
 * These are summaries, not profiles. Everything a card shows has to earn its
 * line: what it is, roughly where, whether it is open, and one number to ring.
 * The full service list, doctors, tests and schedule live on the profile —
 * putting them here is what turned the section into a wall of cards.
 * ========================================================================== */

function CardShell({
  to,
  icon,
  title,
  subtitle,
  children,
  action,
  className,
}: {
  to: string
  icon: React.ReactNode
  title: string
  subtitle: React.ReactNode
  children?: React.ReactNode
  action: React.ReactNode
  className?: string
}) {
  const { t } = useI18n()

  return (
    <Card className={cn('list-perf overflow-hidden p-0', className)}>
      <Link
        to={to}
        className="group flex gap-3.5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-ink transition-colors group-hover:bg-primary group-hover:text-white">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-body font-bold leading-snug text-balance transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-0.5 text-meta font-medium text-ink-subtle">{subtitle}</p>
          {children}
        </div>

        <ArrowRight
          className="mt-1 hidden size-4 shrink-0 self-center text-ink-subtle transition-transform group-hover:translate-x-0.5 sm:block"
          aria-hidden="true"
        />
      </Link>

      <div className="flex gap-2 border-t border-line p-3">
        {action}
        <Button asChild variant="secondary" size="md" className="flex-1">
          <Link to={to}>
            {t('card.details')}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Facility                                                            */
/* ------------------------------------------------------------------ */

function FacilityCard({ facility }: { facility: HealthFacility }) {
  const { L } = useI18n()
  const cat = categoryOf(facility)
  const area = AREA_MAP[facility.area]
  const where = facility.address ? L(facility.address) : L(area.name)

  return (
    <CardShell
      to={`/healthcare/${facility.slug}`}
      icon={<Icon name={cat.icon} className="size-6" />}
      title={L(facility.name)}
      subtitle={L(cat.name)}
      action={
        facility.contact.phone ? (
          <CallButton
            phone={facility.contact.phone}
            label={L(facility.name)}
            size="md"
            className="flex-1"
          />
        ) : (
          <span className="flex-1" />
        )
      }
    >
      <p className="mt-1.5 flex items-start gap-1.5 text-meta text-ink-muted">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
        <span className="line-clamp-1">{where}</span>
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {facility.hours && <OpenStatus hours={facility.hours} />}
        {/* Ratings appear only when a source actually published one. */}
        {facility.rating !== undefined && (
          <Rating value={facility.rating} count={facility.reviewCount} />
        )}
        <SourceBadge source={facility.source} />
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ */
/* Doctor                                                              */
/* ------------------------------------------------------------------ */

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { L } = useI18n()
  const chamber = doctor.chambers?.[0]
  const phone = chamber?.phone ?? doctor.contact?.appointmentPhone ?? doctor.contact?.phone

  return (
    <CardShell
      to={`/healthcare/${doctor.slug}`}
      icon={<Icon name="stethoscope" className="size-6" />}
      title={L(doctor.name)}
      subtitle={L(doctor.specialty)}
      action={
        phone ? (
          <CallButton phone={phone} label={L(doctor.name)} size="md" className="flex-1" />
        ) : (
          <span className="flex-1" />
        )
      }
    >
      {doctor.qualifications.length > 0 && (
        <p className="mt-1.5 flex items-start gap-1.5 text-meta text-ink-muted">
          <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          <span className="line-clamp-1">{doctor.qualifications.join(', ')}</span>
        </p>
      )}

      {chamber && (
        <p className="mt-1 flex items-start gap-1.5 text-meta text-ink-muted">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          <span className="line-clamp-1">{L(chamber.place)}</span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SourceBadge source={doctor.source} />
      </div>
    </CardShell>
  )
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

export function HealthResultCard({ record }: { record: HealthRecord }) {
  return record.kind === 'doctor' ? (
    <DoctorCard doctor={record} />
  ) : (
    <FacilityCard facility={record} />
  )
}

/**
 * The doctor rows inside a facility profile — one line each, and each one is a
 * link into that doctor's own profile.
 */
export function DoctorRow({ doctor }: { doctor: Doctor }) {
  const { L } = useI18n()

  return (
    <Link
      to={`/healthcare/${doctor.slug}`}
      className="group flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
        <Icon name="stethoscope" className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm font-bold transition-colors group-hover:text-primary">
            {L(doctor.name)}
          </span>
          <SourceBadge source={doctor.source} />
        </span>
        <span className="mt-0.5 block text-meta text-ink-muted">
          {L(doctor.specialty)}
          {doctor.qualifications.length > 0 && (
            <span className="text-ink-subtle"> · {doctor.qualifications.join(', ')}</span>
          )}
        </span>
      </span>

      <ArrowRight
        className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}
