import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  Moon,
  Siren,
  Stethoscope,
  Sun,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { ToastProvider } from '@/components/admin/toast'
import { useAccount } from '@/lib/auth'
import { adminSubmissionCounts } from '@/lib/submissions'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/* ==========================================================================
 * Admin chrome.
 *
 * Built from the same tokens as the public site — canvas, surface, line, ink,
 * primary — so the two halves read as one product rather than as a website and
 * a bolted-on control panel. Dark mode comes from the same `.dark` class and
 * therefore needs no separate palette here.
 *
 * Only implemented sections appear. A sidebar advertising screens that do not
 * exist yet trains the person using it to distrust the navigation.
 * ========================================================================== */

type NavItem = {
  to: string
  label: string
  icon: typeof Home
  /** Renders the pending-submission count beside the label. */
  badge?: 'pending'
}

/**
 * Only sections backed by a real table appear.
 *
 * This Supabase project contains `public.listings` and, once migration 0008 is
 * applied, the four contributor tables. The per-entity screens that never
 * existed here (facilities, doctors, businesses, rentals, emergency contacts,
 * homepage bands) are still kept out of the sidebar, because a nav item that
 * always errors trains the person using it to distrust the whole navigation.
 *
 * The Moderation group follows the same rule: it is hidden entirely until the
 * contributor schema is present, rather than shown and broken.
 */
const CONTENT_NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Content',
    items: [
      { to: '/admin/listings', label: 'All listings', icon: LayoutList },
      // Sections of the same screen rather than screens of their own. They are
      // one table, so a separate editor per section would be the same form
      // three times over — and these links are real filtered views, not the
      // placeholder nav entries this file warns against.
      { to: '/admin/listings?section=healthcare', label: 'Healthcare', icon: Stethoscope },
      { to: '/admin/listings?section=emergency', label: 'Emergency', icon: Siren },
      { to: '/admin/listings?section=rentals', label: 'Rentals', icon: Building2 },
    ],
  },
]

const MODERATION_NAV: { heading: string; items: NavItem[] } = {
  heading: 'Moderation',
  items: [
    { to: '/admin/submissions', label: 'Pending review', icon: Inbox, badge: 'pending' },
    { to: '/admin/submissions?queue=approved', label: 'Approved', icon: CheckCircle2 },
    { to: '/admin/submissions?queue=rejected', label: 'Rejected', icon: XCircle },
    { to: '/admin/contributors', label: 'Contributors', icon: Users },
  ],
}

export function AdminShell() {
  const { profile, signOut, schemaReady } = useAccount()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  /*
   * The pending count, in the sidebar.
   *
   * The single most useful number in the panel — "is there anything waiting for
   * me" — and putting it on the nav item means it is answered on every screen
   * rather than only after navigating to the queue. Refetched on an interval
   * because submissions arrive while the tab is open and a stale zero is worse
   * than no badge at all.
   */
  const pending = useQuery({
    queryKey: ['admin', 'submission-counts'],
    queryFn: adminSubmissionCounts,
    enabled: schemaReady,
    refetchInterval: 60_000,
  })

  const NAV = schemaReady ? [...CONTENT_NAV, MODERATION_NAV] : CONTENT_NAV
  const pendingCount = pending.data?.pending ?? 0

  // A drawer that survives navigation traps the person behind it on a phone.
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-canvas">
      {/* ---- Sidebar ---- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-surface',
          'transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0 shadow-lift' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-line px-4">
          <img
            src={logo}
            alt="ELAKAI"
            width={512}
            height={471}
            className="h-10 w-auto object-contain"
          />
          <span className="text-micro uppercase text-ink-subtle">Admin</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-2 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.heading} className="mb-5">
              <h2 className="px-2 pb-2 text-micro uppercase text-ink-subtle">{group.heading}</h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  // NavLink's own `isActive` compares pathnames only, so the
                  // entries that share /admin/listings — and the three that
                  // share /admin/submissions — would all light up at once. The
                  // distinguishing query parameter is what gets compared.
                  const [path, query = ''] = item.to.split('?')
                  const itemParams = new URLSearchParams(query)
                  const current = new URLSearchParams(location.search)
                  const sameParam = (key: string) =>
                    (itemParams.get(key) ?? '') === (current.get(key) ?? '')

                  const active =
                    path === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname === path && sameParam('section') && sameParam('queue')

                  const showBadge = item.badge === 'pending' && pendingCount > 0

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={cn(
                          'flex items-center gap-3 rounded-control px-2.5 py-2.5 text-body-sm font-semibold',
                          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          active
                            ? 'bg-primary-soft text-primary-ink'
                            : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                        )}
                      >
                        <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {showBadge && (
                          <span
                            className="tnum shrink-0 rounded-pill bg-primary px-2 py-0.5 text-micro font-bold text-white"
                            // Read as "3 waiting", not as a bare number floating
                            // beside a link.
                            aria-label={`${pendingCount} waiting for review`}
                          >
                            {pendingCount}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 min-w-0 px-2">
            <p className="truncate text-body-sm font-bold">
              {profile?.fullName ?? profile?.email ?? 'Signed in'}
            </p>
            <p className="truncate text-meta capitalize text-ink-subtle">{profile?.role}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-control px-2.5 py-2.5 text-body-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Scrim sits below the drawer but above the page. */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
        />
      )}

      {/* ---- Content ---- */}
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-control text-ink-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href="/elakai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-body-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">View site</span>
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid size-10 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        </div>
      </div>
    </ToastProvider>
  )
}
