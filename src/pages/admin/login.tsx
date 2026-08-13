import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/**
 * Admin sign-in.
 *
 * Deliberately the plainest screen in the product: one job, no navigation, no
 * marketing. It carries the real lockup so it is obvious at a glance which
 * system is being signed into.
 */
export default function AdminLoginPage() {
  const { status, signIn } = useAdminAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'admin') {
    const to = (location.state as { from?: string } | null)?.from ?? '/admin'
    return <Navigate to={to} replace />
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      // Never distinguish "no such account" from "wrong password": the
      // difference is an account-enumeration oracle, and the person typing
      // cannot act on it anyway.
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(
        /invalid|credentials|password/i.test(message)
          ? 'Those details did not match an account.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="ELAKAI"
            width={512}
            height={471}
            className="h-24 w-auto object-contain"
          />
          <h1 className="mt-5 text-title">Admin</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Sign in to manage listings.</p>
        </div>

        {status === 'unconfigured' && (
          <p
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-control border border-warning/30 bg-warning-soft px-4 py-3 text-meta text-warning-ink"
          >
            <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              No backend is configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>, then reload.
            </span>
          </p>
        )}

        {status === 'forbidden' && (
          <p
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-meta text-danger-ink"
          >
            <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>That account exists but has no admin access.</span>
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="block text-meta font-bold text-ink-muted">
              Email
            </label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || status === 'unconfigured'}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-meta font-bold text-ink-muted">
              Password
            </label>
            <div className="relative">
              <Input
                id="admin-password"
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || status === 'unconfigured'}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                aria-pressed={reveal}
                className={cn(
                  'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control',
                  'text-ink-subtle transition-colors hover:text-ink',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                )}
              >
                {reveal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-meta font-semibold text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" block disabled={busy || status === 'unconfigured'}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <LogIn aria-hidden="true" />
            )}
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
