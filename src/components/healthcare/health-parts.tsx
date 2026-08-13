import { FlaskConical, Info, ShieldQuestion, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_MAP } from '@/data/categories'
import type { DataSource, HealthRecord, SourceKind } from '@/data/healthcare-types'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import type { Localized } from '@/data/types'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Small pieces shared by the healthcare result cards and the profile page.
 * ========================================================================== */

/** Stable artwork seed from a record id, so a listing's colour never shifts. */
export function seedOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 997
}

export function categoryOf(record: HealthRecord) {
  return CATEGORY_MAP[record.category]
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

const TAG_TONE = {
  service: 'border-primary/20 bg-primary-soft text-primary-ink',
  department: 'border-success/25 bg-success-soft text-success-ink',
  test: 'border-line bg-surface-2 text-ink-muted',
} as const

/**
 * The services / departments / tests lists. Tinted chips rather than a bullet
 * list — they are scanned, not read, and the three tones keep the three
 * different kinds of fact visually separable on a long profile.
 */
export function TagList({
  items,
  tone = 'service',
  className,
}: {
  items: Localized[]
  tone?: keyof typeof TAG_TONE
  className?: string
}) {
  const { L } = useI18n()
  if (items.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <li
          key={item.en}
          className={cn(
            'rounded-pill border px-3 py-1.5 text-meta font-semibold',
            TAG_TONE[tone],
          )}
        >
          {L(item)}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

const SOURCE_LABEL: Record<SourceKind, TranslationKey> = {
  official: 'health.source.official',
  dghs: 'health.source.dghs',
  facebook: 'health.source.facebook',
  directory: 'health.source.directory',
  placeholder: 'health.source.placeholder',
}

/**
 * A compact marker for records that are not verified. Sample records get an
 * amber chip because mistaking one for a real listing is the failure that
 * actually costs someone something.
 */
export function SourceBadge({ source, className }: { source: DataSource; className?: string }) {
  const { t } = useI18n()

  if (source.kind === 'placeholder') {
    return (
      <Badge variant="warning" size="sm" className={className}>
        <Info aria-hidden="true" />
        {t('health.sample')}
      </Badge>
    )
  }

  if (source.verifiedAt === null) {
    return (
      <Badge variant="outline" size="sm" className={className}>
        <ShieldQuestion aria-hidden="true" />
        {t('health.unverified')}
      </Badge>
    )
  }

  return null
}

/** তথ্যের উৎস — the credibility footer at the bottom of every profile. */
export function SourceNote({ source, className }: { source: DataSource; className?: string }) {
  const { t, L, n } = useI18n()

  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-line bg-surface/60 px-4 py-3.5',
        className,
      )}
    >
      <dl className="space-y-1.5 text-meta text-ink-subtle">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-ink-muted">{t('health.source')}:</dt>
          <dd className="min-w-0">
            {t(SOURCE_LABEL[source.kind])}
            {source.note && <span className="text-ink-subtle"> · {L(source.note)}</span>}
            {source.url && (
              <>
                {' · '}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  {source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </>
            )}
          </dd>
        </div>

        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-ink-muted">{t('health.lastVerified')}:</dt>
          <dd className={cn('tnum', source.verifiedAt === null && 'text-warning-ink')}>
            {source.verifiedAt === null ? t('health.notVerified') : n(source.verifiedAt)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function ProfileSection({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-heading">
        {icon && <span className="text-ink-subtle">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Icons the profile page uses for its section headings. */
export const SECTION_ICONS = {
  services: <Stethoscope className="size-[18px]" aria-hidden="true" />,
  tests: <FlaskConical className="size-[18px]" aria-hidden="true" />,
} as const
