import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'

import { ContributeNav } from './contribute-parts'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * The frame around every /contribute screen.
 *
 * Rendered inside the public AppShell, so the site header, the bottom nav, the
 * footer and the district map behind everything all continue here. That is §12:
 * this is a section of ELAKAI, not a separate application that happens to share
 * a logo.
 *
 * Everything below the nav strip is the child route's. This file owns the
 * greeting, the sign-out control and the horizontal rhythm, and nothing else.
 */
export function ContributeShell() {
  const { profile, signOut } = useAccount()

  const firstName = profile?.fullName?.trim().split(/\s+/)[0]

  return (
    <div className="container py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title text-balance">
            {firstName ? `Welcome back, ${firstName}` : 'Your contributions'}
          </h1>
          <p className="mt-1.5 max-w-xl text-body-sm text-pretty text-ink-muted">
            Your contributions help keep ELAKAI accurate and useful.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          className={cn('shrink-0 text-ink-muted hover:text-ink')}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <div className="mt-6">
        <ContributeNav />
      </div>

      <div className="pt-6 sm:pt-8">
        <Outlet />
      </div>
    </div>
  )
}
