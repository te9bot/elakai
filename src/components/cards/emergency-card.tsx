import { ArrowRight, Navigation, Phone, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CallButton } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { Available24Badge } from '@/components/status'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmergencyContact } from '@/data/types'
import { directionsHref } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Emergency cards are the highest-contrast surface in the app and carry the
 * largest touch targets. Someone using this is panicking, one-handed, possibly
 * in the dark — so: oversized icon, one obvious action, minimal reading.
 */
export function EmergencyCard({
  contact,
  className,
}: {
  contact: EmergencyContact
  className?: string
}) {
  const { t, L } = useI18n()
  const isDanger = contact.tone === 'danger'

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-card border shadow-card transition-shadow',
        'hover:shadow-card-hover',
        isDanger ? 'border-danger/25 bg-danger-soft' : 'border-line bg-surface',
        className,
      )}
    >
      <div className="flex flex-1 items-start gap-4 p-5">
        <div
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-control',
            isDanger
              ? 'bg-danger text-white'
              : contact.tone === 'primary'
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-ink-muted',
          )}
        >
          <Icon name={contact.icon} className="size-7" strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'text-heading text-balance',
              isDanger ? 'text-danger-ink' : 'text-ink',
            )}
          >
            {L(contact.name)}
          </h3>
          <p
            className={cn(
              'mt-1.5 text-body-sm leading-relaxed text-pretty',
              isDanger ? 'text-danger-ink/85' : 'text-ink-muted',
            )}
          >
            {L(contact.description)}
          </p>
          {contact.available24 && <Available24Badge className="mt-3" />}
        </div>
      </div>

      <div className="flex gap-2 p-4 pt-0">
        <CallButton
          phone={contact.phone}
          label={L(contact.name)}
          variant={isDanger ? 'danger' : 'primary'}
          size="lg"
          className="flex-[2]"
        >
          {t('emergency.callNow')}
        </CallButton>

        {contact.coords && (
          <Button asChild variant="secondary" size="lg" className="flex-1">
            <a
              href={directionsHref(contact.coords, L(contact.name))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation />
              <span className="hidden sm:inline">{t('card.directions')}</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The three pinned shortcuts in the homepage hero.
 *
 * Three tiles across on a phone — the whole panel costs about 110px, which is
 * what buys it a place above the fold — and three stacked rows on desktop,
 * where it owns a column. Actions go through CallButton for the same reason
 * every other number in the app does: it is the only place DEMO_MODE is
 * enforced, and none of these numbers reach anyone.
 */
export function HeroEmergency({
  contacts,
  className,
}: {
  contacts: EmergencyContact[]
  className?: string
}) {
  const { t, L } = useI18n()

  return (
    <aside
      aria-labelledby="hero-emergency-title"
      className={cn(
        'rounded-card border border-danger/25 bg-danger-soft p-4 shadow-card sm:p-5',
        className,
      )}
    >
      <h2
        id="hero-emergency-title"
        className="flex items-center gap-2 text-meta font-bold uppercase tracking-wide text-danger-ink"
      >
        <Siren className="size-4 shrink-0 text-danger" aria-hidden="true" />
        {t('home.hero.emergency.title')}
      </h2>

      <ul className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2.5">
        {/* Placeholders rather than an early return: the shell has to hold its
            height through the fetch or everything below it jumps. */}
        {contacts.length === 0 &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[70px] bg-danger/10 lg:h-14" />
            </li>
          ))}

        {contacts.map((contact) => (
          <li key={contact.id} className="min-w-0">
            <CallButton
              phone={contact.phone}
              label={L(contact.name)}
              variant="danger"
              size="lg"
              block
              showIcon={false}
              className={cn(
                // Icon sizing has to ride on the parent: the `lg` size variant
                // already emits `[&_svg]:size-5`, and a descendant selector
                // outranks a class sitting on the svg itself.
                'h-auto flex-col gap-1.5 whitespace-normal px-2 py-3 [&_svg]:size-6',
                'lg:h-14 lg:flex-row lg:justify-start lg:gap-3 lg:whitespace-nowrap',
                'lg:px-4 lg:py-0 lg:[&_svg]:size-5',
              )}
            >
              <Icon name={contact.icon} strokeWidth={2.1} />
              <span className="min-w-0 break-words text-center text-meta font-bold leading-tight lg:flex-1 lg:text-left lg:text-body">
                {L(contact.short ?? contact.name)}
              </span>
              <Phone className="hidden lg:block" aria-hidden="true" />
            </CallButton>
          </li>
        ))}
      </ul>

      <Link
        to="/emergency"
        className={cn(
          'mt-3.5 inline-flex items-center gap-1.5 text-meta font-bold text-danger-ink',
          'transition-opacity hover:opacity-70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-danger-soft',
        )}
      >
        {t('home.hero.emergency.all')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </aside>
  )
}
