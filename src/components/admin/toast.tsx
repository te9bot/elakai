import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Toasts.
 *
 * Confirmation that a save actually happened. The region is a polite live
 * region rather than an alert, so a screen reader finishes the sentence it was
 * reading before announcing "Changes saved" — except for errors, which
 * interrupt, because those need acting on.
 * ========================================================================== */

type ToastTone = 'success' | 'error' | 'info'
type Toast = { id: number; tone: ToastTone; message: string }

type ToastValue = {
  toast: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastValue | null>(null)

const TONE = {
  success: { icon: Check, className: 'border-success/30 bg-success-soft text-success-ink' },
  error: { icon: AlertTriangle, className: 'border-danger/30 bg-danger-soft text-danger-ink' },
  info: { icon: Info, className: 'border-line bg-surface text-ink' },
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = next.current++
      setToasts((prev) => [...prev, { id, tone, message }])
      // Errors stay until dismissed: they usually mean the change did not
      // happen, and a message about that should not disappear on its own.
      if (tone !== 'error') {
        window.setTimeout(() => dismiss(id), 4000)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, className } = TONE[t.tone]
            return (
              <m.div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : undefined}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-control border px-4 py-3 shadow-lift',
                  className,
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-meta font-semibold">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="-m-1 grid size-7 shrink-0 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                >
                  <X className="size-3.5" />
                </button>
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
