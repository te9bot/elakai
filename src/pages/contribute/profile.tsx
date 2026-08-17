import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'

import { LoadFailure, Stat, StatRow, formatDate } from '@/components/contribute/contribute-parts'
import { Field } from '@/components/forms/fields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/lib/auth'
import { requireSupabase } from '@/lib/supabase'
import { myContributionStats, submissionError } from '@/lib/submissions'

/* ==========================================================================
 * Profile.
 *
 * §41 lists what to show. §41 also says not to expose anything
 * security-sensitive, and the shape of this screen is mostly that second
 * sentence: there is no role field, no account id, no session information and
 * no way to change an email address, because none of those are things a
 * contributor needs and each one is a thing that could go wrong.
 *
 * The one editable field is the display name, and that is not a UI choice —
 * `authenticated` holds an UPDATE grant on `profiles.full_name` and on no other
 * column (migration 0008, section 6). A form offering more would be a form
 * whose extra fields the database refuses.
 * ========================================================================== */

export default function ContributeProfilePage() {
  const { profile, schemaReady, refresh } = useAccount()

  const [name, setName] = useState(profile?.fullName ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The profile arrives after the first render, so the field is seeded from it
  // when it lands rather than only at mount.
  useEffect(() => {
    setName(profile?.fullName ?? '')
  }, [profile?.fullName])

  const stats = useQuery({
    queryKey: ['contribute', 'stats'],
    queryFn: myContributionStats,
    enabled: schemaReady,
  })

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy || !profile) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const { error: failed } = await requireSupabase()
        .from('profiles')
        .update({ full_name: name.trim() || null })
        .eq('id', profile.id)

      if (failed) throw new Error(failed.message)
      await refresh()
      setSaved(true)
    } catch (err) {
      setError(submissionError(err, 'Could not save your name.'))
    } finally {
      setBusy(false)
    }
  }

  if (!profile) return <LoadFailure message="Your profile could not be loaded." />

  return (
    <div className="space-y-6">
      {schemaReady && (
        <StatRow className="sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Contributions" value={stats.data?.total} loading={stats.isPending} />
          <Stat label="Approved" value={stats.data?.approved} loading={stats.isPending} />
          <Stat label="Pending" value={stats.data?.pending} loading={stats.isPending} />
          <Stat label="Points" value={stats.data?.points} loading={stats.isPending} accent />
        </StatRow>
      )}

      <Card className="p-5">
        <h2 className="text-heading">Your details</h2>

        <form onSubmit={save} className="mt-4 max-w-md space-y-4">
          <Field
            label="Display name"
            hint="Shown to ELAKAI administrators alongside what you submit."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={name}
                disabled={busy}
                onChange={(e) => {
                  setName(e.target.value)
                  setSaved(false)
                }}
              />
            )}
          </Field>

          <Field
            label="Email"
            hint="This is the address you sign in with. Contact an administrator to change it."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={profile.email}
                readOnly
                // `readOnly` rather than `disabled`: a disabled field is skipped
                // by the keyboard and by most screen readers, and this one is
                // information worth being able to reach and copy.
                className="bg-surface-2 text-ink-muted"
              />
            )}
          </Field>

          {profile.createdAt && (
            <p className="text-meta text-ink-subtle">
              Joined {formatDate(profile.createdAt)}
            </p>
          )}

          {error && (
            <p role="alert" className="text-meta font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy || name.trim() === (profile.fullName ?? '')}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? 'Saving…' : 'Save'}
            </Button>

            {saved && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-meta font-semibold text-success-ink"
              >
                <Check className="size-4" aria-hidden="true" />
                Saved
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
