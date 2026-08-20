import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

/**
 * A section heading, and — when it leads somewhere — the whole heading is the
 * link.
 *
 * It used to be only the "See all" control on the right, which on a phone is a
 * 90px target beside a heading and a sentence that look exactly as tappable and
 * are not. Reported as "I tap Rental listings and nothing happens", which is
 * precisely what happened: the words naming the destination were the one part
 * of the block that did not go there.
 *
 * So the title, the description and the affordance are one link now. The
 * "See all" text stays as a `span` inside it rather than a second anchor —
 * nesting two links is invalid, and the arrow was never a separate destination.
 */
export function SectionHeader({
  title,
  description,
  href,
  className,
}: {
  title: string
  description?: string
  href?: string
  className?: string
}) {
  const { t } = useI18n()

  const heading = (
    <div className="min-w-0">
      <h2 className={cn('text-title text-balance', href && 'transition-colors group-hover:text-primary')}>
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-body-sm text-pretty text-ink-muted">{description}</p>
      )}
    </div>
  )

  if (!href) {
    return <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>{heading}</div>
  }

  return (
    <Link
      to={href}
      aria-label={title}
      className={cn(
        // The negative margin lets the hover surface extend past the text
        // without moving anything: the block occupies the same space it did
        // when it was a plain div.
        'group -mx-2 mb-4 flex items-end justify-between gap-4 rounded-card px-2 py-1.5',
        'transition-colors hover:bg-surface-2/70 active:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {heading}

      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5',
          'text-body-sm font-bold text-primary transition-colors group-hover:text-primary-hover',
        )}
      >
        {t('home.seeAll')}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  )
}

/** Standard vertical rhythm between homepage sections. */
export function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('container py-8 sm:py-10', className)} {...props} />
}
