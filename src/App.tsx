import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion'

import { AppShell } from '@/components/layout/app-shell'
import { AdminAuthProvider } from '@/lib/auth'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { RequireAdmin } from '@/components/admin/require-admin'
import { RouteFallback } from '@/components/route-fallback'

// The home page is eager: it is `/`, it is what the logo intro dissolves into,
// and waiting on a chunk before that reveal can start is exactly the delay the
// sequence is designed not to have. Every other route splits so the first paint
// stays small on a budget device.
import { HomePage } from '@/pages/home'

const SearchPage = lazy(() => import('@/pages/search'))
const BusinessPage = lazy(() => import('@/pages/business'))
const EmergencyPage = lazy(() => import('@/pages/emergency'))
const HealthcarePage = lazy(() => import('@/pages/healthcare'))
const HealthProfilePage = lazy(() => import('@/pages/health-profile'))
const ServicesPage = lazy(() => import('@/pages/services'))
const RentalsPage = lazy(() => import('@/pages/rentals'))
const NotFoundPage = lazy(() => import('@/pages/not-found'))

// The admin panel is lazy for a reason beyond code splitting: none of it —
// shell, forms, tables — should land in the bundle a member of the public
// downloads to look up an ambulance number.
const AdminShell = lazy(() =>
  import('@/components/admin/admin-shell').then((m) => ({ default: m.AdminShell })),
)
const AdminLoginPage = lazy(() => import('@/pages/admin/login'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard'))

// All CRUD screens share one chunk — see src/pages/admin/crud.tsx.
const crud = () => import('@/pages/admin/crud')
const adminPage = (key: keyof Awaited<ReturnType<typeof crud>>) =>
  lazy(() => crud().then((m) => ({ default: m[key] })))

const FacilitiesListPage = adminPage('FacilitiesListPage')
const FacilityFormPage = adminPage('FacilityFormPage')
const DoctorsListPage = adminPage('DoctorsListPage')
const DoctorFormPage = adminPage('DoctorFormPage')
const BusinessesListPage = adminPage('BusinessesListPage')
const BusinessFormPage = adminPage('BusinessFormPage')
const RentalsListPage = adminPage('RentalsListPage')
const RentalFormPage = adminPage('RentalFormPage')
const EmergencyListPage = adminPage('EmergencyListPage')
const EmergencyFormPage = adminPage('EmergencyFormPage')
const CoverageListPage = adminPage('CoverageListPage')
const CoverageFormPage = adminPage('CoverageFormPage')

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
        // The one home page, at the root. It is not wrapped in `lazyRoute`
        // because it is not lazy — see the import above.
        { index: true, element: <HomePage /> },
        // Kept for links that predate the move to `/`, including any installed
        // copy of the PWA whose start_url still points here.
        { path: '/home', element: <Navigate to="/" replace /> },
        { path: '/search', element: lazyRoute(SearchPage) },
        { path: '/business/:slug', element: lazyRoute(BusinessPage) },
        { path: '/emergency', element: lazyRoute(EmergencyPage) },
        { path: '/healthcare', element: lazyRoute(HealthcarePage) },
        // The healthcare directory has its own record shape and profile layout,
        // so it does not route through /business/:slug.
        { path: '/healthcare/:slug', element: lazyRoute(HealthProfilePage) },
        { path: '/services', element: lazyRoute(ServicesPage) },
        { path: '/rentals', element: lazyRoute(RentalsPage) },
        { path: '*', element: lazyRoute(NotFoundPage) },
      ],
    },
    // Outside AppShell: the admin panel has its own chrome, and the public
    // header, bottom nav and footer have no business on it.
    { path: '/admin/login', element: lazyRoute(AdminLoginPage) },
    {
      path: '/admin',
      element: (
        <Suspense fallback={<RouteFallback />}>
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        </Suspense>
      ),
      children: [
        { index: true, element: lazyRoute(AdminDashboardPage) },

        { path: 'facilities', element: lazyRoute(FacilitiesListPage) },
        // `new` before `:id` so the literal wins the match.
        { path: 'facilities/new', element: lazyRoute(FacilityFormPage) },
        { path: 'facilities/:id', element: lazyRoute(FacilityFormPage) },

        { path: 'doctors', element: lazyRoute(DoctorsListPage) },
        { path: 'doctors/new', element: lazyRoute(DoctorFormPage) },
        { path: 'doctors/:id', element: lazyRoute(DoctorFormPage) },

        { path: 'businesses', element: lazyRoute(BusinessesListPage) },
        { path: 'businesses/new', element: lazyRoute(BusinessFormPage) },
        { path: 'businesses/:id', element: lazyRoute(BusinessFormPage) },

        { path: 'rentals', element: lazyRoute(RentalsListPage) },
        { path: 'rentals/new', element: lazyRoute(RentalFormPage) },
        { path: 'rentals/:id', element: lazyRoute(RentalFormPage) },

        { path: 'emergency', element: lazyRoute(EmergencyListPage) },
        { path: 'emergency/new', element: lazyRoute(EmergencyFormPage) },
        { path: 'emergency/:id', element: lazyRoute(EmergencyFormPage) },

        { path: 'coverage', element: lazyRoute(CoverageListPage) },
        { path: 'coverage/new', element: lazyRoute(CoverageFormPage) },
        { path: 'coverage/:id', element: lazyRoute(CoverageFormPage) },
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
            {/* Framer's own reduced-motion handling, pinned to match the rest of
                the site. `never` is already its default, so this is a statement
                rather than a fix: it means a future framer-motion that changes
                that default cannot quietly reintroduce a half-reduced page.
                See src/lib/motion.ts for the decision this belongs to. */}
            <MotionConfig reducedMotion="never">
              {/* Wraps the router so the guard and the login screen share one
                  session; it resolves to 'unconfigured' and costs nothing when
                  no backend is set. */}
              <AdminAuthProvider>
                {/* startTransition keeps route-chunk loading from blocking input
                    on a slow device, which matters more here than usual. */}
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
              </AdminAuthProvider>
            </MotionConfig>
          </LazyMotion>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
