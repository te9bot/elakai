import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'
import {
  ArrowRight,
  Compass,
  MapPin,
  PhoneCall,
  Search as SearchIcon,
  Siren,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BusinessRailCard } from '@/components/cards/business-card'
import { RentalCard } from '@/components/cards/rental-card'
import { CategoryChip, CategoryTile } from '@/components/cards/category-tile'
import { EmergencyCard } from '@/components/cards/emergency-card'
import { RailSkeleton } from '@/components/feedback'
import { ListingsSection } from '@/components/listings/listings-section'
import { InfiniteBand, InfiniteHorizontalTrack } from '@/components/infinite-track'
import { HomeHero } from '@/components/home/hero'
import { Parallax, ParallaxLayer, ParallaxScene } from '@/components/parallax'
import { Reveal, Stagger, StaggerItem, REVEAL_EASE } from '@/components/reveal'
import { Section, SectionHeader } from '@/components/layout/section'
import { HEALTHCARE_IDS, UTILITY_IDS } from '@/data/categories'
import { splitIntoRows } from '@/data/coverage'
import { HERO_EMERGENCY_IDS } from '@/data/emergency'
import type { CategoryId, LatLng } from '@/data/types'
import { useGeolocation } from '@/hooks/use-geolocation'
import {
  useCategoriesListings,
  useCoverage,
  useEmergency,
  useLatestVerified,
  usePopular,
  useRentals,
} from '@/hooks/use-queries'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * The homepage is one continuous scene: a hero that keeps moving after it has
 * settled, then a sequence of sections that each arrive differently. The motion
 * vocabulary is deliberately varied — a page where every section fades up from
 * below reads as a template, not a product.
 *
 * Two systems are at work, and they do different jobs:
 *
 *  - *Reveals* (components/reveal.tsx) play once, when a section arrives. They
 *    are how content introduces itself.
 *  - *Parallax* (components/parallax.tsx) is scrubbed continuously against the
 *    scroll position. It is how the page holds depth for as long as you are
 *    looking at it, and it runs backwards when you scroll back up.
 *
 * Both draw on the same depth ratios as the logo intro, so the whole site — the
 * opening included — is one spatial system rather than a set of effects. Each
 * section below picks its own combination:
 *
 *    hero          layered scroll-away, background panning under the copy
 *    emergency     per-card depth across the row
 *    healthcare    horizontal drift on the header against the rail
 *    how it works  counter-moving glow, stepped depth along the sequence
 *    coverage      two draggable rows, sheared apart by the scroll
 *    explore       arrival scale, headline wipe
 *    rentals       columns at opposing rates
 *    browse        stepped depth with a slight counter-rotation per tile
 *    closing       the calmest of them, a slow settle
 *
 * Everything degrades to a static page under reduced motion: reveals collapse
 * to plain divs, and every parallax distance multiplies by a depth tier of
 * zero. See `useDepth` in lib/parallax.ts. The site does not ask for that any
 * more, whatever the OS says — see lib/motion.ts.
 */
export function HomePage() {
  const { t } = useI18n()
  // Held here and passed down: every call site of this hook triggers its own
  // getCurrentPosition, and one permission prompt per page is the limit.
  const { origin, isPrecise } = useGeolocation()

  const emergency = useEmergency()
  const healthcare = useCategoriesListings(HEALTHCARE_IDS, origin, 8)
  const rentals = useRentals({ origin, sort: 'recommended' })

  return (
    <>
      <HomeHero isPrecise={isPrecise} />

      {/* ---------------- Emergency ----------------
          Arrives as a unit and settles fast: this is the block people scroll
          to in a hurry, so it does not get a long, decorative reveal.

          The depth is across the row rather than into it — each card drifts at
          its own rate, so the three read as standing at different distances
          instead of as one slab. Kept to ±20px: these are phone numbers, and a
          card that is still travelling is a card that is harder to tap. */}
      <Section>
        <Reveal motion="down" distance={20}>
          <SectionHeader
            title={t('home.section.emergency')}
            description={t('home.section.emergency.sub')}
            href="/emergency"
          />
        </Reveal>

        {emergency.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <RailSkeleton count={2} />
          </div>
        ) : (
          <ParallaxScene>
            <Stagger gap={0.09} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {emergency.data
                // The hero already pins ambulance, hospital and blood bank; this
                // section carries the next tier rather than repeating them.
                ?.filter((c) => c.tone === 'danger' && !HERO_EMERGENCY_IDS.includes(c.id))
                .slice(0, 3)
                .map((c, i) => (
                  // StaggerItem stays the direct child of Stagger, with the
                  // parallax layer inside it. The stagger drives its children
                  // by variant label, and putting anything between the two
                  // makes that delivery depend on propagation working through
                  // it — which is not a thing to make a card full of emergency
                  // numbers depend on.
                  <StaggerItem key={c.id} motion="scale" distance={18} className="h-full">
                    <ParallaxLayer className="h-full" y={[20, -20]} rate={0.55 + i * 0.38}>
                      <EmergencyCard contact={c} className="h-full" />
                    </ParallaxLayer>
                  </StaggerItem>
                ))}
            </Stagger>
          </ParallaxScene>
        )}
      </Section>

      {/* ---------------- Healthcare ----------------
          A horizontal rail, so it reveals horizontally: the cards run in from
          the right in the same direction the rail scrolls.

          Its parallax is horizontal too, and only on the header — the rail
          itself is a scroll container bled to both screen edges, and sliding
          that sideways is how a page ends up wider than the viewport. The
          header drifting against a rail that holds still is enough to separate
          them in depth, and the travel stays inside the container's own
          padding at every breakpoint. */}
      <Section className="pt-0">
        <ParallaxScene>
          <ParallaxLayer x={[-18, 10]}>
            <Reveal motion="blur">
              <SectionHeader
                title={t('home.section.healthcare')}
                description={t('home.section.healthcare.sub')}
                href="/healthcare"
              />
            </Reveal>
          </ParallaxLayer>

          {healthcare.isPending ? (
            <RailSkeleton />
          ) : (
            <ParallaxLayer y={[16, -16]}>
              <Stagger gap={0.06} className="rail rail-bleed">
                {healthcare.data?.map((r) => (
                  <StaggerItem key={r.business.id} motion="right" distance={44}>
                    <BusinessRailCard result={r} />
                  </StaggerItem>
                ))}
              </Stagger>
            </ParallaxLayer>
          )}
        </ParallaxScene>
      </Section>

      <HowItWorks />

      <CoversBand />

      <ExploreSection origin={origin} />

      {/* ---------------- Rentals ----------------
          Two columns, so the cards converge from opposite sides — the reveal
          traces the layout instead of ignoring it. */}
      <Section className="pt-0">
        <Reveal motion="up">
          <SectionHeader
            title={t('home.section.rentals')}
            description={t('home.section.rentals.sub')}
            href="/rentals"
          />
        </Reveal>

        {rentals.isPending ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <RailSkeleton count={2} />
          </div>
        ) : (
          // overflow-x-clip, not hidden: a card sliding in from the right is
          // wider than the document for a third of a second, and in LTR that is
          // enough to flash a horizontal scrollbar across the whole page. `clip`
          // stops that without turning this into a scroll container; the
          // negative margin gives card shadows room before the clip edge.
          <ParallaxScene className="-mx-3 grid gap-3 overflow-x-clip px-3 lg:grid-cols-2">
            {rentals.data?.slice(0, 4).map((r, i) => (
              // The two columns run at opposing rates, so the pair shears
              // slightly past each other on the way through — the depth here
              // is across the layout rather than into the page, which is what
              // the two-column grid gives us that a rail does not.
              <ParallaxLayer
                key={r.rental.id}
                y={i % 2 === 0 ? [28, -12] : [12, -28]}
              >
                <Reveal
                  motion={i % 2 === 0 ? 'left' : 'right'}
                  distance={38}
                  delay={(i % 2) * 0.06}
                >
                  <RentalCard rental={r.rental} />
                </Reveal>
              </ParallaxLayer>
            ))}
          </ParallaxScene>
        )}
      </Section>

      {/* ---------------- Browse healthcare ---------------- */}
      <Section className="pt-0">
        <Reveal motion="up">
          <SectionHeader
            title={t('health.title')}
            description={t('health.sub')}
            href="/healthcare"
          />
        </Reveal>

        {/* The only place rotation is used, and it is under a degree: tiles are
            small, square and gridded, so a rate difference alone is almost
            invisible on them. Alternating the direction by column keeps the
            grid from looking uniformly skewed. */}
        <ParallaxScene>
          <Stagger
            gap={0.05}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {HEALTHCARE_IDS.map((id, i) => (
              <StaggerItem key={id} motion="scale" distance={16}>
                <ParallaxLayer
                  y={[18, -18]}
                  rotate={i % 2 === 0 ? [-0.8, 0.8] : [0.8, -0.8]}
                  rate={0.6 + (i % 4) * 0.2}
                >
                  <CategoryTile id={id} />
                </ParallaxLayer>
              </StaggerItem>
            ))}
          </Stagger>
        </ParallaxScene>
      </Section>

      {/* Everything published from the admin panel, across every section.
          Renders nothing until something is published, so the homepage is
          unchanged until it has content to show. */}
      <Section className="pt-0">
        <ListingsSection
          section={undefined}
          title={t('home.section.listings')}
          description={t('home.section.listings.sub')}
        />
      </Section>

      <ClosingCta />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

/**
 * Four steps on one line at desktop, joined by a rule that draws itself left to
 * right as the block enters — the animation carries the sequence, which is the
 * whole point of the section.
 */
function HowItWorks() {
  const { t, n } = useI18n()

  const steps = [
    { icon: SearchIcon, title: t('home.step.search'), sub: t('home.step.search.sub') },
    { icon: Sparkles, title: t('home.step.find'), sub: t('home.step.find.sub') },
    { icon: PhoneCall, title: t('home.step.call'), sub: t('home.step.call.sub') },
    { icon: Siren, title: t('home.step.help'), sub: t('home.step.help.sub') },
  ]

  return (
    <Section className="pt-0">
      <Reveal motion="scale" distance={24}>
        {/* overflow-hidden on the panel is what makes the glow safe to move
            this far: it is a 320px wash travelling 100px, and the panel is the
            only thing that keeps it off the sections either side. */}
        <ParallaxScene className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          {/* A 320px primary glow used to float off this panel's top-right
              corner on its own parallax. Removed with the hero's two: same
              artefact, same reason. It was a radial gradient parked in a corner
              with nothing in the geography behind it, and the brief is explicit
              that the light on this site should belong to the map rather than
              to a CSS offset. The panel keeps its own surface and wash for
              depth; see components/home/kushtia-map.tsx for where the
              atmosphere lives now. */}
          <h2 className="relative text-title text-balance">{t('home.howItWorks')}</h2>

          <div className="relative mt-6">
            <m.div
              aria-hidden="true"
              className="absolute left-[22px] right-6 top-[22px] hidden h-px origin-left bg-gradient-to-r from-primary/50 via-primary/25 to-transparent lg:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: REVEAL_EASE, delay: 0.2 }}
            />

            <Stagger
              as="ol"
              gap={0.1}
              delay={0.15}
              className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {steps.map((step, i) => (
                // The layer sits inside the list item, not around it: an <ol>
                // may only contain <li>, and StaggerItem is what renders that.
                // Depth climbs along the sequence, so the four steps lean
                // gently into reading order rather than moving as a block.
                <StaggerItem as="li" key={step.title} motion="scale" distance={14}>
                  <ParallaxLayer y={[14, -14]} rate={0.4 + i * 0.3}>
                    <span className="grid size-11 place-items-center rounded-control bg-primary-soft text-primary-ink ring-4 ring-surface">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 flex items-center gap-2 text-body font-bold">
                      <span className="tnum text-meta text-ink-subtle">{n(i + 1)}</span>
                      {step.title}
                    </h3>
                    <p className="mt-1 text-body-sm leading-relaxed text-pretty text-ink-muted">
                      {step.sub}
                    </p>
                  </ParallaxLayer>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </ParallaxScene>
      </Reveal>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Coverage band                                                       */
/* ------------------------------------------------------------------ */

/**
 * The second band, and the last one. Same engine as the hero's "Covering"
 * strip — see lib/infinite-track.ts — pitched an octave wider.
 *
 * The hero strip is one row, close spacing, a short leash: it states what the
 * directory is. This one has to read as the *extent* of it, so it gets two
 * rows, full-size chips on the leading one, more air between items, half again
 * the speed, and momentum that keeps going long enough for a throw to feel
 * like it went somewhere. The two are the same instrument, and the page steps
 * up from one to the other. Everything that differs between them is in the
 * props below; not a line of the animation distinguishes the two.
 *
 * Both rows run right to left, as the hero strip does. The depth is in the
 * *rate*: the second row travels 1.34× the first on the same drag and drifts
 * faster on its own, so the pair shears past each other continuously instead
 * of moving as a slab. It never resolves into a repeat, because the two rows
 * hold different content over loops of different lengths — lengths nothing
 * here knows or needs to.
 *
 * The rows are dealt from one array, not authored as two. `splitIntoRows` is
 * what makes an item added in `data/coverage.ts` (or, later, in the admin
 * panel) land somewhere without anyone deciding where.
 */
function CoversBand() {
  const { t } = useI18n()
  const { data: coverage } = useCoverage()
  const [lead, trail] = splitIntoRows(coverage.covers, 2)

  return (
    // The one section whose parallax is mostly horizontal, and now the scroll
    // does that rather than a transform: `scrollBoost` turns vertical scroll
    // velocity into a sideways push on the rows, opposed between the two, so
    // the band still opens like a seam between the sections above and below —
    // but it is the *same* value the drag feeds, which means scrolling and
    // dragging can never end up as two systems animating one box.
    <ParallaxScene
      as="section"
      className="relative overflow-hidden border-y border-line bg-surface py-10 sm:py-12"
    >
      <ParallaxLayer className="absolute inset-0" y={[24, -24]} scale={[1.06, 1.06]}>
        <div
          aria-hidden="true"
          className="surveyor-dots size-full opacity-50 [mask-image:radial-gradient(closest-side,#000,transparent)]"
        />
      </ParallaxLayer>

      <div className="container relative">
        <Reveal motion="blur">
          {/* Deliberately the same eyebrow shape as the hero strip's
              "Covering" label — micro, uppercase, tracked out, an icon at the
              same size. It is what tells you these two bands are one idea seen
              at two scales rather than two carousels that happen to share a
              page. */}
          <p className="flex items-center gap-2 text-micro uppercase tracking-[0.14em] text-ink-subtle">
            <Compass className="size-3.5 text-primary" aria-hidden="true" />
            {t('home.covers.eyebrow')}
          </p>
          <h2 className="mt-2 text-title text-balance">{t('home.covers.title')}</h2>
          <p className="mt-1 max-w-xl text-body-sm text-pretty text-ink-muted">
            {t('home.covers.sub')}
          </p>
        </Reveal>
      </div>

      {/* One band, two rows: the whole block is a single drag surface, so a
          hand anywhere in it moves both rows at once. Grabbing one row and
          watching the other sit still is what would give the trick away. */}
      <InfiniteBand
        glide={1.05}
        handover={0.85}
        scrollBoost={130}
        className="relative mt-7 space-y-3"
      >
        <Reveal motion="left" distance={48} duration={0.8}>
          <InfiniteHorizontalTrack
            items={lead}
            speed={88}
            gap="0.8rem"
            className="py-1"
            renderItem={(id: CategoryId) => <CategoryChip id={id} tabIndex={-1} />}
          />
        </Reveal>

        <Reveal motion="right" distance={48} duration={0.8} delay={0.08}>
          <InfiniteHorizontalTrack
            items={trail}
            speed={116}
            dragMultiplier={1.34}
            scrollRate={-1}
            gap="0.8rem"
            className="py-1"
            renderItem={(id: CategoryId) => <CategoryChip id={id} size="sm" tabIndex={-1} />}
          />
        </Reveal>
      </InfiniteBand>
    </ParallaxScene>
  )
}

/* ------------------------------------------------------------------ */
/* Explore                                                             */
/* ------------------------------------------------------------------ */

type ExploreTab = 'popular' | 'utilities' | 'latest'

/**
 * Popular, utilities and newly-verified used to be three near-identical rails
 * stacked on top of each other. They are one switchable rail now: the same
 * content, a third of the scroll, and the swap is the section's animation.
 */
function ExploreSection({ origin }: { origin: LatLng }) {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const [tab, setTab] = useState<ExploreTab>('popular')

  const popular = usePopular(origin, 8)
  const utilities = useCategoriesListings(UTILITY_IDS, origin, 8)
  const latest = useLatestVerified(origin, 8)

  const tabs = [
    { id: 'popular' as const, label: t('home.explore.tab.popular'), href: '/services', query: popular },
    { id: 'utilities' as const, label: t('home.explore.tab.utilities'), href: '/services', query: utilities },
    { id: 'latest' as const, label: t('home.explore.tab.latest'), href: '/search', query: latest },
  ]

  const activeIndex = tabs.findIndex((x) => x.id === tab)
  const active = tabs[activeIndex]

  return (
    <Section className="pt-0">
      <Reveal motion="up">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {/* The only wipe on the page. It suits this heading because the
                section underneath it is a rail that swaps sideways, and it
                reads as the same gesture arriving early. */}
            <Reveal motion="clip" duration={0.7}>
              <h2 className="text-title text-balance">{t('home.explore.title')}</h2>
            </Reveal>
            <p className="mt-1 text-body-sm text-pretty text-ink-muted">
              {t('home.explore.sub')}
            </p>
          </div>

          <Link
            to={active.href}
            className="group inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5 text-body-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('home.seeAll')}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>

      {/* The indicator slides rather than cross-fades, so the eye tracks which
          rail it is about to get. Equal grid tracks are what let it move by a
          flat 100% of its own width. */}
      <Reveal motion="up" distance={16} delay={0.05}>
        {/* Plain buttons with aria-pressed rather than role="tablist": a real
            tablist owes the user arrow-key navigation and wired-up tabpanels,
            and this is a filter over one rail, not a set of panels. */}
        <div
          role="group"
          aria-label={t('home.explore.title')}
          className="relative grid grid-cols-3 gap-0 rounded-pill border border-line bg-surface p-1 shadow-card sm:inline-grid sm:w-auto sm:min-w-[22rem]"
        >
          <m.span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-pill bg-primary shadow-card"
            animate={{ x: `${activeIndex * 100}%` }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }
            }
          />

          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={tab === x.id}
              onClick={() => setTab(x.id)}
              className={cn(
                'relative z-10 h-11 truncate rounded-pill px-3 text-body-sm font-bold transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                tab === x.id ? 'text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* The swap is vertical, not horizontal: this rail is bled to both screen
          edges, so translating it sideways would push the document wider than
          the viewport mid-transition. The sliding indicator above already
          carries the left-to-right cue.

          Its scroll motion is an arrival, not a continuous drift, for the same
          reason: the rail already animates every time the filter changes, and
          scrubbing it against the scroll as well would leave two things
          animating one box. It settles at scale 1, so nothing overflows. */}
      <Parallax className="mt-5" range="enter" scale={[0.965, 1]} y={[26, 0]}>
        {active.query.isPending ? (
          <RailSkeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={tab}
              initial={reduced ? false : { opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: reduced ? 0 : 0.3, ease: REVEAL_EASE }}
              className="rail rail-bleed"
            >
              {active.query.data?.map((r) => (
                <BusinessRailCard key={r.business.id} result={r} />
              ))}
            </m.div>
          </AnimatePresence>
        )}
      </Parallax>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Closing CTA                                                         */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  const { t } = useI18n()

  return (
    <Section className="pt-0">
      <Reveal motion="scale" distance={26}>
        {/* Bookends the hero: the page opens and closes on something that moves
            with the scroll rather than sitting still in it. This is the calmest
            of the page's scenes deliberately — it is the last thing before the
            footer, and the reader is arriving at a decision, not being shown
            another effect. Two washes at different rates and nothing else. */}
        <ParallaxScene>
          <Card
            elevation="lifted"
            className="relative overflow-hidden border-0 bg-primary p-7 text-white sm:p-10"
          >
            <ParallaxLayer
              className="pointer-events-none absolute inset-0"
              y={[34, -34]}
            >
              <div className="absolute -left-16 -top-24 size-72 rounded-full bg-white/10 blur-2xl animate-float" />
            </ParallaxLayer>
            <ParallaxLayer
              className="pointer-events-none absolute inset-0"
              y={[54, -54]}
              x={[-10, 10]}
            >
              <div className="absolute -bottom-28 right-0 size-80 rounded-full bg-white/[0.07] blur-2xl animate-float-alt" />
            </ParallaxLayer>

            {/* A single slow pass of light across the panel. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sheen"
            />

            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-lg">
                <h2 className="text-title text-balance text-white">
                  {t('emergency.title')}
                </h2>
                <p className="mt-2 text-body-sm text-pretty text-white/85">
                  {t('emergency.sub')}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-meta font-bold text-white/75">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {t('home.hero.location')}
                </p>
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
        </ParallaxScene>
      </Reveal>
    </Section>
  )
}
