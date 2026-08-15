import { Link } from 'react-router-dom'
import { Logo } from './logo'
import { useI18n } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const LINKS: { to: string; key: TranslationKey }[] = [
  { to: '/emergency', key: 'nav.emergency' },
  { to: '/healthcare', key: 'nav.healthcare' },
  { to: '/services', key: 'nav.services' },
  { to: '/rentals', key: 'nav.rentals' },
  { to: '/search', key: 'nav.search' },
]

export function Footer() {
  const { t, n } = useI18n()

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <Logo className="h-20" />
            <p className="mt-3 text-body-sm leading-relaxed text-pretty text-ink-muted">
              {t('footer.about')}
            </p>
            <p className="mt-2 text-meta font-semibold text-ink-subtle">{t('brand.tagline')}</p>
          </div>

          <nav aria-label={t('footer.explore')}>
            <h2 className="text-micro uppercase text-ink-subtle">{t('footer.explore')}</h2>
            <ul className="mt-3 space-y-2">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-block rounded py-1 text-body-sm font-medium text-ink-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-8 text-meta text-ink-subtle">
          © {n(2026)} ELAKAI. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
