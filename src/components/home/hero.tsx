import { Fragment, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ShieldCheck } from 'lucide-react'
import { m, useScroll, useTransform, type Variants } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'

import { SearchBar } from '@/components/search/search-bar'
import { CategoryChip } from '@/components/cards/category-tile'
import { HeroEmergency } from '@/components/cards/emergency-card'

import { InfiniteBand, InfiniteHorizontalTrack } from '@/components/infinite-track'
import { CountUp } from '@/components/count-up'
import { HOME_CHIP_IDS } from '@/data/categories'
import { HERO_EMERGENCY_IDS } from '@/data/emergency'
import type { CategoryId } from '@/data/types'
import { useCoverage, useEmergency, useStats } from '@/hooks/use-queries'
import { useIsDesktop, useIsTablet } from '@/hooks/use-media-query'
import { useI18n } from '@/lib/i18n'

/* ------------------------------------------------------------------ */
/* Entrance choreography                                               */
/* ------------------------------------------------------------------ */

/**
 * The grid is the variant root, so one sequence drives the whole hero even
 * though its parts sit in four different grid areas. Framer propagates the
 * `show` label down through plain DOM in between.
 */
const stage: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
}

const column: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 240, damping: 26, mass: 0.8 },
  },
}

const soften: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const lift: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.975 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 220, damping: 24, mass: 0.9 },
  },
}

const panel: Variants = {
  hidden: { opacity: 0, x: 26, scale: 0.98 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 26, mass: 0.9, delay: 0.1 },
  },
}

/* ------------------------------------------------------------------ */
/* Title                                                               */
/* ------------------------------------------------------------------ */

/**
 * Word-by-word rise.
 *
 * Critically, this animates **transform only** — no opacity, no clip. The h1 is
 * the LCP element, and anything that withholds its first paint pushes LCP out by
 * the length of the stagger, on exactly the hardware least able to absorb it.
 * Translated text is painted text.
 *
 * Splitting on spaces is safe in both locales: it never breaks inside a Bengali
 * conjunct, and the words still reflow and hyphenate normally.
 */
function HeroTitle({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion()

  if (reduced) return <h1 className={className}>{text}</h1>

  return (
    <h1 className={className}>
      {text.split(' ').map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <m.span
            // An explicit `animate` opts this out of the parent's variant
            // propagation, which would otherwise fade it in.
            className="inline-block"
            initial={{ y: '0.32em' }}
            animate={{ y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 24,
              mass: 0.9,
              delay: 0.06 + i * 0.045,
            }}
          >
            {word}
          </m.span>{' '}
        </Fragment>
      ))}
    </h1>
  )
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function HomeHero({ isPrecise }: { isPrecise: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')

  const emergency = useEmergency()
  const { data: counts } = useStats()
  // The strip's content, from the same resolver the coverage band reads. It is
  // seeded so the hero never paints an empty strip, and re-measured if a later
  // answer differs — see hooks/use-queries.ts.
  const { data: coverage } = useCoverage()
  const covering = coverage.covering
  const heroRef = useRef<HTMLElement>(null)

  /* -- Scroll-away parallax ------------------------------------------------
     Everything below is a transform on a MotionValue, so scrolling never
     re-renders this component and never touches a layout-triggering property.

     `depth` scales the whole effect by viewport tier. The travel distances are
     tuned against the desktop hero, which is roughly twice the height of the
     phone one; replaying them at full strength on a 360px screen would drag
     the copy noticeably up the viewport while it is still being read. The
     ratios between layers are what create the depth, so scaling them together
     preserves the effect and only changes its amplitude. */
  const isDesktop = useIsDesktop()
  const isTablet = useIsTablet()
  const depth = reduced ? 0 : isDesktop ? 1 : isTablet ? 0.62 : 0.34

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  // The backdrop's own drift now belongs to the shell's map, which parallaxes
  // its layers against the window rather than against this section — so the
  // grid transforms that used to live here are gone. What remains are the
  // hero's foreground rates, which still pull ahead of that backdrop.
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 130 * depth])
  const stripY = useTransform(scrollYProgress, [0, 1], [0, -18 * depth])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -46 * depth])
  const panelY = useTransform(scrollYProgress, [0, 1], [0, -92 * depth])

  // The hero recedes rather than leaves: it holds full strength through the
  // first two thirds of its own travel — while it is still the thing being
  // read — and only then softens. Both settle well short of invisible.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.66, 1], [1, 1, 1 - 0.15 * depth])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1 - 0.02 * depth])

  // Depth comes from the *difference* in these rates, so they are all disabled
  // together rather than individually.
  const par = (value: typeof copyY) => (reduced ? undefined : { y: value })

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
    { label: t('home.hero.stat.listings'), value: counts.total },
    { label: t('home.hero.stat.verified'), value: counts.verified },
    { label: t('home.hero.stat.roundClock'), value: counts.always },
  ]

  return (
    <section
      ref={heroRef}
      // No `isolate` and no opaque surface: both would cut the hero off from
      // the shell's map. The section is transparent and the backdrop shows
      // through around the copy and the emergency panel, which is the
      // relationship the composition depends on.
      className="relative overflow-hidden border-b border-line"
    >
      {/* ---- Background depth ------------------------------------------ */}
      {/* Three layers, three scroll rates. The grid reads as a map fragment and
          costs nothing to draw; the two washes drift on a long, unsynchronised
          loop so the pairing never visibly repeats. */}
      {/* The map used to be mounted here, private to the hero. It now lives in
          the app shell and continues behind every public page, so this section
          simply lets it through — see components/layout/app-shell.tsx. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent"
      />
      <m.div aria-hidden="true" className="absolute inset-0 -z-10" style={par(glowY)}>
        <div className="glow-primary absolute -left-40 -top-48 size-[620px] motion-safe:animate-float" />
        <div className="glow-success absolute -right-32 top-16 size-[520px] motion-safe:animate-float-alt" />
      </m.div>

      <div className="container relative py-7 sm:py-12 lg:py-16">
        {/* Asymmetric on desktop: copy and search hold the left column, the
            emergency shortcuts own the right. Explicit row/col placement at lg
            lets one DOM order serve both layouts — on a phone it reads copy,
            search, emergency, categories, stats, which puts the three call
            shortcuts above the fold on a 360x640 screen. */}
        <m.div
          variants={stage}
          initial="hidden"
          animate="show"
          className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-x-12 lg:gap-y-5"
        >
          {/* min-w-0 throughout: grid items default to min-width:auto, and a
              single unbreakable Bengali word is enough to push a track wider
              than the viewport and scroll the whole page sideways. */}
          {/* The recede (opacity + scale) is applied here rather than to the
              whole grid, for two reasons.

              Design: the emergency panel is the foreground layer and the one
              thing that must stay readable on the way out — fading it with the
              copy is the opposite of the hierarchy this hero is arguing for.

              Mechanical: an ancestor with opacity < 1 becomes a *backdrop
              root*, and a descendant's `backdrop-filter` then samples an empty
              group. With the fade on the grid, the emergency panel's glass
              visibly flattened the moment the hero began to recede. */}
          <m.div
            variants={column}
            style={
              reduced
                ? undefined
                : { y: copyY, opacity: heroOpacity, scale: heroScale, originY: 0 }
            }
            className="min-w-0 lg:col-start-1 lg:row-start-1"
          >
            <m.span
              variants={rise}
              className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-meta font-bold text-ink-muted shadow-card"
            >
              {isPrecise ? (
                // A live fix earns a live indicator; a default one does not.
                <span className="relative grid size-3.5 place-items-center" aria-hidden="true">
                  <span className="absolute size-2 rounded-full bg-primary/50 motion-safe:animate-pulse-ring" />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </span>
              ) : (
                <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              )}
              {isPrecise ? t('home.hero.locationNear') : t('home.hero.location')}
            </m.span>

            <HeroTitle
              text={t('home.hero.title')}
              className="mt-4 text-display-lg text-balance sm:mt-5"
            />

            <m.p
              variants={soften}
              className="mt-3 max-w-xl text-body text-pretty text-ink-muted sm:mt-4 sm:text-heading sm:font-normal"
            >
              {t('home.hero.sub')}
            </m.p>

            <m.div variants={lift} className="group relative mt-6 max-w-xl sm:mt-7">
              {/* Soft aura, not a shadow: it sits behind the bar and only shows
                  itself while the field has focus. */}
              <div
                aria-hidden="true"
                className="glow-primary pointer-events-none absolute -inset-6 -z-10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
              />
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={submit}
                size="lg"
                className="shadow-lift"
              />
            </m.div>
          </m.div>

          <m.div
            variants={panel}
            style={par(panelY)}
            className="relative min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3"
          >
            <div
              aria-hidden="true"
              className="glow-danger pointer-events-none absolute -inset-8 -z-10 motion-safe:animate-float-alt"
            />
            <HeroEmergency contacts={heroContacts} />
          </m.div>

          {/* Quick categories — the fastest path for someone who cannot type
              fast, so on a phone they scroll sideways rather than wrapping to
              four rows and pushing everything below them off the screen. */}
          <m.nav
            variants={column}
            aria-label={t('home.hero.chips.label')}
            className="rail rail-bleed min-w-0 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {HOME_CHIP_IDS.map((id) => (
              <m.span key={id} variants={rise} className="inline-flex">
                <CategoryChip id={id} />
              </m.span>
            ))}
          </m.nav>

          <m.p
            variants={rise}
            className="min-w-0 text-meta text-ink-subtle lg:col-start-1 lg:row-start-3"
          >
            {stats.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && (
                  <span className="px-2 text-ink-subtle/50" aria-hidden="true">
                    ·
                  </span>
                )}
                <CountUp
                  value={s.value}
                  delay={0.5 + i * 0.1}
                  className="tnum font-bold text-ink"
                />{' '}
                {s.label}
              </Fragment>
            ))}
          </m.p>
        </m.div>
      </div>

      {/* ---- Covering --------------------------------------------------- */}
      {/* The one part of the hero that keeps moving after everything has
          settled. It runs on its own clock: the entrance has finished, the
          parallax only nudges it, and the loop never stops or resets.

          It is also the first thing on the page you can put a hand on. The
          register here is editorial — one row, close spacing, a speed you can
          read a chip at, and a short leash on the momentum so a throw settles
          back into the drift within a beat. The wider, faster reading of the
          same gesture is the coverage band further down the page; this one is
          the statement, that one is the scope. */}
      <m.div
        style={par(stripY)}
        className="relative border-t border-line bg-gradient-to-r from-surface via-surface-2/60 to-surface"
      >
        <div className="container flex items-center gap-2 pb-1.5 pt-4">
          <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
          <span className="text-micro uppercase tracking-[0.14em] text-ink-subtle">
            {t('home.hero.marquee')}
          </span>
        </div>

        {/* ~70px/s: slow enough to read a chip as it passes, quick enough not
            to look stalled. The scroll boost is deliberately the smallest on
            the page — this strip sits directly under the copy, and a band that
            lurches while someone is still reading the headline above it is a
            distraction rather than depth.

            The numbers here are the *only* thing that distinguishes this band
            from the coverage band further down. Both run the same engine over
            the same kind of array; this one is configured editorial, that one
            energetic. Neither knows how many items it holds. */}
        <InfiniteBand glide={0.5} handover={0.42} scrollBoost={44}>
          <InfiniteHorizontalTrack
            items={covering}
            speed={70}
            gap="0.6rem"
            className="pb-4 pt-1"
            renderItem={(id: CategoryId) => <CategoryChip id={id} size="sm" tabIndex={-1} />}
          />
        </InfiniteBand>
      </m.div>
    </section>
  )
}
