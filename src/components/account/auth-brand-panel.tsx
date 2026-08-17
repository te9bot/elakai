import { KushtiaMap } from '@/components/home/kushtia-map'
import logo from '../../../assets/elakai-logo.png'

/* ==========================================================================
 * The left half of the contributor entrance.
 *
 * WHAT THIS REPLACES
 *
 * Two things, in two passes.
 *
 * First a dialog. Pressing Contribute used to open a small glass modal over
 * whatever you were reading. That made the contributor side of ELAKAI feel
 * like an interruption to the site rather than a part of it — see
 * components/account/contribute-gate.tsx for the full argument.
 *
 * Then a large animated rendering of the logo mark, which filled this panel
 * with the five parallax planes. It was handsome and it was still a decoration:
 * a logo shown at 22rem says the brand's name, and this panel had the room to
 * say what the brand *is*.
 *
 * WHY THE REAL MAP, AND NOT A MAP
 *
 * ELAKAI is a directory of one district, and the district is drawn from real
 * coordinates: `KushtiaMap` projects the same `AREA_MAP` values the distance
 * sort uses, so Daulatpur and Khoksa sit where they actually are. That backdrop
 * is behind every public page already. Putting the same component here — the
 * same component, not a copy of its look — is what makes signing in read as
 * staying inside ELAKAI rather than arriving at its login server.
 *
 * It also means this panel can never fall out of step with the site. Recolour
 * the map, correct a coordinate, add an upazila, and this changes with it,
 * because there is only one map.
 *
 * MOTION AND THEME COME FROM THE MAP, NOT FROM HERE
 *
 * `variant="panel"` swaps the map's motion driver from pointer-and-scroll —
 * neither of which exists on this page — to a continuous multi-period drift,
 * and lifts its readability veil because nothing is set over the map on this
 * side. Light and dark are the map's own `dark:` classes, so this panel follows
 * the site's theme switch with nothing to wire up and no second theme system.
 *
 * Reduced motion is handled the same way: the map asks `lib/motion.ts`, the
 * site's single answer, and simply does not start its loop.
 *
 * WHAT IT MAY NOT DO
 *
 * No scroll listener, no wheel handler, no second scroll engine. The map's
 * drift loop is an animation and nothing else — it never moves the document.
 * This page renders outside AppShell and therefore outside the scroll engine
 * entirely, so nothing here can reach lib/smooth-scroll.ts even by accident.
 * ========================================================================== */

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-canvas lg:block">
      {/*
       * The map, full bleed. `absolute inset-0` rather than a sized box: the
       * brief is that it occupies the panel rather than sitting in it, and the
       * svg's own `slice` crops it to whatever shape the column ends up.
       */}
      <KushtiaMap variant="panel" className="absolute inset-0 size-full" />

      {/*
       * A scrim under the type, bottom-heavy.
       *
       * The map's veil is deliberately light in this variant, which is right
       * for the map and leaves the lower-left too busy for a wordmark to sit
       * on. This puts calm ground under the text only, so the district stays
       * legible everywhere else. Canvas-coloured, so it follows the theme.
       */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-canvas via-canvas/70 to-transparent"
      />

      <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
        {/* Small, and top-left where a product mark belongs — the map is the
            subject now, and the lockup only has to say whose map it is. */}
        {/* `self-start` matters: this is a flex column, whose default
            `align-items: stretch` widens the image box to the full panel and
            leaves `object-contain` centring the lockup inside it. Without it
            the mark floats in the middle of the map rather than sitting in the
            corner. */}
        <img
          src={logo}
          alt="ELAKAI"
          width={512}
          height={471}
          className="h-11 w-auto self-start object-contain"
        />

        <div>
          <p className="text-[2rem] font-extrabold leading-none tracking-tight text-ink xl:text-[2.5rem]">
            Contribute to ELAKAI
          </p>
          <p className="mt-3 max-w-[30ch] text-body-sm leading-relaxed text-ink-muted">
            Kushtia&rsquo;s local directory, kept accurate by the people who
            live here.
          </p>

          {/*
           * The one sentence of substance on this half. It is here because it
           * is what a person weighing up an account actually needs to know,
           * and saying it beside the form is more honest than saying it after
           * they have signed up.
           */}
          <p className="mt-8 max-w-[38ch] text-meta leading-relaxed text-ink-subtle">
            Everything contributors send is checked by an ELAKAI administrator
            before it appears on the site. Approved information earns 50 points.
          </p>
        </div>
      </div>

      {/* The seam. A hairline rather than a raw colour change where the two
          halves meet. */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-line" />
    </div>
  )
}
