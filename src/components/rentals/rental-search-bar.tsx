import { Bath, BedDouble, Home, MapPin, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AREAS, CATEGORY_MAP, RENTAL_IDS } from '@/data/categories'
import type { CategoryId } from '@/data/types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The segmented filter bar from Reference/Hostel.
 *
 * Layout is the reference's: one pill rail of dropdowns divided by hairlines,
 * closed by a filled terminal button. Colour is entirely ours — `bg-surface`,
 * `border-line`, and the primary accent on the button and every focus ring.
 *
 * On a phone the rail becomes a two-column grid, because four dropdowns and a
 * button will not sit legibly across 360px.
 * ========================================================================== */

const ANY = 'any'

/** Strips the Select trigger back to a bare segment inside the rail. */
const SEGMENT =
  'h-12 w-full rounded-control border-0 bg-transparent px-3 hover:bg-surface-2 sm:rounded-pill lg:h-14'

function SegmentLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-ink-subtle">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  )
}

export type RentalQuickFilters = {
  category: CategoryId | null
  bedrooms: number | null
  bathrooms: number | null
  area: string | null
}

export function RentalSearchBar({
  value,
  onChange,
  onOpenFilters,
  activeCount,
  className,
}: {
  value: RentalQuickFilters
  onChange: (next: RentalQuickFilters) => void
  onOpenFilters: () => void
  activeCount: number
  className?: string
}) {
  const { t, L, n } = useI18n()

  const counts = [1, 2, 3, 4]

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1 rounded-card border border-line bg-surface p-1.5 shadow-card',
        'sm:flex sm:items-center sm:rounded-pill sm:gap-0',
        'focus-within:border-primary/40',
        className,
      )}
    >
      {/* ---- Property type ---- */}
      <Select
        value={value.category ?? ANY}
        onValueChange={(v) =>
          onChange({ ...value, category: v === ANY ? null : (v as CategoryId) })
        }
      >
        <SelectTrigger className={cn(SEGMENT, 'sm:flex-1')} aria-label={t('rentals.type')}>
          <SelectValue asChild>
            <SegmentLabel icon={<Home className="size-4" aria-hidden="true" />}>
              {value.category ? L(CATEGORY_MAP[value.category].name) : t('rentals.type')}
            </SegmentLabel>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('search.allCategories')}</SelectItem>
          {RENTAL_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {L(CATEGORY_MAP[id].name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="hidden h-7 w-px shrink-0 bg-line sm:block" aria-hidden="true" />

      {/* ---- Bedrooms ---- */}
      <Select
        value={value.bedrooms ? String(value.bedrooms) : ANY}
        onValueChange={(v) => onChange({ ...value, bedrooms: v === ANY ? null : Number(v) })}
      >
        <SelectTrigger className={cn(SEGMENT, 'sm:flex-1')} aria-label={t('rentals.bedrooms')}>
          <SelectValue asChild>
            <SegmentLabel icon={<BedDouble className="size-4" aria-hidden="true" />}>
              {value.bedrooms ? (
                <span className="tnum">
                  {n(value.bedrooms)}+ {t('rentals.beds')}
                </span>
              ) : (
                t('rentals.bedrooms')
              )}
            </SegmentLabel>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('rentals.any')}</SelectItem>
          {counts.map((c) => (
            <SelectItem key={c} value={String(c)}>
              <span className="tnum">
                {n(c)}+ {t('rentals.beds')}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="hidden h-7 w-px shrink-0 bg-line sm:block" aria-hidden="true" />

      {/* ---- Bathrooms ---- */}
      <Select
        value={value.bathrooms ? String(value.bathrooms) : ANY}
        onValueChange={(v) => onChange({ ...value, bathrooms: v === ANY ? null : Number(v) })}
      >
        <SelectTrigger className={cn(SEGMENT, 'sm:flex-1')} aria-label={t('rentals.bathrooms')}>
          <SelectValue asChild>
            <SegmentLabel icon={<Bath className="size-4" aria-hidden="true" />}>
              {value.bathrooms ? (
                <span className="tnum">
                  {n(value.bathrooms)}+ {t('rentals.baths')}
                </span>
              ) : (
                t('rentals.bathrooms')
              )}
            </SegmentLabel>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('rentals.any')}</SelectItem>
          {[1, 2, 3].map((c) => (
            <SelectItem key={c} value={String(c)}>
              <span className="tnum">
                {n(c)}+ {t('rentals.baths')}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="hidden h-7 w-px shrink-0 bg-line sm:block" aria-hidden="true" />

      {/* ---- Area ---- */}
      <Select
        value={value.area ?? ANY}
        onValueChange={(v) => onChange({ ...value, area: v === ANY ? null : v })}
      >
        <SelectTrigger
          className={cn(SEGMENT, 'col-span-2 sm:col-span-1 sm:flex-1')}
          aria-label={t('rentals.area')}
        >
          <SelectValue asChild>
            <SegmentLabel icon={<MapPin className="size-4" aria-hidden="true" />}>
              {value.area
                ? L(AREAS.find((a) => a.id === value.area)!.name)
                : t('rentals.area')}
            </SegmentLabel>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('search.allCategories')}</SelectItem>
          {AREAS.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {L(a.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ---- Terminal button ----
          The reference closes the rail with a filled button. Filtering here is
          live, so there is nothing to submit — it opens the remaining filters
          (budget, tenant, furnishing) instead of pretending to search. */}
      <Button
        size="lg"
        onClick={onOpenFilters}
        className="col-span-2 rounded-pill sm:col-span-1 sm:ml-1 sm:shrink-0 lg:h-14"
      >
        <SlidersHorizontal />
        {t('search.filters')}
        {activeCount > 0 && (
          <Badge variant="neutral" size="sm" className="tnum ml-0.5 bg-white/20 text-white">
            {n(activeCount)}
          </Badge>
        )}
      </Button>
    </div>
  )
}
