import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

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

  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-title text-balance">{title}</h2>
        {description && (
          <p className="mt-1 text-body-sm text-pretty text-ink-muted">{description}</p>
        )}
      </div>

      {href && (
        <Link
          to={href}
          className={cn(
            'group inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5',
            'text-body-sm font-bold text-primary transition-colors hover:text-primary-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          {t('home.seeAll')}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  )
}

/** Standard vertical rhythm between homepage sections. */
export function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('container py-8 sm:py-10', className)} {...props} />
}
