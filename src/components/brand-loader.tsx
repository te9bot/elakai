import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import logo from '../../assets/elakai-logo.png'

/**
 * The app's loading identity.
 *
 * Both pieces here are built from the brand lockup rather than from grey
 * boxes, so a wait reads as *this* product loading rather than as a generic
 * content-loader. Neither uses JS to animate: a breathing mark and a sweeping
 * sheen are a transform and an opacity on the compositor, which is what a
 * loading state can afford on a budget phone.
 *
 * Motion is opt-in through `motion-safe:`, not merely shortened by the global
 * reduced-motion rule — a paused keyframe would otherwise strand the mark on
 * whatever frame it stopped at.
 */

/** Full-region wait: a lazily-loaded route, a page-level fetch. */
export function BrandLoader({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  const { t } = useI18n()

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ?? t('state.loading')}
      className={cn('flex flex-col items-center justify-center gap-6 py-20', className)}
    >
      <span className="relative grid place-items-center">
        <span
          aria-hidden="true"
          className="glow-primary pointer-events-none absolute -inset-12 motion-safe:animate-float"
        />
        <img
          src={logo}
          alt=""
          width={512}
          height={471}
          className="relative h-20 w-auto object-contain motion-safe:animate-breathe sm:h-24"
        />
      </span>

      {/* Indeterminate, and honest about it: no fake percentage.
          `brand-progress` is what keeps it honest under reduced motion — a
          third-width bar that has stopped moving reads as "stuck at 33%",
          which is a claim about progress this has no way to make. See
          index.css: it becomes a full muted track instead. */}
      <span
        aria-hidden="true"
        className="brand-progress relative h-1 w-40 overflow-hidden rounded-pill bg-surface-2"
      >
        <span className="absolute inset-y-0 w-1/3 rounded-pill bg-primary/70 motion-safe:animate-bar-slide" />
      </span>
    </div>
  )
}

/**
 * Stand-in for an image that has not arrived, carrying the mark as a watermark
 * instead of a flat grey block. Sized entirely by the caller so it can drop
 * into any media slot the real image would fill.
 */
export function LogoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'brand-sheen relative grid place-items-center overflow-hidden bg-surface-2',
        className,
      )}
    >
      <img
        src={logo}
        alt=""
        width={512}
        height={471}
        className="h-[46%] max-h-20 w-auto object-contain opacity-[0.14] dark:opacity-[0.2]"
      />
    </div>
  )
}
