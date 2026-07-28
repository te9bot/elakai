import { Fragment, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  MapPin,
  PhoneCall,
  Search as SearchIcon,
  Siren,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchBar } from '@/components/search/search-bar'
import { BusinessRailCard } from '@/components/cards/business-card'
import { RentalCard } from '@/components/cards/rental-card'
import { CategoryChip, CategoryTile } from '@/components/cards/category-tile'
import { EmergencyCard, HeroEmergency } from '@/components/cards/emergency-card'
import { DemoBanner, RailSkeleton } from '@/components/feedback'
import { RevealGroup, RevealItem } from '@/components/reveal'
import { Section, SectionHeader } from '@/components/layout/section'
import { HEALTHCARE_IDS, HOME_CHIP_IDS, UTILITY_IDS } from '@/data/categories'
import { HERO_EMERGENCY_IDS } from '@/data/emergency'
import { useGeolocation } from '@/hooks/use-geolocation'
import {
  useCategoriesListings,
  useEmergency,
  useLatestVerified,
  usePopular,
  useRentals,
} from '@/hooks/use-queries'
import { countBusinesses } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

const STATS = countBusinesses()

export function HomePage() {
  const { t, n } = useI18n()
  const navigate = useNavigate()
  const { origin, isPrecise } = useGeolocation()
  const [query, setQuery] = useState('')

  const emergency = useEmergency()
  const healthcare = useCategoriesListings(HEALTHCARE_IDS, origin, 8)
  const utilities = useCategoriesListings(UTILITY_IDS, origin, 8)
  const popular = usePopular(origin, 8)
  const latest = useLatestVerified(origin, 8)
  const rentals = useRentals({ origin, sort: 'recommended' })

  function submit(v: string) {
    navigate(v.trim() ? `/search?q=${encodeURIComponent(v.trim())}` : '/search')
  }

  // Pinned in the order HERO_EMERGENCY_IDS declares, not the order the data
  // happens to arrive in — ambulance has to come first.
  const heroContacts = HERO_EMERGENCY_IDS.flatMap((id) => {
    const contact = emergency.data?.find((c) => c.id === id)
    return contact ? [contact] : []
  })

  const stats = [
    { label: t('home.hero.stat.listings'), value: STATS.total },
    { label: t('home.hero.stat.verified'), value: STATS.verified },
    { label: t('home.hero.stat.roundClock'), value: STATS.always },
  ]

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        {/* Surveyor grid — reads as a map fragment, costs nothing to draw. */}
        <div className="surveyor-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/[0.07] to-transparent"
          aria-hidden="true"
        />

        <div className="container relative py-6 sm:py-12 lg:py-16">
          {/* Asymmetric on desktop: copy and search hold the left column, the
              emergency shortcuts own the right. Explicit row/col placement at lg
              lets one DOM order serve both layouts — on a phone it reads copy,
              search, emergency, categories, stats, which puts the three call
              shortcuts above the fold on a 360x640 screen. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-x-12 lg:gap-y-5">
            {/* min-w-0 throughout: grid items default to min-width:auto, and a
                single unbreakable Bengali word is enough to push a track wider
                than the viewport and scroll the whole page sideways. */}
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {/* The badge and h1 sit outside the reveal deliberately. The h1 is
                  the LCP element, and starting it at opacity 0 withholds first
                  paint for the length of the stagger — on exactly the hardware
                  least able to absorb it. */}
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-meta font-bold text-ink-muted shadow-card">
                <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                {isPrecise ? t('home.hero.locationNear') : t('home.hero.location')}
              </span>

              <h1 className="mt-4 text-display-lg text-balance sm:mt-5">
                {t('home.hero.title')}
              </h1>

              <RevealGroup>
                <RevealItem>
                  <p className="mt-3 max-w-xl text-body text-pretty text-ink-muted sm:mt-4 sm:text-heading sm:font-normal">
                    {t('home.hero.sub')}
                  </p>
                </RevealItem>

                <RevealItem className="mt-6 max-w-xl sm:mt-7">
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    onSubmit={submit}
                    size="lg"
                    className="shadow-lift"
                  />
                </RevealItem>
              </RevealGroup>
            </div>

            <HeroEmergency
              contacts={heroContacts}
              className="min-w-0 animate-fade-up lg:col-start-2 lg:row-start-1 lg:row-span-3"
            />

            {/* Quick categories — the fastest path for someone who cannot type
                fast, so on a phone they scroll sideways rather than wrapping to
                four rows and pushing everything below them off the screen. */}
            <nav
              aria-label={t('home.hero.chips.label')}
              className="rail rail-bleed min-w-0 animate-fade-up lg:col-start-1 lg:row-start-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {HOME_CHIP_IDS.map((id) => (
                <CategoryChip key={id} id={id} />
              ))}
            </nav>

            <p className="min-w-0 animate-fade-up text-meta text-ink-subtle lg:col-start-1 lg:row-start-3">
              {stats.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 && (
                    <span className="px-2 text-ink-subtle/50" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span className="tnum font-bold text-ink">{n(s.value)}</span> {s.label}
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </section>

      <div className="container pt-6">
        <DemoBanner />
      </div>

      {/* ---------------- Emergency ---------------- */}
      <Section>
        <SectionHeader
          title={t('home.section.emergency')}
          description={t('home.section.emergency.sub')}
          href="/emergency"
        />

        {emergency.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <RailSkeleton count={2} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {emergency.data
              // The hero already pins ambulance, hospital and blood bank; this
              // section carries the next tier rather than repeating them.
              ?.filter((c) => c.tone === 'danger' && !HERO_EMERGENCY_IDS.includes(c.id))
              .slice(0, 3)
              .map((c) => (
                <EmergencyCard key={c.id} contact={c} />
              ))}
          </div>
        )}
      </Section>

      {/* ---------------- Healthcare ---------------- */}
      <Section className="pt-0">
        <SectionHeader
          title={t('home.section.healthcare')}
          description={t('home.section.healthcare.sub')}
          href="/healthcare"
        />

        {healthcare.isPending ? (
          <RailSkeleton />
        ) : (
          <div className="rail rail-bleed">
            {healthcare.data?.map((r) => (
              <BusinessRailCard key={r.business.id} result={r} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------------- How it works ---------------- */}
      <Section className="pt-0">
        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <h2 className="text-title text-balance">{t('home.howItWorks')}</h2>

          <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: SearchIcon, title: t('home.step.search'), sub: t('home.step.search.sub') },
              { icon: Sparkles, title: t('home.step.find'), sub: t('home.step.find.sub') },
              { icon: PhoneCall, title: t('home.step.call'), sub: t('home.step.call.sub') },
              { icon: Siren, title: t('home.step.help'), sub: t('home.step.help.sub') },
            ].map((step, i) => (
              <li key={step.title} className="relative">
                <span className="grid size-11 place-items-center rounded-control bg-primary-soft text-primary-ink">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 flex items-center gap-2 text-body font-bold">
                  <span className="tnum text-meta text-ink-subtle">{n(i + 1)}</span>
                  {step.title}
                </h3>
                <p className="mt-1 text-body-sm leading-relaxed text-pretty text-ink-muted">
                  {step.sub}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------------- Utilities ---------------- */}
      <Section className="pt-0">
        <SectionHeader
          title={t('home.section.utilities')}
          description={t('home.section.utilities.sub')}
          href="/services"
        />

        {utilities.isPending ? (
          <RailSkeleton />
        ) : (
          <div className="rail rail-bleed">
            {utilities.data?.map((r) => (
              <BusinessRailCard key={r.business.id} result={r} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------------- Popular ---------------- */}
      <Section className="pt-0">
        <SectionHeader
          title={t('home.section.popular')}
          description={t('home.section.popular.sub')}
          href="/services"
        />

        {popular.isPending ? (
          <RailSkeleton />
        ) : (
          <div className="rail rail-bleed">
            {popular.data?.map((r) => (
              <BusinessRailCard key={r.business.id} result={r} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------------- Latest verified ---------------- */}
      <Section className="pt-0">
        <SectionHeader
          title={t('home.section.latest')}
          description={t('home.section.latest.sub')}
          href="/search"
        />

        {latest.isPending ? (
          <RailSkeleton />
        ) : (
          <div className="rail rail-bleed">
            {latest.data?.map((r) => (
              <BusinessRailCard key={r.business.id} result={r} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------------- Rentals ---------------- */}
      <Section className="pt-0">
        <SectionHeader
          title={t('home.section.rentals')}
          description={t('home.section.rentals.sub')}
          href="/rentals"
        />

        {rentals.isPending ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <RailSkeleton count={2} />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rentals.data?.slice(0, 4).map((r) => (
              <RentalCard key={r.rental.id} rental={r.rental} />
            ))}
          </div>
        )}
      </Section>

      {/* ---------------- Browse all ---------------- */}
      <Section className="pt-0">
        <SectionHeader title={t('health.title')} description={t('health.sub')} href="/healthcare" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HEALTHCARE_IDS.map((id) => (
            <CategoryTile key={id} id={id} />
          ))}
        </div>
      </Section>

      {/* ---------------- Closing CTA ---------------- */}
      <Section className="pt-0">
        <Card
          elevation="lifted"
          className="overflow-hidden border-0 bg-primary p-7 text-white sm:p-10"
        >
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <h2 className="text-title text-balance text-white">{t('emergency.title')}</h2>
              <p className="mt-2 text-body-sm text-pretty text-white/85">{t('emergency.sub')}</p>
            </div>

            <Button asChild variant="secondary" size="lg" className="shrink-0">
              <Link to="/emergency">
                <Siren />
                {t('nav.emergency')}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
      </Section>
    </>
  )
}
