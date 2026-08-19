import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react'

import {
  LoadFailure,
  StatusPill,
  formatDateTime,
} from '@/components/contribute/contribute-parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/lib/auth'
import { sectionLabel } from '@/lib/listings'
import { categoryLabel, sectionSpec } from '@/lib/submission-fields'
import {
  deleteSubmission,
  getSubmission,
  submissionError,
  type Submission,
} from '@/lib/submissions'

/**
 * One submission, from the contributor's side.
 *
 * The screen exists mostly for three moments: checking what was actually sent,
 * reading why something was refused, and finding the live listing after it was
 * approved. Everything here serves one of those.
 */
export default function ContributeSubmissionDetailPage() {
  const { id = '' } = useParams()
  const { schemaReady } = useAccount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const query = useQuery({
    queryKey: ['contribute', 'submission', id],
    queryFn: () => getSubmission(id),
    enabled: !!id && schemaReady,
  })

  const remove = useMutation({
    mutationFn: () => deleteSubmission(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contribute'] })
      navigate('/contribute/submissions', { replace: true })
    },
  })

  if (!schemaReady) {
    return <LoadFailure message="Contributions are not switched on for this site yet." />
  }

  if (query.isPending) return <Skeleton className="h-96 w-full rounded-card" />
  if (query.isError) return <LoadFailure message={submissionError(query.error)} />

  const s = query.data
  if (!s) {
    return (
      <div className="space-y-4">
        {/*
         * "Not found" covers both "no such submission" and "not yours". The
         * data layer deliberately does not distinguish them — see
         * getSubmission — so neither does this screen.
         */}
        <LoadFailure message="That submission could not be found." />
        <Button variant="secondary" asChild>
          <Link to="/contribute/submissions">Back to my contributions</Link>
        </Button>
      </div>
    )
  }

  const spec = sectionSpec(s.section)

  return (
    <div className="space-y-5">
      <Link
        to="/contribute/submissions"
        className="inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-meta font-semibold text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My contributions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-title text-balance">{s.title}</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            {[s.category ? categoryLabel(s.category) : null, sectionLabel(s.section)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <StatusPill status={s.status} className="shrink-0" />
      </div>

      <Outcome submission={s} />

      {s.imageUrl && (
        <Card className="overflow-hidden p-0">
          <img
            src={s.imageUrl}
            alt={`Photo submitted for ${s.title}`}
            loading="lazy"
            decoding="async"
            className="max-h-[360px] w-full bg-surface-2 object-contain"
          />
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-heading">What you sent</h3>
        <dl className="mt-4 divide-y divide-line">
          <Row label={spec.title.label} value={s.title} />
          <Row label="Description" value={s.description} />
          <Row label="Phone" value={s.phone} />
          <Row label="Second number" value={s.altPhone} />
          <Row label="Email" value={s.email} />
          <Row label="Address" value={s.address} />
          <Row label="Area" value={s.location} />
          <Row label="Map link" value={s.mapsUrl} />
          {spec.price && <Row label={spec.price.label} value={s.price} />}
          {spec.availability && <Row label={spec.availability.label} value={s.availability} />}
          {spec.services.show && (
            <Row label={spec.services.label} value={s.services.join(', ')} />
          )}
          <Row label="Submitted" value={formatDateTime(s.submittedAt)} />
          {s.reviewedAt && <Row label="Reviewed" value={formatDateTime(s.reviewedAt)} />}
        </dl>
      </Card>

      {s.status === 'pending' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to={`/contribute/submit?edit=${s.id}`}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </Button>

          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-semibold">Withdraw this submission?</span>
              <Button
                variant="danger"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                {remove.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Yes, withdraw
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden="true" />
              Withdraw
            </Button>
          )}

          {remove.isError && (
            <p role="alert" className="text-meta font-semibold text-danger">
              {submissionError(remove.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * What happened to it, and what to do next.
 *
 * Three genuinely different messages rather than one panel with a variable
 * colour, because the three states need the contributor to do three different
 * things: wait, look at the live page, or read a reason and try again.
 */
function Outcome({ submission: s }: { submission: Submission }) {
  if (s.status === 'pending') {
    return (
      <Card className="border-warning/30 bg-warning-soft p-4">
        <p className="text-body-sm text-warning-ink">
          Your information has been submitted and is waiting for verification by
          an ELAKAI administrator. It is not on the public site yet, and no
          RP Points are awarded until it is approved.
        </p>
      </Card>
    )
  }

  if (s.status === 'approved') {
    return (
      <Card className="border-success/30 bg-success-soft p-4">
        <p className="text-body-sm font-bold text-success-ink">
          Approved and published — 50 RP Points awarded.
        </p>
        <p className="mt-1 text-meta text-success-ink/85">
          Approved on {formatDateTime(s.approvedAt ?? s.reviewedAt)}.
        </p>
        {s.publishedListingId && (
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link to={`/listing/${s.publishedListingId}`}>
              <ExternalLink aria-hidden="true" />
              See it on ELAKAI
            </Link>
          </Button>
        )}
      </Card>
    )
  }

  return (
    <Card className="border-danger/30 bg-danger-soft p-4">
      <p className="text-body-sm font-bold text-danger-ink">Not accepted</p>
      {s.rejectionReason && (
        <p className="mt-1.5 text-body-sm text-danger-ink">
          <span className="font-semibold">Reason:</span> {s.rejectionReason}
        </p>
      )}
      {s.rejectionDetail && (
        <p className="mt-1.5 text-body-sm text-pretty text-danger-ink/90">{s.rejectionDetail}</p>
      )}
      <p className="mt-2.5 text-meta text-danger-ink/80">
        Nothing was published and no RP Points were awarded. If the reason is
        something you can fix, you are welcome to submit it again.
      </p>
      <Button variant="secondary" size="sm" className="mt-3" asChild>
        <Link to="/contribute/submit">Submit again</Link>
      </Button>
    </Card>
  )
}

/** Skips itself when there is nothing to show, so no empty rows are rendered. */
function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-meta font-bold text-ink-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-body-sm text-ink">{value}</dd>
    </div>
  )
}
