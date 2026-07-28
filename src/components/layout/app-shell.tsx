import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { TopNav } from './top-nav'
import { BottomNav } from './bottom-nav'
import { Footer } from './footer'
import { useI18n } from '@/lib/i18n'

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
    <div className="flex min-h-dvh flex-col">
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
    </div>
  )
}
