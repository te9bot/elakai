import { Link } from 'react-router-dom'
import { Icon } from '@/components/icon'
import { CATEGORY_MAP } from '@/data/categories'
import type { CategoryId } from '@/data/types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Pill chip used on the homepage hero. Emoji keeps it legible with zero icon cost. */
export function CategoryChip({
  id,
  size = 'md',
  tabIndex,
  className,
}: {
  id: CategoryId
  /** `sm` is the marquee variant — same pill, less weight in the layout. */
  size?: 'md' | 'sm'
  /** Pass -1 inside a marquee: the strip duplicates every item, and duplicate
      tab stops are worse than none. See components/marquee.tsx. */
  tabIndex?: number
  className?: string
}) {
  const { L } = useI18n()
  const cat = CATEGORY_MAP[id]

  return (
    <Link
      to={`/search?cat=${id}`}
      tabIndex={tabIndex}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border border-line bg-surface',
        'font-semibold text-ink shadow-card',
        'transition-[transform,box-shadow,border-color] duration-150 ease-out',
        'hover:border-primary/40 hover:shadow-card-hover motion-safe:hover:-translate-y-0.5',
        'active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        size === 'md' ? 'h-12 px-4 text-body-sm' : 'h-10 px-3.5 text-meta',
        className,
      )}
    >
      <span
        className={cn('leading-none', size === 'md' ? 'text-[17px]' : 'text-[15px]')}
        aria-hidden="true"
      >
        {cat.emoji}
      </span>
      <span className="whitespace-nowrap">{L(cat.name)}</span>
    </Link>
  )
}

/** Square tile used on the Services and Healthcare grids. */
export function CategoryTile({ id, count }: { id: CategoryId; count?: number }) {
  const { L, n } = useI18n()
  const cat = CATEGORY_MAP[id]

  return (
    <Link
      to={`/search?cat=${id}`}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-4',
        'shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:border-primary/40 hover:shadow-card-hover motion-safe:hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      )}
    >
      <span
        className={cn(
          'grid size-12 place-items-center rounded-control bg-primary-soft text-primary-ink',
          'transition-colors duration-200 group-hover:bg-primary group-hover:text-white',
        )}
      >
        <Icon name={cat.icon} className="size-6" />
      </span>

      <span className="min-w-0">
        <span className="block text-body-sm font-bold leading-snug text-balance">
          {L(cat.name)}
        </span>
        {count !== undefined && (
          <span className="tnum mt-0.5 block text-meta text-ink-subtle">{n(count)}</span>
        )}
      </span>
    </Link>
  )
}
