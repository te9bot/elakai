import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  Clock,
  Globe,
  MapPin,
  Navigation,
  Phone,
  Share2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { Separator } from '@/components/ui/separator'
import { CallButton } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { ListingArt } from '@/components/listing-art'
import { MapPanel } from '@/components/business/map-panel'
import { BusinessCard } from '@/components/cards/business-card'
import { DetailSkeleton, EmptyState } from '@/components/feedback'
import { OpenStatus, VerifiedBadge } from '@/components/status'
import { AREA_MAP, CATEGORY_MAP } from '@/data/categories'
import { useBusiness, useRelated } from '@/hooks/use-queries'
import { DAY_NAMES, directionsHref, formatTime } from '@/lib/format'
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
        <ListingArt
          seed={business.imageSeed}
          icon={cat.icon}
          rounded={false}
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
            <Button asChild variant="secondary" size="lg" className="flex-1">
              <a
                href={directionsHref(business.coords, L(business.name))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation />
                {t('card.directions')}
              </a>
            </Button>
          </div>
        </Card>

        {/* Three grid children: About, the sidebar, then the rest of the body.
            About is hoisted out of the left column so contact details and the map
            follow it immediately on mobile instead of trailing the reviews. On
            desktop auto-placement returns About to column 1 and the sidebar spans
            both of its rows. */}
        <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
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
                    {/* Rendered as text, never a tel: link, while DEMO_MODE is on. */}
                    <dd className="tnum text-body-sm font-bold">{business.phone}</dd>
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

            {/* ---------------- Reviews ---------------- */}
            <section>
              <h2 className="mb-3 text-heading">{t('biz.reviews')}</h2>
              {business.reviews.length === 0 ? (
                <EmptyState title={t('biz.noReviews')} description={t('biz.noReviewsSub')} />
              ) : (
                <ul className="space-y-3">
                  {business.reviews.map((r) => (
                    <li key={r.id}>
                      <Card className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-body-sm font-bold text-primary-ink"
                              aria-hidden="true"
                            >
                              {L(r.author).charAt(0)}
                            </span>
                            <div>
                              <p className="text-body-sm font-bold">{L(r.author)}</p>
                              <p className="tnum text-meta text-ink-subtle">{n(r.date)}</p>
                            </div>
                          </div>
                          <Rating value={r.rating} showStars />
                        </div>
                        <p className="mt-3 text-body-sm leading-relaxed text-pretty text-ink-muted">
                          {L(r.comment)}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
          <Button asChild variant="secondary" size="lg" className="flex-1">
            <a
              href={directionsHref(business.coords, L(business.name))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation />
              {t('card.directions')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
