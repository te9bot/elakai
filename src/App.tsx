import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion'

import { AppShell } from '@/components/layout/app-shell'
import { AccountProvider } from '@/lib/auth'
import { LanguageProvider } from '@/lib/i18n'
import { useMotionAttribute } from '@/lib/motion'
import { ThemeProvider } from '@/lib/theme'
import { RequireAdmin } from '@/components/admin/require-admin'
import { RequireAccount } from '@/components/account/require-account'
import { ContributeGateProvider } from '@/components/account/contribute-gate'
import { RouteFallback } from '@/components/route-fallback'

// The home page is eager: it is `/`, it is what the logo intro dissolves into,
// and waiting on a chunk before that reveal can start is exactly the delay the
// sequence is designed not to have. Every other route splits so the first paint
// stays small on a budget device.
import { HomePage } from '@/pages/home'

const SearchPage = lazy(() => import('@/pages/search'))
const BusinessPage = lazy(() => import('@/pages/business'))
const ListingPage = lazy(() => import('@/pages/listing'))
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
const AdminListingsPage = lazy(() => import('@/pages/admin/listings'))
const AdminListingEditPage = lazy(() => import('@/pages/admin/listing-edit'))
const AdminSubmissionsPage = lazy(() => import('@/pages/admin/submissions'))
const AdminSubmissionReviewPage = lazy(() => import('@/pages/admin/submission-review'))
const AdminContributorsPage = lazy(() => import('@/pages/admin/contributors'))

// The contributor screens are lazy for the same reason: a visitor looking up a
// pharmacy has no use for a submission form, and the whole point of §2 is that
// they are never asked to have one.
const AccountLoginPage = lazy(() => import('@/pages/account/login'))
const AccountSignupPage = lazy(() => import('@/pages/account/signup'))
const AccountCallbackPage = lazy(() => import('@/pages/account/callback'))

const ContributeShell = lazy(() =>
  import('@/components/contribute/contribute-shell').then((m) => ({ default: m.ContributeShell })),
)
const ContributeOverviewPage = lazy(() => import('@/pages/contribute/overview'))
const ContributeSubmissionsPage = lazy(() => import('@/pages/contribute/submissions'))
const ContributeSubmissionDetailPage = lazy(
  () => import('@/pages/contribute/submission-detail'),
)
const ContributeSubmitPage = lazy(() => import('@/pages/contribute/submit'))
const ContributePointsPage = lazy(() => import('@/pages/contribute/points'))
const ContributeProfilePage = lazy(() => import('@/pages/contribute/profile'))

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
      // The gate provider wraps the public shell rather than the whole router,
      // because it renders a dialog and a dialog belongs to the pages that can
      // open it. The auth screens and the admin panel have no Contribute button.
      element: (
        <ContributeGateProvider>
          <AppShell />
        </ContributeGateProvider>
      ),
      children: [
        // The one home page, at the root. It is not wrapped in `lazyRoute`
        // because it is not lazy — see the import above.
        { index: true, element: <HomePage /> },
        // Kept for links that predate the move to `/`, including any installed
        // copy of the PWA whose start_url still points here.
        { path: '/home', element: <Navigate to="/" replace /> },
        { path: '/search', element: lazyRoute(SearchPage) },
        { path: '/business/:slug', element: lazyRoute(BusinessPage) },
        // Admin-published content from `public.listings`. Keyed by the row's
        // primary key rather than a slug: it is the identifier the admin panel
        // already shows and the cards already hold, so there is no second
        // identifier to keep in step with it.
        { path: '/listing/:id', element: lazyRoute(ListingPage) },
        { path: '/emergency', element: lazyRoute(EmergencyPage) },
        { path: '/healthcare', element: lazyRoute(HealthcarePage) },
        // The healthcare directory has its own record shape and profile layout,
        // so it does not route through /business/:slug.
        { path: '/healthcare/:slug', element: lazyRoute(HealthProfilePage) },
        { path: '/services', element: lazyRoute(ServicesPage) },
        { path: '/rentals', element: lazyRoute(RentalsPage) },

        // The contributor dashboard lives inside the public shell — same
        // header, same footer, same district map behind it — because §12 asks
        // for a section of ELAKAI rather than a second application that
        // happens to share a logo.
        //
        // RequireAccount wraps only this subtree. No public route is behind it,
        // which is the whole of §2: a visitor can read everything here without
        // an account, and is asked for one only when they try to write.
        {
          path: '/contribute',
          element: (
            <RequireAccount>
              <Suspense fallback={<RouteFallback />}>
                <ContributeShell />
              </Suspense>
            </RequireAccount>
          ),
          children: [
            { index: true, element: lazyRoute(ContributeOverviewPage) },
            { path: 'submissions', element: lazyRoute(ContributeSubmissionsPage) },
            { path: 'submissions/:id', element: lazyRoute(ContributeSubmissionDetailPage) },
            { path: 'submit', element: lazyRoute(ContributeSubmitPage) },
            { path: 'points', element: lazyRoute(ContributePointsPage) },
            { path: 'profile', element: lazyRoute(ContributeProfilePage) },
            { path: '*', element: lazyRoute(NotFoundPage) },
          ],
        },

        { path: '*', element: lazyRoute(NotFoundPage) },
      ],
    },

    // Outside AppShell: the auth screens are full-bleed by design, and the
    // site header offering a Contribute button on the page that exists to sign
    // someone in so they can contribute is a loop.
    { path: '/account/login', element: lazyRoute(AccountLoginPage) },
    { path: '/account/signup', element: lazyRoute(AccountSignupPage) },
    // Where the confirmation link in the signup email lands. This path must be
    // listed under Authentication -> URL Configuration -> Redirect URLs in the
    // Supabase dashboard, or the link falls back to the Site URL and the
    // visitor's original intent is lost. See supabase/CONTRIBUTORS.md.
    { path: '/account/callback', element: lazyRoute(AccountCallbackPage) },
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

        // `public.listings` is the one table this project has, and every part
        // of the public site now reads it. One screen edits all of it, filtered
        // by section — see components/admin/admin-shell.tsx.
        //
        // There were twelve further routes here (facilities, doctors,
        // businesses, rentals, emergency contacts, coverage bands), each a
        // full list-and-form screen against a table this project does not have
        // and, now that the directory lives in `listings`, never will. They
        // were unreachable from the sidebar but reachable by URL, where every
        // one of them errored. Removed with their screens.
        { path: 'listings', element: lazyRoute(AdminListingsPage) },
        // Addressable editor, keyed on `public.listings.id`. `new` is not a
        // route here: creating has no id to address, so it stays the inline
        // form on the screen above.
        { path: 'listings/:id/edit', element: lazyRoute(AdminListingEditPage) },

        // Moderation. These are registered unconditionally even though the
        // sidebar hides them until migration 0008 is applied: a bookmarked
        // review URL should reach a screen that explains itself, not the
        // 404 that an unregistered route would give.
        { path: 'submissions', element: lazyRoute(AdminSubmissionsPage) },
        { path: 'submissions/:id', element: lazyRoute(AdminSubmissionReviewPage) },
        { path: 'contributors', element: lazyRoute(AdminContributorsPage) },

        // Anything else under /admin is a mistyped or stale URL, not a screen.
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
  // Publishes the resolved motion preference to `<html data-motion>`, which is
  // what the `motion-safe:` utilities and `scroll-behavior` key off. Without it
  // the setting would only reach the JavaScript half of the site.
  useMotionAttribute()

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          {/* domAnimation only — drops roughly 25kb versus the full feature set. */}
          <LazyMotion features={domAnimation} strict>
            {/* Framer's own reduced-motion handling, matching the rest of the
                site. This was pinned to `never` while ELAKAI played its motion
                for everyone; the site owner has since asked for the OS
                preference to be respected, so framer follows it too and the
                three places that decide this — here, src/lib/motion.ts and the
                Tailwind variants — agree again. */}
            <MotionConfig reducedMotion="user">
              {/* Wraps the router so the guards, the auth screens, the
                  contributor dashboard and the admin panel all share one
                  session; it resolves to 'unconfigured' and costs nothing when
                  no backend is set. A logged-out visitor resolves to 'guest',
                  which is the state the entire public site is designed for. */}
              <AccountProvider>
                {/* startTransition keeps route-chunk loading from blocking input
                    on a slow device, which matters more here than usual. */}
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
              </AccountProvider>
            </MotionConfig>
          </LazyMotion>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
