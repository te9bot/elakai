import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

type SearchBarProps = {
  value: string
  onChange: (v: string) => void
  onSubmit?: (v: string) => void
  onClear?: () => void
  onFocus?: () => void
  placeholder?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  readOnly?: boolean
  className?: string
  /** Rendered as a plain div — used for the tappable "fake" bar in the header. */
  asButton?: boolean
  onButtonClick?: () => void
}

/**
 * The single most important control in the product, so it is oversized,
 * high-contrast, and never below 52px tall.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value,
    onChange,
    onSubmit,
    onClear,
    onFocus,
    placeholder,
    size = 'md',
    autoFocus,
    readOnly,
    className,
    asButton,
    onButtonClick,
  },
  ref,
) {
  const { t } = useI18n()
  const ph = placeholder ?? t('search.placeholder')

  const shell = cn(
    'group relative flex items-center gap-2 rounded-pill border border-line bg-surface',
    'shadow-card transition-[box-shadow,border-color] duration-200',
    'focus-within:border-primary focus-within:shadow-card-hover focus-within:ring-4 focus-within:ring-primary/12',
    size === 'lg' ? 'h-16 pl-5 pr-2' : 'h-[52px] pl-4 pr-2',
    className,
  )

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onButtonClick}
        className={cn(
          shell,
          'w-full cursor-pointer text-left hover:border-primary/40 hover:shadow-card-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Search
          className={cn('shrink-0 text-ink-subtle', size === 'lg' ? 'size-6' : 'size-5')}
          aria-hidden="true"
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            size === 'lg' ? 'text-body' : 'text-body-sm',
            value ? 'text-ink' : 'text-ink-subtle',
          )}
        >
          {value || ph}
        </span>
      </button>
    )
  }

  return (
    <form
      role="search"
      className={shell}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(value)
        // Dismiss the on-screen keyboard so results are visible immediately.
        ;(document.activeElement as HTMLElement | null)?.blur()
      }}
    >
      <Search
        className={cn('shrink-0 text-ink-subtle', size === 'lg' ? 'size-6' : 'size-5')}
        aria-hidden="true"
      />

      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the search overlay exists to type into
        autoFocus={autoFocus}
        readOnly={readOnly}
        aria-label={t('search.label')}
        placeholder={ph}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle',
          // 16px minimum prevents iOS Safari from zooming on focus.
          size === 'lg' ? 'text-body' : 'text-body',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />

      {value && (
        <button
          type="button"
          onClick={() => {
            onClear?.()
            onChange('')
          }}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full text-ink-subtle',
            'transition-colors hover:bg-surface-2 hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <X className="size-4" />
          <span className="sr-only">{t('search.clear')}</span>
        </button>
      )}

      <button
        type="submit"
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-primary text-white',
          'transition-colors hover:bg-primary-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          size === 'lg' ? 'size-12' : 'size-10',
        )}
      >
        <Search className={size === 'lg' ? 'size-5' : 'size-4'} />
        <span className="sr-only">{t('nav.search')}</span>
      </button>
    </form>
  )
})
