import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Building2,
  ExternalLink,
  Home,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  Moon,
  Siren,
  Stethoscope,
  Sun,
  X,
} from 'lucide-react'

import { ToastProvider } from '@/components/admin/toast'
import { useAdminAuth } from '@/lib/auth'
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

/**
 * Only sections backed by a real table appear.
 *
 * This Supabase project contains `public.listings` and nothing else, so the
 * per-entity screens (facilities, doctors, businesses, rentals, emergency
 * contacts, homepage bands) have nothing to read or write. Their routes are
 * still registered in App.tsx — the code is intact and works against a project
 * that has those tables — but they are kept out of the sidebar, because a nav
 * item that always errors trains the person using it to distrust the whole
 * navigation.
 */
const NAV: { heading: string; items: { to: string; label: string; icon: typeof Home }[] }[] = [
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

export function AdminShell() {
  const { profile, signOut } = useAdminAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [open, setOpen] = useState(false)

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
                  // four entries that share /admin/listings would all light up
                  // at once. The section is what distinguishes them, so it is
                  // what gets compared.
                  const [path, query = ''] = item.to.split('?')
                  const itemSection = new URLSearchParams(query).get('section') ?? ''
                  const currentSection = new URLSearchParams(location.search).get('section') ?? ''
                  const active =
                    path === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname === path && currentSection === itemSection

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
                        {item.label}
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
              {profile?.display_name ?? profile?.email ?? 'Signed in'}
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
