import { cn } from '@/lib/utils'

export function PageHeader({
  icon,
  title,
  description,
  tone = 'primary',
  children,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  tone?: 'primary' | 'danger'
  children?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-surface">
      <div className="surveyor-grid absolute inset-0" aria-hidden="true" />
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent',
          tone === 'danger' ? 'from-danger/[0.07]' : 'from-primary/[0.07]',
        )}
        aria-hidden="true"
      />

      <div className="container relative py-8 sm:py-10">
        <div className="flex items-start gap-4">
          {icon && (
            <span
              className={cn(
                'grid size-14 shrink-0 place-items-center rounded-control text-white shadow-card',
                tone === 'danger' ? 'bg-danger' : 'bg-primary',
              )}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-display text-balance">{title}</h1>
            {description && (
              <p className="mt-2 max-w-xl text-body text-pretty text-ink-muted">{description}</p>
            )}
          </div>
        </div>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  )
}
