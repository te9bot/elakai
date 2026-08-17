import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  Clock,
  Globe,
  MapPin,
  Phone,
  Share2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { Separator } from '@/components/ui/separator'
import { CallButton, PhoneLink } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { ListingArt } from '@/components/listing-art'
import { ListingPhoto } from '@/components/listing-photo'
import { MapPanel } from '@/components/business/map-panel'
import { BusinessCard } from '@/components/cards/business-card'
import { DetailSkeleton, EmptyState } from '@/components/feedback'
import { OpenStatus, VerifiedBadge } from '@/components/status'
import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import { useBusiness, useRelated } from '@/hooks/use-queries'
import { DAY_NAMES, formatTime } from '@/lib/format'
import { DirectionsButton } from '@/components/directions-button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function BusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t, L, n, locale } = useI18n()
  const navigate = useNavigate()

  const { data: business, isPending } = useBusiness(slug)
  const { data: related } = useRelated(business ?? undefined)

  if (isPending) return <DetailSkeleton />

  if (!business) {
    return (
      <div className="container py-16">
        <EmptyState
          titleAs="h1"
          title={t('biz.notFound')}
          description={t('biz.notFoundSub')}
          action={
            <Button asChild size="lg">
              <Link to="/">{t('biz.backHome')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const cat = CATEGORY_MAP[business.category]
  const area = AREA_MAP[business.area]
  const today = new Date().getDay()
  // Narrow once here so the hours table below stays free of casts.
  const weeklyHours = business.hours === 'always' ? null : business.hours

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: L(business!.name), url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      // User dismissed the share sheet — nothing to recover from.
    }
  }

  return (
    <div className="pb-28 lg:pb-8">
      {/* ---------------- Hero ---------------- */}
      <div className="relative">
        <ListingPhoto
          src={business.imageUrl}
          alt={L(business.name)}
          seed={business.imageSeed}
          icon={cat.icon}
          rounded={false}
          priority
          className="h-52 w-full sm:h-72 lg:h-80"
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

      <div className="container">
        {/* Card overlaps the hero — lifts the key facts above the fold. */}
        <Card elevation="lifted" className="relative -mt-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" size="sm">
              <span aria-hidden="true">{cat.emoji}</span>
              {L(cat.name)}
            </Badge>
            {business.verified && <VerifiedBadge />}
          </div>

          <h1 className="mt-3 text-title text-balance">{L(business.name)}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Rating value={business.rating} count={business.reviewCount} showStars size="md" />
            <OpenStatus hours={business.hours} showNext />
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-body-sm text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="text-pretty">{L(business.address)}</span>
          </p>

          {/* Desktop actions; mobile uses the sticky bar at the foot of the page. */}
          <div className="mt-5 hidden gap-3 lg:flex">
            <CallButton phone={business.phone} label={L(business.name)} size="lg" className="flex-1" />
            <DirectionsButton
              coords={business.coords}
              coordsApprox={business.coordsApprox}
              address={L(business.address)}
              label={L(business.name)}
              size="lg"
              className="flex-1"
            />
          </div>
        </Card>

        {/* Three grid children: About, the sidebar, then the rest of the body.
            About is hoisted out of the left column so contact details and the map
            follow it immediately on mobile instead of trailing the reviews. On
            desktop auto-placement returns About to column 1 and the sidebar spans
            both of its rows.

            `minmax(0,1fr)`, NOT `1fr` — this was the bug that pushed the contact
            panel off the right of the screen.

            A bare `1fr` is shorthand for `minmax(auto, 1fr)`, and that `auto`
            floor is a *min-content* floor: the track refuses to shrink below the
            widest unbreakable thing inside it. Something in this column — a long
            address, a map, an unbroken phone string — held the floor at 1404px
            inside a 1216px container, so the 360px sidebar started past the
            container edge and the page grew a 245px horizontal scroll.
            Measured: tracks computed to `1404px 360px` where 824px + 360px was
            intended.

            `minmax(0, …)` lets the track shrink and hands the overflow back to
            the children, which already carry `min-w-0` / `truncate` for exactly
            this. The hero has always done it this way; the detail pages had not,
            and every two-column grid in the app now matches. */}
        <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* ---------------- About ---------------- */}
          <section>
            <h2 className="mb-2 text-heading">{t('biz.about')}</h2>
            <p className="text-body leading-relaxed text-pretty text-ink-muted">
              {L(business.description)}
            </p>
          </section>

          {/* ---------------- Sidebar ---------------- */}
          {/* self-start keeps the aside at content height and row-span-2 gives it
              the whole column to travel down, which is what lets it stick rather
              than stranding the cards above a tall empty gutter. The max height is
              a guard for short laptop viewports — the sidebar runs ~700-765px, so
              on a 768px-tall window the map's directions button would otherwise be
              unreachable while pinned. It reserves only the 6rem sticky offset so
              it stays dormant (no scrollbar) whenever the sidebar does fit. The
              inset padding keeps the card shadows clear of the clip edge. */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:-mx-3 lg:row-span-2 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:px-3">
            <Card className="p-5">
              <h2 className="mb-4 text-heading">{t('biz.contact')}</h2>

              <dl className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-meta font-semibold text-ink-subtle">{t('biz.phone')}</dt>
                    {/* A link when the number is real, plain text when it is a
                        placeholder — decided by lib/phone.ts, not by a flag. */}
                    <dd className="text-body-sm">
                      <PhoneLink phone={business.phone} />
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-meta font-semibold text-ink-subtle">{t('biz.address')}</dt>
                    <dd className="text-body-sm text-pretty">{L(business.address)}</dd>
                  </div>
                </div>

                {business.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-meta font-semibold text-ink-subtle">
                        {t('biz.website')}
                      </dt>
                      <dd>
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-body-sm font-semibold text-primary hover:underline"
                        >
                          {business.website.replace(/^https?:\/\//, '')}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

              <Separator className="my-5" />

              <div className="flex items-center gap-2 text-meta text-ink-subtle">
                <Icon name={cat.icon} className="size-4" />
                <span>
                  {L(cat.name)} · {L(area.name)}
                </span>
              </div>
            </Card>

            <section>
              <h2 className="mb-3 text-heading">{t('biz.location')}</h2>
              <MapPanel coords={business.coords} label={L(business.name)} />
            </section>
          </aside>

          <div className="space-y-6">
            {/* ---------------- Services ---------------- */}
            {business.services.length > 0 && (
              <section>
                <h2 className="mb-3 text-heading">{t('biz.services')}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {business.services.map((s) => (
                    <li
                      key={s.en}
                      className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-4 py-3"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="text-body-sm font-medium">{L(s)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---------------- Photos ---------------- */}
            <section>
              <h2 className="mb-3 text-heading">{t('biz.gallery')}</h2>
              {/* The bleed reaches the screen edge on mobile; inside the desktop
                  grid column it would only push photos into the sidebar gutter. */}
              <div className="rail rail-bleed lg:[--bleed:0px]">
                {/* The uploaded photograph leads the rail. It is the only real
                    image here — the rest are generated stand-ins — so burying
                    it among them would hide the one thing an admin published. */}
                {business.imageUrl && (
                  <ListingPhoto
                    src={business.imageUrl}
                    alt={L(business.name)}
                    seed={business.imageSeed}
                    icon={cat.icon}
                    className="h-32 w-44 shrink-0 sm:h-40 sm:w-56"
                  />
                )}
                {Array.from({ length: business.photoCount }).map((_, i) => (
                  <ListingArt
                    key={i}
                    seed={business.imageSeed + i * 3}
                    icon={cat.icon}
                    className="h-32 w-44 shrink-0 sm:h-40 sm:w-56"
                  />
                ))}
              </div>
            </section>

            {/* ---------------- Hours ---------------- */}
            <section>
              <h2 className="mb-3 text-heading">{t('biz.hours')}</h2>
              <Card className="overflow-hidden p-0">
                {business.hours === 'always' ? (
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
                              <span className="ml-2 text-meta font-semibold">
                                · {t('biz.today')}
                              </span>
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
              </Card>
            </section>

            {/* A Customer Reviews section stood here. It is deliberately gone:
                ELAKAI publishes no review data of its own, so the block was
                either an invented rating or an "no reviews yet" placeholder,
                and neither belongs on a directory people consult to find a
                hospital. `reviews` remains on the record for whenever a real
                source is wired up; nothing renders it. */}
          </div>
        </div>

        {/* ---------------- Related ---------------- */}
        {related && related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-title">{L(cat.name)}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {related.map((r) => (
                <BusinessCard key={r.business.id} result={r} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ---------------- Sticky mobile action bar ---------------- */}
      <div className="glass fixed inset-x-0 bottom-14 z-30 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-bar lg:hidden">
        <div className="flex gap-2">
          <CallButton
            phone={business.phone}
            label={L(business.name)}
            size="lg"
            className="flex-[2]"
          />
          <DirectionsButton
            coords={business.coords}
            coordsApprox={business.coordsApprox}
            address={L(business.address)}
            label={L(business.name)}
            size="lg"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}
