import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Languages, Moon, Plus, Search, Sun, UserRound } from 'lucide-react'
import { Logo } from './logo'
import { SearchBar } from '@/components/search/search-bar'
import { useContribute } from '@/components/account/contribute-gate'
import { useAccount } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { onScrollFrame } from '@/lib/scroll'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/emergency', key: 'nav.emergency' },
  { to: '/healthcare', key: 'nav.healthcare' },
  { to: '/services', key: 'nav.services' },
  { to: '/rentals', key: 'nav.rentals' },
] as const

/**
 * Frosts on scroll — one of only two places glassmorphism is used, because
 * here it genuinely helps content read as passing *under* a fixed surface.
 */
export function TopNav() {
  const { t, locale, toggleLocale } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const { status } = useAccount()
  const { contribute } = useContribute()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  /*
   * The header frosts once, at 8px, and then never changes again for the rest
   * of the page — but the naive version of this asks React about it on every
   * scroll event for the whole session.
   *
   * `setScrolled(window.scrollY > 8)` looks free because React bails out when
   * the value is unchanged. It is not free: React still re-enters this
   * component to discover that, and this component renders the lockup, five
   * NavLinks, the search field and four controls. Comparing against a ref first
   * means the state setter is called twice in a page's life — once crossing
   * down, once crossing back — instead of on every wheel tick.
   */
  const wasScrolled = useRef(false)

  useEffect(
    () =>
      // Through the shared loop rather than its own listener — see lib/scroll.ts.
      onScrollFrame((scrollY) => {
        const next = scrollY > 8
        if (next === wasScrolled.current) return
        wasScrolled.current = next
        setScrolled(next)
      }),
    [],
  )

  const onSearchPage = location.pathname === '/search'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200',
        scrolled ? 'glass border-line shadow-card' : 'border-transparent bg-canvas',
      )}
    >
      <div className="container flex h-16 items-center gap-3 md:h-[72px]">
        <Link
          to="/"
          className="shrink-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* The lockup's own alt text is the link's accessible name. */}
          <Logo className="h-11 md:h-[52px]" />
        </Link>

        {/*
         * `lg:flex`, not `md:flex`.
         *
         * These links used to appear at 768px, and between there and 1024px the
         * row could not hold them. Measured at 820px: logo, five links, the
         * search icon, the language and theme buttons and the Contribute call
         * to action came to 908px inside 762px of content, so the header ran
         * past the viewport and took the whole page's horizontal scrollbar with
         * it — on every route, since this is the shell.
         *
         * Raising the breakpoint also settles a disagreement rather than just
         * moving a number. `BottomNav` is `lg:hidden` and the app shell's
         * bottom padding clears at `lg`, so below 1024px navigation is supposed
         * to live in the bottom bar. At `md` these links were a second copy of
         * it, competing for a row that had no space for them. Now all three
         * agree: bottom bar below `lg`, header at `lg` and up.
         *
         * The search field gives way at `xl` for the same class of reason — see
         * the note further down.
         */}
        <nav
          aria-label={t('nav.primary')}
          className="ml-4 hidden items-center gap-1 lg:flex"
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative rounded-control px-3.5 py-2 text-body-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive ? 'text-primary' : 'text-ink-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(l.key)}
                  {isActive && (
                    <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/*
           * On a wide desktop the search bar lives in the header; below that it
           * collapses to an icon and search is a page element.
           *
           * The breakpoint is `xl`, not `lg`. Between 1024px and 1280px the row
           * has to hold the lockup, five nav links, a 256px search field, two
           * icon buttons and the Contribute call to action, and it does not:
           * the button was pushed off the right edge and the header scrolled
           * sideways. The search field is the widest thing in that row and the
           * one with an equivalent one-tap affordance already built, so it is
           * the thing that gives way.
           */}
          {!onSearchPage && (
            <div className="hidden w-64 xl:block xl:w-72">
              <SearchBar
                asButton
                value=""
                onChange={() => {}}
                onButtonClick={() => navigate('/search')}
                placeholder={t('search.placeholderShort')}
              />
            </div>
          )}

          {/*
           * Only in the 1024–1280px band, which is the one place nothing else
           * offers search.
           *
           * It used to be `xl:hidden`, so it appeared everywhere below 1280px —
           * including every phone, where BottomNav already carries a Search tab
           * as one of its five items. That put the same destination in the top
           * bar and the bottom bar of every mobile screen, and the top one was
           * the less reachable of the two. Below `lg` the tab bar has it; from
           * `xl` up the inline field above has it; between the two, this does.
           */}
          {!onSearchPage && (
            <Link
              to="/search"
              aria-label={t('nav.search')}
              className={cn(
                'hidden size-11 place-items-center rounded-full text-ink-muted lg:grid xl:hidden',
                'transition-colors hover:bg-surface-2 hover:text-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <Search className="size-5" />
            </Link>
          )}

          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t('a11y.toggleLang')}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-body-sm font-bold text-ink-muted',
              'transition-colors hover:bg-surface-2 hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <Languages className="size-[18px]" aria-hidden="true" />
            <span>{locale === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('a11y.toggleTheme')}
            className={cn(
              'grid size-11 place-items-center rounded-full text-ink-muted',
              'transition-colors hover:bg-surface-2 hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {/*
           * The one place the site ever asks for an account, and it asks by
           * offering something rather than by demanding something: signed out
           * it is "Contribute", not "Sign in". Pressing it opens the gate
           * dialog, which has Continue browsing as a first-class third option.
           *
           * Signed in it becomes the way back to the dashboard. Deliberately
           * not a dropdown with a sign-out item in it — signing out lives on
           * the dashboard, where the person can see what they are leaving,
           * and a menu here would be one more thing between a visitor and an
           * ambulance number.
           *
           * Never rendered while the session is still resolving, so it cannot
           * flash "Contribute" at somebody who is already signed in.
           */}
          {status === 'loading' ? (
            <span className="size-11" aria-hidden="true" />
          ) : status === 'guest' || status === 'unconfigured' ? (
            <button
              type="button"
              onClick={() => contribute()}
              className={cn(
                'ml-1 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-body-sm font-semibold text-white shadow-card',
                'transition-colors hover:bg-primary-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              )}
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              <span className="hidden sm:inline">{t('nav.contribute')}</span>
            </button>
          ) : (
            <Link
              to="/contribute"
              aria-label={t('nav.myAccount')}
              className={cn(
                'ml-1 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-body-sm font-semibold text-ink shadow-card',
                'transition-colors hover:bg-surface-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <UserRound className="size-[18px]" aria-hidden="true" />
              <span className="hidden lg:inline">{t('nav.myAccount')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
