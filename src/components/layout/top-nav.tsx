import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Languages, Moon, Search, Sun } from 'lucide-react'
import { Logo } from './logo'
import { SearchBar } from '@/components/search/search-bar'
import { useI18n } from '@/lib/i18n'
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
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

        <nav
          aria-label={t('nav.primary')}
          className="ml-4 hidden items-center gap-1 md:flex"
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
          {/* On desktop the search bar lives in the header; on mobile it is a page element. */}
          {!onSearchPage && (
            <div className="hidden w-64 lg:block xl:w-80">
              <SearchBar
                asButton
                value=""
                onChange={() => {}}
                onButtonClick={() => navigate('/search')}
                placeholder={t('search.placeholderShort')}
              />
            </div>
          )}

          {!onSearchPage && (
            <Link
              to="/search"
              aria-label={t('nav.search')}
              className={cn(
                'grid size-11 place-items-center rounded-full text-ink-muted lg:hidden',
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
        </div>
      </div>
    </header>
  )
}
