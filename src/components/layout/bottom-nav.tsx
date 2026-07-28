import { NavLink } from 'react-router-dom'
import { Building2, Home, Search, Siren, Stethoscope } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { TranslationKey } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'

const ITEMS: { to: string; key: TranslationKey; icon: LucideIcon; danger?: boolean }[] = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/search', key: 'nav.search', icon: Search },
  { to: '/emergency', key: 'nav.emergency', icon: Siren, danger: true },
  { to: '/healthcare', key: 'nav.healthcare', icon: Stethoscope },
  { to: '/rentals', key: 'nav.rentals', icon: Building2 },
]

/**
 * Mobile-only tab bar. Hidden from 1024px up, where the top nav takes over.
 * Each target is a full 56px tall and stretches to the safe-area inset so it
 * stays reachable on gesture-navigation phones.
 */
export function BottomNav() {
  const { t } = useI18n()

  return (
    <nav
      aria-label={t('nav.primary')}
      className={cn(
        'glass fixed inset-x-0 bottom-0 z-40 border-t border-line shadow-bar lg:hidden',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-1 px-1',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  isActive
                    ? item.danger
                      ? 'text-danger'
                      : 'text-primary'
                    : 'text-ink-subtle active:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className="size-[22px] shrink-0"
                    strokeWidth={isActive ? 2.4 : 1.9}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'max-w-full truncate text-[11px] leading-none',
                      isActive ? 'font-bold' : 'font-medium',
                    )}
                  >
                    {t(item.key)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
