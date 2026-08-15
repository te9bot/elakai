import { ArrowRight, Phone, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CallButton } from '@/components/call-button'
import { Icon } from '@/components/icon'
import { Available24Badge } from '@/components/status'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmergencyContact } from '@/data/types'
import { DirectionsButton } from '@/components/directions-button'
import { normalizePhone } from '@/lib/phone'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Emergency cards are the highest-contrast surface in the app and carry the
 * largest touch targets. Someone using this is panicking, one-handed, possibly
 * in the dark — so: oversized icon, one obvious action, minimal reading.
 */
export function EmergencyCard({
  contact,
  listingId,
  className,
}: {
  contact: EmergencyContact
  /**
   * This contact's `public.listings.id`, when it has a row.
   *
   * Supplied by the page rather than looked up here — see
   * `useListingIdResolver`. Absent for a bundled-only record, in which case the
   * title is plain text: there is no detail page to open, and a link to one
   * that 404s is worse than no link.
   */
  listingId?: number
  className?: string
}) {
  const { t, L } = useI18n()
  const isDanger = contact.tone === 'danger'
  const phone = normalizePhone(contact.phone)

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-card border transition-shadow',
        // Glass only on the urgent tier. The lower-priority contacts stay flat
        // so the treatment keeps meaning something, and so a long Emergency
        // list is not a dozen simultaneous backdrop blurs on a budget phone.
        // Glass carries its own hover shadow — see .glass-danger in index.css.
        isDanger
          ? 'glass-danger'
          : 'border-line bg-surface shadow-card hover:shadow-card-hover',
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
          {/* The title is the link, not the whole card. Call and Directions sit
              in the footer as siblings, so a tap on either dials or navigates
              to the map without racing a route change — no click-propagation
              handling needed, because the controls were never nested inside
              the link to begin with. */}
          <h3
            className={cn(
              'text-heading text-balance',
              isDanger ? 'text-danger-ink' : 'text-ink',
            )}
          >
            {listingId ? (
              <Link
                to={`/listing/${listingId}`}
                className="rounded transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                {L(contact.name)}
              </Link>
            ) : (
              L(contact.name)
            )}
          </h3>
          <p
            className={cn(
              'mt-1.5 text-body-sm leading-relaxed text-pretty',
              isDanger ? 'text-danger-ink/85' : 'text-ink-muted',
            )}
          >
            {L(contact.description)}
          </p>
          {/* The number itself, not just a button that promises one. Withheld
              for a placeholder for the same reason CallButton refuses to dial
              one: printing a number that reaches nobody in tabular figures
              next to the word "emergency" invites someone to copy it down. */}
          {phone.e164 && (
            <p
              className={cn(
                'tnum mt-2 text-body font-bold',
                isDanger ? 'text-danger-ink' : 'text-ink',
              )}
            >
              <a
                href={`tel:${phone.e164}`}
                className="rounded transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                {phone.display}
              </a>
            </p>
          )}

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

        {/* Renders only when this contact has a real destination — a national
            helpline has none, and a Directions button on one would be a lie. */}
        <DirectionsButton
          coords={contact.coords}
          address={contact.address ? L(contact.address) : null}
          label={L(contact.name)}
          size="lg"
          className="flex-1"
        >
          <span className="hidden sm:inline">{t('card.directions')}</span>
        </DirectionsButton>
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
 * every other number in the app does: it is the one place a stored number
 * becomes a tap-to-call action, and the one place a placeholder is refused.
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
      // Glass earns its keep here specifically: this panel sits over the
      // hero's grid and colour washes, so there is something behind it worth
      // refracting. It is one element, so the blur cost is paid once.
      className={cn('rounded-card border glass-danger p-4 sm:p-5', className)}
    >
      <h2
        id="hero-emergency-title"
        className="flex items-center gap-2 text-meta font-bold uppercase tracking-wide text-danger-ink"
      >
        <span className="relative grid size-4 shrink-0 place-items-center">
          {/* A slow beacon, not a flash. This panel has to read as urgent
              without becoming the thing you look away from. */}
          <span
            aria-hidden="true"
            className="absolute size-4 rounded-full bg-danger/25 motion-safe:animate-pulse-ring"
          />
          <Siren className="relative size-4 text-danger" aria-hidden="true" />
        </span>
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

        {contacts.map((contact, i) => (
          <li
            key={contact.id}
            // CSS keyframes rather than Framer: three fixed delays do not need a
            // variant tree, and the global reduced-motion rule already stops it.
            // Delays are relative to mount, not page load — these tiles replace
            // a skeleton the moment the contacts resolve, and nobody should wait
            // on a flourish to see a call button.
            className="min-w-0 motion-safe:animate-fade-up"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
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
