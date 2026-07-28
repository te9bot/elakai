import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion } from 'framer-motion'

import { AppShell } from '@/components/layout/app-shell'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { RouteFallback } from '@/components/route-fallback'

// Home is eager — it is the entry point for nearly every session. Everything
// else is split so the first paint stays small on a budget device.
import { HomePage } from '@/pages/home'

const SearchPage = lazy(() => import('@/pages/search'))
const BusinessPage = lazy(() => import('@/pages/business'))
const EmergencyPage = lazy(() => import('@/pages/emergency'))
const HealthcarePage = lazy(() => import('@/pages/healthcare'))
const ServicesPage = lazy(() => import('@/pages/services'))
const RentalsPage = lazy(() => import('@/pages/rentals'))
const NotFoundPage = lazy(() => import('@/pages/not-found'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 10 * 60 * 1000,
    },
  },
})

function lazyRoute(Component: React.ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/search', element: lazyRoute(SearchPage) },
        { path: '/business/:slug', element: lazyRoute(BusinessPage) },
        { path: '/emergency', element: lazyRoute(EmergencyPage) },
        { path: '/healthcare', element: lazyRoute(HealthcarePage) },
        { path: '/services', element: lazyRoute(ServicesPage) },
        { path: '/rentals', element: lazyRoute(RentalsPage) },
        { path: '*', element: lazyRoute(NotFoundPage) },
      ],
    },
  ],
  {
    // GitHub Pages serves this as a project site, so every route lives under
    // the repo name. Kept in sync with `base` in vite.config.ts.
    basename: '/elakai',
    // Opt in to the v7 behaviours now so the upgrade is a version bump only.
    // Note: v7_startTransition is a RouterProvider prop in v6, not a router
    // option — it is set below.
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          {/* domAnimation only — drops roughly 25kb versus the full feature set. */}
          <LazyMotion features={domAnimation} strict>
            {/* startTransition keeps route-chunk loading from blocking input
                on a slow device, which matters more here than usual. */}
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </LazyMotion>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
