import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { TopNav } from './top-nav'
import { BottomNav } from './bottom-nav'
import { Footer } from './footer'
import { KushtiaMap } from '@/components/home/kushtia-map'
import { LogoIntro } from '@/components/brand/logo-intro'
import { useI18n } from '@/lib/i18n'

/*
 * THERE IS NO SMOOTH-SCROLL ENGINE HERE, AND THAT IS THE FIX
 *
 * A Lenis integration sat at this spot briefly. It was removed after testing it
 * with an actual mouse wheel, and the reasoning is worth keeping so nobody
 * reaches for it again on the same reasoning.
 *
 * Lenis makes scrolling smooth by taking it over: it calls `preventDefault()`
 * on the wheel event and then interpolates the page toward where the wheel
 * asked it to go. On a trackpad, whose events are already small and continuous,
 * that is close to invisible and feels lovely. A mouse wheel is the opposite —
 * a few large discrete notches — and interpolating between them means every
 * notch is a short animation the user watches instead of a movement they make.
 * The page stops feeling connected to the hand turning the wheel, and it reads
 * as exactly the sticking-at-each-section lag it was added to cure.
 *
 * The real cause of the stutter was never the scroll. It was the map backdrop
 * re-rendering ~100 SVG elements through React on every scroll event, a forced
 * synchronous layout in a `mousemove` handler, and seven CSS transitions
 * restarting continuously — all of which are fixed in
 * components/home/kushtia-map.tsx and lib/scroll.ts. With those gone the
 * browser's own scroll runs at a steady frame time with nothing dropped, and
 * the browser's own scroll has zero input latency by construction, which is
 * something no interpolation layer can improve on.
 *
 * So: native scroll, and the work goes into making sure nothing blocks the
 * frame. If smoothness ever needs revisiting, profile first — and test with a
 * real mouse wheel, not a trackpad.
 */

export function AppShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  // Move focus to the top of the document on navigation so screen-reader and
  // keyboard users are not left deep in the previous page's tab order.
  useEffect(() => {
    const main = document.getElementById('main')
    main?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* The district, behind the whole public site.

          Fixed rather than scrolled, and mounted once here rather than per
          page: the same backdrop continues behind the hero, healthcare,
          emergency, services, rentals, search and the footer, so moving
          between them feels like moving across one place rather than swapping
          wallpapers. Its layers still respond to scroll — see the parallax in
          kushtia-map.tsx — so it reads as depth rather than as a static image.

          `-z-10` puts it behind every content block. Cards and panels keep
          their own opaque surfaces and sit on top; the map shows through the
          gaps between them, which is the composition being aimed at. */}
      <KushtiaMap className="fixed inset-0 -z-10 h-dvh w-full" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-3 focus:text-body-sm focus:font-bold focus:text-white focus:shadow-lift"
      >
        {t('a11y.skip')}
      </a>

      <TopNav />

      <main
        id="main"
        tabIndex={-1}
        // Clears the fixed bottom nav on mobile; removed once it hides at lg.
        className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] outline-none lg:pb-0"
      >
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
      <ScrollRestoration />

      {/* Last in the tree and fixed on top, so the page above it is fully
          rendered underneath while it plays. It removes itself when done, and
          only ever plays once a session. */}
      <LogoIntro />
    </div>
  )
}
