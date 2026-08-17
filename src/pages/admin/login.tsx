import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/lib/auth'
import { cn } from '@/lib/utils'
import logo from '../../../assets/elakai-logo.png'

/**
 * Admin sign-in.
 *
 * Deliberately the plainest screen in the product: one job, no navigation, no
 * marketing. It carries the real lockup so it is obvious at a glance which
 * system is being signed into.
 *
 * Distinct from the contributor sign-in at /account/login, which is a public
 * front door with a signup path, a glass treatment and a brand transition. This
 * one is a staff entrance and reads like one. Both talk to the same Supabase
 * session; what separates them is `profiles.role`, not which form was used.
 */
export default function AdminLoginPage() {
  const { status, signIn } = useAccount()
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

  /*
   * A contributor who lands here signed in.
   *
   * Their credentials are correct, so re-offering the form would be a lie. They
   * are not signed out either — that session is a perfectly good contributor
   * session and dropping it would cost them their dashboard to no benefit,
   * which is what the previous version of this screen did to every non-admin.
   */
  const wrongAccount = status === 'contributor'

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

        {wrongAccount && (
          <div
            role="alert"
            className="mt-6 rounded-control border border-warning/30 bg-warning-soft px-4 py-3 text-meta text-warning-ink"
          >
            <p className="flex items-start gap-2.5">
              <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
              <span>
                You are signed in, but this account is not an ELAKAI
                administrator. Your contributor dashboard is where your
                submissions and points live.
              </span>
            </p>
            <Link
              to="/contribute"
              className="mt-2 inline-block pl-[26px] font-bold underline underline-offset-2"
            >
              Go to my dashboard
            </Link>
          </div>
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
