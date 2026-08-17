import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { TopNav } from './top-nav'
import { BottomNav } from './bottom-nav'
import { Footer } from './footer'
import { KushtiaMap } from '@/components/home/kushtia-map'
import { LogoIntro } from '@/components/brand/logo-intro'
import { useI18n } from '@/lib/i18n'
import { useSmoothScroll } from '@/lib/smooth-scroll'

export function AppShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  /*
   * The scroll engine, on the public site only.
   *
   * Deliberately here rather than in App.tsx. The admin panel is a tool — an
   * editor reaching for row 90 of a table wants the scroll their OS gives them,
   * not an eased one — and the auth screens are single cards that do not scroll.
   * Both render outside this shell, so both keep native scrolling.
   *
   * A no-op under reduced motion, and it never touches touch input. Every
   * number in it is justified in lib/smooth-scroll.ts; the one that matters
   * most is `wheelMultiplier`, which is what stops interpolation costing
   * travel per wheel notch.
   */
  useSmoothScroll()

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
