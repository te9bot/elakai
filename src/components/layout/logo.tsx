import { cn } from '@/lib/utils'

/**
 * Hand-drawn wordmark. Drawing it as SVG rather than setting type in a display
 * face keeps the identity distinctive at zero font payload — worth it when the
 * audience is on metered data.
 *
 * The mark is a map pin whose counter is also the "A" of ELAKAI.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        role="img"
        aria-label="ELAKAI"
        fill="none"
      >
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path
          d="M16 6.5c-3.9 0-7 3.1-7 6.95 0 5.05 6.1 11.25 6.36 11.5a.9.9 0 0 0 1.29 0C16.9 24.7 23 18.5 23 13.45 23 9.6 19.9 6.5 16 6.5Z"
          fill="#fff"
        />
        {/* Counter doubles as an "A" crossbar. */}
        <path
          d="M16 9.6l2.9 6.1h-1.7l-.5-1.15h-1.4L14.8 15.7h-1.7L16 9.6Zm0 2.6l-.35.8h.7l-.35-.8Z"
          className="fill-primary"
        />
      </svg>

      {showWordmark && (
        <span className="text-[19px] font-extrabold leading-none tracking-[-0.045em] text-ink">
          ELAKAI
        </span>
      )}
    </span>
  )
}
