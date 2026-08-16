import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  Clock,
  Facebook,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Share2,
  Siren,
  Stethoscope,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { Separator } from '@/components/ui/separator'
import { CallButton, PhoneLink } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { ListingPhoto } from '@/components/listing-photo'
import { MapPanel } from '@/components/business/map-panel'
import { EmptyState, ErrorState } from '@/components/feedback'
import { BrandLoader } from '@/components/brand-loader'
import { OpenStatus } from '@/components/status'
import { DoctorRow, HealthResultCard } from '@/components/healthcare/health-cards'
import {
  categoryOf,
  ProfileSection,
  SECTION_ICONS,
  seedOf,
  SourceBadge,
  SourceNote,
  TagList,
} from '@/components/healthcare/health-parts'
import { AREA_MAP } from '@/data/categories'
import type { Doctor, HealthContact, HealthFacility, HealthRecord } from '@/data/healthcare-types'
import { useHealthcare } from '@/hooks/use-queries'
import { doctorsAt, getFacility, getHealthRecord, relatedTo } from '@/lib/healthcare-search'
import { DAY_NAMES, formatTime } from '@/lib/format'
import { DirectionsButton } from '@/components/directions-button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Healthcare profile.
 *
 * This is where the full record finally appears — services, departments,
 * doctors, tests, schedule, contact, map and provenance. Result cards stay
 * summaries precisely so this page can be complete.
 *
 * Every section is conditional. A record we only have a name and a category for
 * renders a short, honest page rather than a scaffold of empty headings.
 * ========================================================================== */

export default function HealthProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useI18n()
  const healthcare = useHealthcare()
  const record = getHealthRecord(slug)

  // The lookup is synchronous against the loaded corpus, so it must not run
  // before the corpus exists — an unloaded directory would answer "no such
  // record" for every valid slug and show the not-found page on a real profile.
  if (healthcare.isPending) return <BrandLoader className="min-h-[60vh]" />

  if (healthcare.isError) {
    return (
      <div className="container py-16">
        <ErrorState onRetry={() => healthcare.refetch()} />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="container py-16">
        <EmptyState
          titleAs="h1"
          title={t('health.notFound')}
          description={t('health.notFoundSub')}
          action={
            <Button asChild size="lg">
              <Link to="/healthcare">{t('health.backToDirectory')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return record.kind === 'doctor' ? (
    <DoctorProfile doctor={record} />
  ) : (
    <FacilityProfile facility={record} />
  )
}

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function ProfileHero({ record }: { record: HealthRecord }) {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const cat = categoryOf(record)

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: L(record.name), url })
      else await navigator.clipboard.writeText(url)
    } catch {
      // User dismissed the share sheet — nothing to recover from.
    }
  }

  return (
    <div className="relative">
      <ListingPhoto
        src={record.imageUrl}
        alt={L(record.name)}
        seed={seedOf(record.id)}
        icon={cat.icon}
        rounded={false}
        priority
        className="h-44 w-full sm:h-60 lg:h-64"
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label={t('a11y.back')}
        className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="size-5" />
      </button>

      <button
        type="button"
        onClick={share}
        aria-label={t('biz.share')}
        className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Share2 className="size-5" />
      </button>
    </div>
  )
}

/** যোগাযোগ — one block, used by both profile kinds. */
function ContactCard({ contact, className }: { contact: HealthContact; className?: string }) {
  const { t } = useI18n()

  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = []

  if (contact.phone) {
    rows.push({
      icon: <Phone className="size-4" aria-hidden="true" />,
      label: t('biz.phone'),
      // A link when the number is real, plain text when it is a placeholder —
      // decided by lib/phone.ts from the number itself, not by a build flag.
      value: <PhoneLink phone={contact.phone} />,
    })
  }
  if (contact.appointmentPhone) {
    rows.push({
      icon: <Phone className="size-4" aria-hidden="true" />,
      label: t('health.appointmentPhone'),
      value: <PhoneLink phone={contact.appointmentPhone} />,
    })
  }
  if (contact.emergencyPhone) {
    rows.push({
      icon: <Siren className="size-4" aria-hidden="true" />,
      label: t('health.emergencyPhone'),
      value: <PhoneLink phone={contact.emergencyPhone} />,
    })
  }
  if (contact.email) {
    rows.push({
      icon: <Mail className="size-4" aria-hidden="true" />,
      label: t('health.email'),
      value: (
        <a
          href={`mailto:${contact.email}`}
          className="break-all font-semibold text-primary hover:underline"
        >
          {contact.email}
        </a>
      ),
    })
  }
  if (contact.website) {
    rows.push({
      icon: <Globe className="size-4" aria-hidden="true" />,
      label: t('biz.website'),
      value: (
        <a
          href={contact.website}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-semibold text-primary hover:underline"
        >
          {contact.website.replace(/^https?:\/\//, '')}
        </a>
      ),
    })
  }
  if (contact.facebook) {
    rows.push({
      icon: <Facebook className="size-4" aria-hidden="true" />,
      label: t('health.facebook'),
      value: (
        <a
          href={contact.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-semibold text-primary hover:underline"
        >
          {contact.facebook.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      ),
    })
  }

  if (rows.length === 0) return null

  return (
    <Card className={cn('p-5', className)}>
      <h2 className="mb-4 text-heading">{t('biz.contact')}</h2>
      <dl className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-ink-subtle">{row.icon}</span>
            <div className="min-w-0">
              <dt className="text-meta font-semibold text-ink-subtle">{row.label}</dt>
              <dd className="text-body-sm">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/** Website / Facebook, as buttons next to Call and Directions. */
function LinkButtons({ contact }: { contact: HealthContact }) {
  const { t } = useI18n()
  if (!contact.website && !contact.facebook) return null

  return (
    <>
      {contact.website && (
        <Button asChild variant="secondary" size="lg">
          <a href={contact.website} target="_blank" rel="noopener noreferrer">
            <Globe />
            {t('biz.website')}
          </a>
        </Button>
      )}
      {contact.facebook && (
        <Button asChild variant="secondary" size="lg">
          <a href={contact.facebook} target="_blank" rel="noopener noreferrer">
            <Facebook />
            {t('health.facebook')}
          </a>
        </Button>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Facility                                                            */
/* ------------------------------------------------------------------ */

function FacilityProfile({ facility }: { facility: HealthFacility }) {
  const { t, L, n, locale } = useI18n()
  const cat = categoryOf(facility)
  const area = AREA_MAP[facility.area]
  const doctors = doctorsAt(facility)
  const related = relatedTo(facility)
  const today = new Date().getDay()

  // The map falls back to the upazila centre, and says so, rather than
  // pretending to a precision the record does not have.
  const coords = facility.coords ?? area.coords
  const coordsApprox = !facility.coords

  const weeklyHours = facility.hours && facility.hours !== 'always' ? facility.hours : null

  return (
    <div className="pb-28 lg:pb-8">
      <ProfileHero record={facility} />

      <div className="container">
        <Card elevation="lifted" className="relative -mt-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" size="sm">
              <span aria-hidden="true">{cat.emoji}</span>
              {L(cat.name)}
            </Badge>
            {facility.emergency24 && (
              <Badge variant="danger" size="sm">
                <Siren aria-hidden="true" />
                {t('health.emergency24')}
              </Badge>
            )}
            <SourceBadge source={facility.source} />
          </div>

          <h1 className="mt-3 text-title text-balance">{L(facility.name)}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {facility.rating !== undefined && (
              <Rating value={facility.rating} count={facility.reviewCount} showStars size="md" />
            )}
            {facility.hours && <OpenStatus hours={facility.hours} showNext />}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="text-pretty">
              {facility.address ? L(facility.address) : L(area.name)}
              {!facility.address && (
                <span className="text-ink-subtle"> · {t('health.addressUnknown')}</span>
              )}
            </span>
          </p>

          <div className="mt-5 hidden flex-wrap gap-3 lg:flex">
            {facility.contact.phone && (
              <CallButton
                phone={facility.contact.phone}
                label={L(facility.name)}
                size="lg"
                className="min-w-40 flex-1"
              />
            )}
            <DirectionsButton
              coords={coords}
              coordsApprox={coordsApprox}
              address={facility.address ? L(facility.address) : null}
              label={L(facility.name)}
              size="lg"
              className="min-w-40 flex-1"
            />
            <LinkButtons contact={facility.contact} />
          </div>
        </Card>

        <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
          {/* ---------------- পরিচিতি ---------------- */}
          <ProfileSection title={t('biz.about')}>
            <p className="text-body leading-relaxed text-pretty text-ink-muted">
              {L(facility.description)}
            </p>
          </ProfileSection>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:-mx-3 lg:row-span-2 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:px-3">
            <ContactCard contact={facility.contact} />

            <ProfileSection title={t('biz.location')}>
              <MapPanel coords={coords} label={L(facility.name)} />
              {coordsApprox && (
                <p className="mt-2 text-meta text-ink-subtle">{t('health.approxLocation')}</p>
              )}
            </ProfileSection>
          </aside>

          <div className="space-y-6">
            {/* ---------------- প্রধান সেবাসমূহ ---------------- */}
            {facility.services && facility.services.length > 0 && (
              <ProfileSection title={t('health.services')} icon={SECTION_ICONS.services}>
                <TagList items={facility.services} tone="service" />
              </ProfileSection>
            )}

            {/* ---------------- বিভাগ ---------------- */}
            {facility.departments && facility.departments.length > 0 && (
              <ProfileSection
                title={t('health.departments')}
                icon={<Building2 className="size-[18px]" aria-hidden="true" />}
              >
                <TagList items={facility.departments} tone="department" />
              </ProfileSection>
            )}

            {/* ---------------- ডাক্তার ---------------- */}
            {doctors.length > 0 && (
              <ProfileSection
                title={t('health.doctors')}
                icon={<Stethoscope className="size-[18px]" aria-hidden="true" />}
              >
                <ul className="space-y-2">
                  {doctors.map((d) => (
                    <li key={d.id}>
                      <DoctorRow doctor={d} />
                    </li>
                  ))}
                </ul>
              </ProfileSection>
            )}

            {/* ---------------- পরীক্ষা-নিরীক্ষা ---------------- */}
            {facility.tests && facility.tests.length > 0 && (
              <ProfileSection title={t('health.tests')} icon={SECTION_ICONS.tests}>
                <TagList items={facility.tests} tone="test" />
              </ProfileSection>
            )}

            {/* ---------------- সময়সূচি ---------------- */}
            <ProfileSection title={t('health.schedule')}>
              <Card className="overflow-hidden p-0">
                {!facility.hours ? (
                  <p className="p-5 text-body-sm text-ink-muted">{t('health.hoursUnknown')}</p>
                ) : facility.hours === 'always' ? (
                  <p className="flex items-center gap-2.5 p-5 text-body font-semibold text-success-ink">
                    <Clock className="size-5" aria-hidden="true" />
                    {t('card.open24')}
                  </p>
                ) : (
                  <ul>
                    {DAY_NAMES[locale].map((day, i) => {
                      const windows = weeklyHours?.[i] ?? []
                      const isToday = i === today
                      return (
                        <li
                          key={day}
                          className={cn(
                            'flex items-center justify-between gap-4 px-5 py-3',
                            i > 0 && 'border-t border-line',
                            isToday && 'bg-primary-soft',
                          )}
                        >
                          <span
                            className={cn(
                              'text-body-sm',
                              isToday ? 'font-bold text-primary-ink' : 'font-medium text-ink-muted',
                            )}
                          >
                            {day}
                            {isToday && (
                              <span className="ml-2 text-meta font-semibold">· {t('biz.today')}</span>
                            )}
                          </span>
                          <span
                            className={cn(
                              'tnum text-right text-body-sm',
                              isToday ? 'font-bold text-primary-ink' : 'text-ink-muted',
                            )}
                          >
                            {windows.length === 0 ? (
                              <span className="text-ink-subtle">{t('card.closed')}</span>
                            ) : (
                              windows
                                .map(
                                  (w) =>
                                    `${n(formatTime(w.open, locale))} – ${n(formatTime(w.close, locale))}`,
                                )
                                .join(', ')
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {facility.emergency24 && (
                  <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-body-sm font-semibold text-danger-ink">
                    <Siren className="size-4" aria-hidden="true" />
                    {t('health.emergency24Note')}
                  </p>
                )}

                {facility.hours && facility.source.verifiedAt === null && (
                  <p className="border-t border-line px-5 py-3 text-meta text-ink-subtle">
                    {t('health.hoursUnverified')}
                  </p>
                )}
              </Card>
            </ProfileSection>

            {/* A রিভিউ section stood here and is deliberately gone — see the
                same removal in pages/business.tsx. It rendered either a rating
                nobody published or a "no rating source" placeholder, and an
                empty section is worse than an absent one on a page someone is
                reading to choose a hospital. */}

            {/* ---------------- তথ্যের উৎস ---------------- */}
            <SourceNote source={facility.source} />
          </div>
        </div>

        {/* ---------------- Related ---------------- */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-title">{L(cat.name)}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {related.map((r) => (
                <HealthResultCard key={r.id} record={r} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ---------------- Sticky mobile action bar ---------------- */}
      <div className="glass fixed inset-x-0 bottom-14 z-30 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-bar lg:hidden">
        <div className="flex gap-2">
          {facility.contact.phone && (
            <CallButton
              phone={facility.contact.phone}
              label={L(facility.name)}
              size="lg"
              className="flex-[2]"
            />
          )}
          <DirectionsButton
            coords={coords}
            coordsApprox={coordsApprox}
            address={facility.address ? L(facility.address) : null}
            label={L(facility.name)}
            size="lg"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Doctor                                                              */
/* ------------------------------------------------------------------ */

function DoctorProfile({ doctor }: { doctor: Doctor }) {
  const { t, L } = useI18n()
  const cat = categoryOf(doctor)
  const facilities = (doctor.facilityIds ?? []).flatMap((id) => {
    const f = getFacility(id)
    return f ? [f] : []
  })

  const primaryPhone =
    doctor.chambers?.[0]?.phone ?? doctor.contact?.appointmentPhone ?? doctor.contact?.phone

  return (
    <div className="pb-28 lg:pb-8">
      <ProfileHero record={doctor} />

      <div className="container">
        <Card elevation="lifted" className="relative -mt-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" size="sm">
              <span aria-hidden="true">{cat.emoji}</span>
              {L(cat.name)}
            </Badge>
            <Badge variant="primary" size="sm">
              {L(doctor.specialty)}
            </Badge>
            <SourceBadge source={doctor.source} />
          </div>

          <h1 className="mt-3 text-title text-balance">{L(doctor.name)}</h1>

          {doctor.designation && (
            <p className="mt-1 text-body-sm font-semibold text-ink-muted">
              {L(doctor.designation)}
            </p>
          )}

          {doctor.qualifications.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-body-sm text-ink-muted">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              <span className="text-pretty">{doctor.qualifications.join(', ')}</span>
            </p>
          )}

          {primaryPhone && (
            <div className="mt-5 hidden gap-3 lg:flex">
              <CallButton
                phone={primaryPhone}
                label={L(doctor.name)}
                size="lg"
                className="min-w-48"
              >
                {t('health.bookAppointment')}
              </CallButton>
              <LinkButtons contact={doctor.contact ?? {}} />
            </div>
          )}
        </Card>

        <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
          {/* ---------------- চেম্বার ---------------- */}
          <ProfileSection title={t('health.chambers')}>
            {doctor.chambers && doctor.chambers.length > 0 ? (
              <ul className="space-y-3">
                {doctor.chambers.map((chamber, i) => {
                  const facility = chamber.facilityId ? getFacility(chamber.facilityId) : null
                  return (
                    <li key={i}>
                      <Card className="p-5">
                        <p className="flex items-start gap-2 text-body font-bold text-balance">
                          <MapPin className="mt-1 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                          {facility ? (
                            <Link
                              to={`/healthcare/${facility.slug}`}
                              className="hover:text-primary hover:underline"
                            >
                              {L(chamber.place)}
                            </Link>
                          ) : (
                            L(chamber.place)
                          )}
                        </p>

                        {chamber.hours && (
                          <p className="mt-2 flex items-center gap-2 text-body-sm text-ink-muted">
                            <Clock className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                            {L(chamber.hours)}
                          </p>
                        )}

                        <p className="mt-1 flex items-center gap-2 text-meta text-ink-subtle">
                          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                          {L(AREA_MAP[chamber.area].name)}
                        </p>

                        {chamber.phone && (
                          <div className="mt-4">
                            <CallButton phone={chamber.phone} label={L(doctor.name)} size="md">
                              {t('health.bookAppointment')}
                            </CallButton>
                          </div>
                        )}
                      </Card>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Card className="p-5">
                <p className="text-body-sm text-ink-muted">{t('health.noChamber')}</p>
              </Card>
            )}
          </ProfileSection>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:row-span-2 lg:self-start">
            <Card className="p-5">
              <h2 className="mb-3 text-heading">{t('health.specialty')}</h2>
              <TagList items={[doctor.specialty]} tone="department" />

              {doctor.qualifications.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="mb-2 text-meta font-bold uppercase text-ink-subtle">
                    {t('health.qualifications')}
                  </h3>
                  <ul className="space-y-1 text-body-sm text-ink-muted">
                    {doctor.qualifications.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <ContactCard contact={doctor.contact ?? {}} />
          </aside>

          <div className="space-y-6">
            {/* ---------------- সংযুক্ত প্রতিষ্ঠান ---------------- */}
            {facilities.length > 0 && (
              <ProfileSection
                title={t('health.affiliations')}
                icon={<Building2 className="size-[18px]" aria-hidden="true" />}
              >
                <ul className="space-y-2">
                  {facilities.map((f) => (
                    <li key={f.id}>
                      <Link
                        to={`/healthcare/${f.slug}`}
                        className="group flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
                          <Icon name={categoryOf(f).icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-bold transition-colors group-hover:text-primary">
                            {L(f.name)}
                          </span>
                          <span className="block text-meta text-ink-subtle">
                            {L(categoryOf(f).name)} · {L(AREA_MAP[f.area].name)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ProfileSection>
            )}

            {/* ---------------- তথ্যের উৎস ---------------- */}
            <SourceNote source={doctor.source} />
          </div>
        </div>
      </div>

      {primaryPhone && (
        <div className="glass fixed inset-x-0 bottom-14 z-30 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-bar lg:hidden">
          <CallButton phone={primaryPhone} label={L(doctor.name)} size="lg" block>
            {t('health.bookAppointment')}
          </CallButton>
        </div>
      )}
    </div>
  )
}
