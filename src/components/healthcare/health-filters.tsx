import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { HealthCategoryId, HealthRecord } from '@/data/healthcare-types'
import { filterOptionsFor, type FilterOption, type HealthFilters } from '@/lib/healthcare-search'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Category-aware filters.
 *
 * Which groups appear is a property of the selected category, and which values
 * appear inside a group is derived from the records in it. Nothing here knows
 * that "Cardiology" or "CT Scan" exist — add a facility carrying a new
 * department and it becomes filterable with no change to this file.
 * ========================================================================== */

type GroupKey = 'areas' | 'specialties' | 'services'

/** Which filter groups mean anything for each category. */
const GROUPS_BY_CATEGORY: Record<HealthCategoryId | 'all', GroupKey[]> = {
  all: ['areas'],
  hospital: ['areas', 'specialties', 'services'],
  clinic: ['areas', 'specialties', 'services'],
  doctor: ['areas', 'specialties'],
  'blood-bank': ['areas', 'services'],
  pharmacy: ['areas', 'services'],
  diagnostic: ['areas', 'services'],
}

const GROUP_FIELD: Record<GroupKey, keyof HealthFilters> = {
  areas: 'area',
  specialties: 'specialty',
  services: 'service',
}

/** Values shown before the "show more" toggle appears. */
const COLLAPSED = 8

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  const { n } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3.5 text-meta font-semibold',
        'transition-[background-color,border-color,color] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        active
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-surface text-ink-muted hover:border-primary/40 hover:text-ink',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('tnum', active ? 'text-white/75' : 'text-ink-subtle')}>{n(count)}</span>
      )}
    </button>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: FilterOption[]
  value: string | null
  onSelect: (v: string | null) => void
}) {
  const { t, L } = useI18n()
  const [expanded, setExpanded] = useState(false)

  if (options.length < 2) return null

  const shown = expanded ? options : options.slice(0, COLLAPSED)

  return (
    <div className="min-w-0">
      <p className="mb-2 text-micro uppercase text-ink-subtle">{label}</p>
      <div className="flex flex-wrap gap-2">
        {shown.map((o) => (
          <Chip
            key={o.value}
            label={L(o.label)}
            count={o.count}
            active={value === o.value}
            // Tapping the active chip clears it — one control, both directions.
            onClick={() => onSelect(value === o.value ? null : o.value)}
          />
        ))}

        {options.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="h-9 shrink-0 rounded-pill px-3 text-meta font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {expanded ? t('health.filter.less') : t('health.filter.more')}
          </button>
        )}
      </div>
    </div>
  )
}

export function HealthcareFilters({
  category,
  candidates,
  filters,
  onChange,
  className,
}: {
  category: HealthCategoryId | null
  /** The current query's results before filters — what the counts describe. */
  candidates?: HealthRecord[]
  filters: HealthFilters
  onChange: (next: HealthFilters) => void
  className?: string
}) {
  const { t } = useI18n()
  const options = useMemo(() => filterOptionsFor(category, candidates), [category, candidates])
  const groups = GROUPS_BY_CATEGORY[category ?? 'all']

  const activeCount = groups.filter((g) => filters[GROUP_FIELD[g]]).length

  const labels: Record<GroupKey, string> = {
    areas: t('health.filter.area'),
    specialties: t('health.filter.specialty'),
    services: t('health.filter.service'),
  }

  const visible = groups.filter((g) => options[g].length >= 2)
  if (visible.length === 0) return null

  return (
    <div className={cn('rounded-card border border-line bg-surface p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-body-sm font-bold">
          <SlidersHorizontal className="size-4 text-ink-subtle" aria-hidden="true" />
          {t('search.filters')}
        </p>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-meta font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-3.5" aria-hidden="true" />
            {t('search.reset')}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {visible.map((g) => (
          <FilterGroup
            key={g}
            label={labels[g]}
            options={options[g]}
            value={(filters[GROUP_FIELD[g]] as string | null | undefined) ?? null}
            // The field is keyed dynamically, so the value is widened to string
            // here and narrowed back by the AreaId union at the search layer.
            onSelect={(v) => onChange({ ...filters, [GROUP_FIELD[g]]: v } as HealthFilters)}
          />
        ))}
      </div>
    </div>
  )
}
