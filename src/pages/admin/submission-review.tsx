import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  ImageOff,
  Loader2,
  Pencil,
  X,
} from 'lucide-react'

import { ConfirmDialog } from '@/components/admin/confirm'
import { useToast } from '@/components/admin/toast'
import { Field, Select, ServiceListField, TextArea } from '@/components/forms/fields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill, formatDateTime } from '@/components/contribute/contribute-parts'
import { sectionLabel } from '@/lib/listings'
import { useReducedMotion } from '@/lib/motion'
import { formatPhone, isDialable } from '@/lib/phone'
import { pressPulse } from '@/lib/press'
import { categoriesFor, categoryLabel, sectionSpec } from '@/lib/submission-fields'
import {
  adminGetSubmission,
  approveSubmission,
  rejectSubmission,
  REJECTION_REASONS,
  submissionError,
  type Submission,
  type SubmissionInput,
} from '@/lib/submissions'

/* ==========================================================================
 * Review one submission.
 *
 * §31: everything an administrator needs to decide, on one screen, with the
 * three actions at the bottom of it. §34: they can fix a typo before approving
 * rather than rejecting something that is nearly right.
 *
 * THE EDITS GO WITH THE APPROVAL, NOT BEFORE IT
 *
 * An obvious design here is "Save edits" and then "Approve" — two buttons, two
 * requests. It is the wrong one, because between them the submission is in a
 * state nobody chose: edited by an admin, still pending, and if the tab closes
 * it stays that way, showing the contributor changes they did not make to a
 * submission that was never reviewed.
 *
 * So the corrections are held in this component and handed to
 * `approve_submission()` as its `p_edits` argument. One request, one
 * transaction: the edits, the publish and the fifty points either all happened
 * or none of them did. The function applies the edits to the stored submission
 * too, so the record of what was approved matches what went live.
 * ========================================================================== */

export default function AdminSubmissionReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const query = useQuery({
    queryKey: ['admin', 'submission', id],
    queryFn: () => adminGetSubmission(id),
    enabled: !!id,
  })

  const [edits, setEdits] = useState<Partial<SubmissionInput>>({})
  const [editing, setEditing] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const reduced = useReducedMotion()
  const approveRef = useRef<HTMLButtonElement>(null)
  const rejectRef = useRef<HTMLButtonElement>(null)

  /**
   * How long the decided state stays on screen before the queue comes back.
   *
   * §18 puts the whole approval at 300–450ms and §21 puts the status change at
   * 200–300ms; this is the second of those plus enough to read the result. It
   * is not a stall — the work is finished, the record is on screen saying what
   * happened to it, and leaving before anybody can see that is what the brief's
   * "approved status settles" step exists to prevent.
   *
   * Zero under reduced motion: there is no transition to watch, so the wait
   * would be a wait and nothing else.
   */
  const settleMs = reduced ? 0 : 480

  const s = query.data ?? null

  // Reset the pending edits whenever a different submission is opened, so
  // corrections typed for one never leak onto the next.
  useEffect(() => {
    setEdits({})
    setEditing(false)
  }, [id])

  const approve = useMutation({
    mutationFn: () => approveSubmission(id, Object.keys(edits).length ? edits : undefined),
    onSuccess: async (result) => {
      /*
       * §20 — the success state is reached here and nowhere earlier.
       *
       * Awaiting the invalidation before anything else is what makes the
       * transition below honest: by the time it plays, `submissions.status` has
       * been re-read from Postgres and really does say 'approved'. Nothing on
       * this screen animates toward a result the database has not confirmed,
       * and a failure never reaches this callback at all — it goes to onError,
       * which leaves the Decision card exactly as it was.
       */
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      if (result.alreadyReviewed) {
        /*
         * §39 in the interface. The function found the submission was no longer
         * pending and did nothing — a second click, a retried request, another
         * admin who got there first. Saying "Approved, +50" here would be the
         * lie the unique index exists to prevent, so it says what happened.
         */
        toast('That submission had already been reviewed. No RP Points were awarded again.', 'info')
      } else {
        toast(`Approved. It is now public, and 50 RP Points went to the contributor.`, 'success')
      }
      /*
       * §21 — the status settles before the screen changes.
       *
       * The invalidation above has already flipped this page from the Decision
       * card to the Reviewed card and the pill from Pending to Approved. Leaving
       * in the same tick would replace all of that with the queue before a
       * single frame of it had been painted, which is the instant text
       * replacement the brief asks to avoid — just at the scale of a whole
       * screen rather than a word.
       */
      window.setTimeout(() => navigate('/admin/submissions'), settleMs)
    },
    onError: (error) => toast(submissionError(error), 'error'),
  })

  const reject = useMutation({
    mutationFn: ({ reason, detail }: { reason: string; detail: string }) =>
      rejectSubmission(id, reason, detail),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast('Rejected. Nothing was published and no RP Points were awarded.', 'success')
      // Same settle as the approval above: the pill and the card have just
      // changed, and leaving before either is painted makes a decision feel
      // like it went nowhere.
      window.setTimeout(() => navigate('/admin/submissions'), settleMs)
    },
    onError: (error) => toast(submissionError(error), 'error'),
  })

  if (query.isPending) return <Skeleton className="h-[600px] w-full rounded-card" />

  if (query.isError) {
    return (
      <Failure message={submissionError(query.error)} />
    )
  }

  if (!s) return <Failure message="That submission could not be found." />

  const spec = sectionSpec(s.section)
  const busy = approve.isPending || reject.isPending

  /** The value an admin sees: their correction if they made one, else the original. */
  function shown<K extends keyof SubmissionInput>(key: K, fallback: string): string {
    const value = edits[key]
    return typeof value === 'string' ? value : fallback
  }

  function edit<K extends keyof SubmissionInput>(key: K, value: SubmissionInput[K]) {
    setEdits((e) => ({ ...e, [key]: value }))
  }

  const hasEdits = Object.keys(edits).length > 0

  return (
    <>
      <Link
        to="/admin/submissions"
        className="inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-meta font-semibold text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Submissions
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title text-balance">{shown('title', s.title)}</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            {[s.category ? categoryLabel(s.category) : null, sectionLabel(s.section)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {/*
         * §21 — Pending gives way to Approved rather than being overwritten.
         *
         * `mode="wait"` so the two never overlap: the old word leaves, then the
         * new one arrives. Crossfading them puts "PendingApproved" on screen for
         * 120ms, which is the one thing a status badge must never say.
         *
         * `initial={false}` keeps it quiet on load — a submission that was
         * already approved when the page opened has not just changed, and
         * animating it would claim otherwise.
         *
         * Opacity and a 4px slide only. The pill does not resize, does not
         * bounce and does not change colour on its way; it is the same component
         * with the same tokens, swapped.
         */}
        <div className="shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={s.status}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <StatusPill status={s.status} />
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {s.duplicateHint && (
        <Card className="mt-4 flex items-start gap-3 border-warning/30 bg-warning-soft p-4">
          <AlertTriangle
            className="mt-0.5 size-[18px] shrink-0 text-warning-ink"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-warning-ink">Possible duplicate</p>
            <p className="mt-1 text-meta text-warning-ink/90">
              {s.duplicateHint} This is a flag, not a verdict — a second branch of
              a real business is not a duplicate.
            </p>
          </div>
        </Card>
      )}

      {s.targetListingId && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary-soft/60 p-4">
          <p className="text-body-sm text-primary-ink">
            This proposes a change to a listing that is already public. Approving
            it replaces the live version.
          </p>
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/listing/${s.targetListingId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              See the live version
            </Link>
          </Button>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          {/* ---- The image, large enough to actually judge (§31) ---- */}
          <Card className="overflow-hidden p-0">
            {s.imageUrl ? (
              <a
                href={s.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Open the full-size image"
              >
                <img
                  src={s.imageUrl}
                  alt={`Photo submitted for ${s.title}`}
                  className="max-h-[420px] w-full bg-surface-2 object-contain"
                />
              </a>
            ) : (
              <div className="grid h-40 place-items-center bg-surface-2 text-ink-subtle">
                <div className="flex flex-col items-center gap-2">
                  <ImageOff className="size-6" aria-hidden="true" />
                  <p className="text-meta font-semibold">No photo submitted</p>
                </div>
              </div>
            )}
          </Card>

          {/* ---- The submitted information ---- */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-heading">Submitted information</h2>
              {s.status === 'pending' && (
                <Button
                  variant={editing ? 'soft' : 'secondary'}
                  size="sm"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil aria-hidden="true" />
                  {editing ? 'Done editing' : 'Correct before approving'}
                </Button>
              )}
            </div>

            {editing ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" wide>
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('title', s.title)}
                      onChange={(e) => edit('title', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Section">
                  {({ id: fid }) => (
                    <Select
                      id={fid}
                      value={shown('section', s.section)}
                      onChange={(e) => edit('section', e.target.value)}
                    >
                      {['healthcare', 'services', 'rentals', 'utilities', 'emergency'].map((v) => (
                        <option key={v} value={v}>
                          {sectionLabel(v)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="Category">
                  {({ id: fid }) => (
                    <Select
                      id={fid}
                      value={shown('category', s.category)}
                      onChange={(e) => edit('category', e.target.value)}
                    >
                      <option value="">Uncategorised</option>
                      {categoriesFor(shown('section', s.section)).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="Description" wide>
                  {({ id: fid }) => (
                    <TextArea
                      id={fid}
                      value={shown('description', s.description)}
                      onChange={(e) => edit('description', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Phone">
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('phone', s.phone)}
                      onChange={(e) => edit('phone', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Email">
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('email', s.email)}
                      onChange={(e) => edit('email', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Address" wide>
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('address', s.address)}
                      onChange={(e) => edit('address', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Area">
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('location', s.location)}
                      onChange={(e) => edit('location', e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Map link">
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={shown('mapsUrl', s.mapsUrl)}
                      onChange={(e) => edit('mapsUrl', e.target.value)}
                    />
                  )}
                </Field>

                {spec.price && (
                  <Field label={spec.price.label}>
                    {({ id: fid }) => (
                      <Input
                        id={fid}
                        value={shown('price', s.price)}
                        onChange={(e) => edit('price', e.target.value)}
                      />
                    )}
                  </Field>
                )}

                {spec.availability && (
                  <Field label={spec.availability.label}>
                    {({ id: fid }) => (
                      <Input
                        id={fid}
                        value={shown('availability', s.availability)}
                        onChange={(e) => edit('availability', e.target.value)}
                      />
                    )}
                  </Field>
                )}

                <ServiceListField
                  label="Services"
                  values={edits.services ?? s.services}
                  onChange={(next) => edit('services', next)}
                />

                {/* Removing an invalid image is one of the corrections §34
                    names. Clearing it to an empty string is what the function
                    reads as "unset it", rather than "leave it alone". */}
                {(edits.imageUrl ?? s.imageUrl) && (
                  <div className="sm:col-span-2">
                    <Button
                      variant="soft-danger"
                      size="sm"
                      onClick={() => edit('imageUrl', null)}
                    >
                      <X aria-hidden="true" />
                      Remove the photo from this submission
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <dl className="mt-4 divide-y divide-line">
                <Row label="Name" value={shown('title', s.title)} />
                <Row label="Description" value={shown('description', s.description)} />
                <Row
                  label="Phone"
                  value={
                    s.phone && isDialable(s.phone) ? formatPhone(s.phone) : shown('phone', s.phone)
                  }
                />
                <Row label="Second number" value={s.altPhone} />
                <Row label="Email" value={shown('email', s.email)} />
                <Row label="Address" value={shown('address', s.address)} />
                <Row label="Area" value={shown('location', s.location)} />
                <Row label="Map link" value={shown('mapsUrl', s.mapsUrl)} link />
                {spec.price && <Row label={spec.price.label} value={shown('price', s.price)} />}
                {spec.availability && (
                  <Row label={spec.availability.label} value={shown('availability', s.availability)} />
                )}
                <Row label="Services" value={(edits.services ?? s.services).join(', ')} />
                <Row label="Submitted" value={formatDateTime(s.submittedAt)} />
                {s.reviewedAt && <Row label="Reviewed" value={formatDateTime(s.reviewedAt)} />}
              </dl>
            )}
          </Card>
        </div>

        {/* ---- Contributor, and the decision ---- */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <ContributorCard submission={s} />

          {/*
           * §20 — the approved state settles in.
           *
           * 0.98 and 0.90, exactly as the brief specifies, over 220ms. It is a
           * card arriving to say what was decided, not a celebration: no
           * spring, no overshoot, no colour flash. The card's own
           * success-tinted border and background — which already existed — do
           * the rest.
           *
           * Keyed on the status so this plays on the transition and not on
           * every re-render of the same state, and `initial={false}` so opening
           * an already-reviewed submission shows the card rather than animating
           * a decision that was made last week.
           */}
          <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={s.status === 'pending' ? 'decision' : 'reviewed'}
            initial={{ opacity: 0.9, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          {s.status === 'pending' ? (
            <Card className="p-5">
              <h2 className="text-heading">Decision</h2>

              {hasEdits && (
                <p className="mt-2 rounded-control bg-primary-soft px-3 py-2 text-meta text-primary-ink">
                  Your corrections are applied when you approve. They are not
                  saved separately.
                </p>
              )}

              <div className="mt-4 space-y-2.5">
                {/*
                 * §19 — the press is acknowledged the instant it happens, and
                 * says nothing about what follows. It is not a loading state
                 * and not a success: the spinner below is the first, and the
                 * card transition above is the second.
                 *
                 * The button's own design is untouched — same variant, same
                 * size, same icon, same label. `pressPulse` plays a 90ms
                 * transform on the element and leaves nothing behind.
                 */}
                <Button
                  ref={approveRef}
                  block
                  size="lg"
                  disabled={busy}
                  onClick={() => {
                    pressPulse(approveRef.current, reduced)
                    setConfirmApprove(true)
                  }}
                >
                  {approve.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                  {approve.isPending ? 'Approving…' : 'Approve'}
                </Button>

                <Button
                  ref={rejectRef}
                  block
                  size="lg"
                  variant="soft-danger"
                  disabled={busy}
                  onClick={() => {
                    // The same feedback on the sibling. Two adjacent buttons
                    // where only one answers to the touch is a bug report
                    // waiting to be filed.
                    pressPulse(rejectRef.current, reduced)
                    setRejecting(true)
                  }}
                >
                  <X aria-hidden="true" />
                  Reject
                </Button>
              </div>

              <p className="mt-3 text-meta text-ink-subtle">
                Approving publishes this on ELAKAI and awards 50 RP Points.
                Rejecting publishes nothing and awards none.
              </p>
            </Card>
          ) : (
            <ReviewedCard submission={s} />
          )}
          </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* §32 — the confirmation says what will happen in the world. */}
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Approve this submission?"
        description={`This will publish the information on ELAKAI and award 50 RP Points to ${
          s.contributor?.fullName || s.contributor?.email || 'the contributor'
        }.`}
        confirmLabel="Approve and publish"
        // The result is handled in the mutation's onSuccess, which is also
        // where the "already reviewed" case is told apart from a real approval.
        // The dialog only needs to know when it may close.
        onConfirm={async () => {
          await approve.mutateAsync()
        }}
      />

      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        busy={reject.isPending}
        onReject={(reason, detail) => reject.mutateAsync({ reason, detail })}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function ContributorCard({ submission: s }: { submission: Submission }) {
  const c = s.contributor
  return (
    <Card className="p-5">
      <h2 className="text-heading">Contributor</h2>
      {c ? (
        <dl className="mt-3 space-y-2.5">
          <div>
            <dt className="text-meta font-bold text-ink-subtle">Name</dt>
            <dd className="text-body-sm font-semibold">{c.fullName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-meta font-bold text-ink-subtle">Email</dt>
            <dd className="break-all text-body-sm">{c.email}</dd>
          </div>
          <div>
            <dt className="text-meta font-bold text-ink-subtle">RP Points</dt>
            <dd className="tnum text-body-sm font-bold text-primary">{c.points}</dd>
          </div>
          {c.joinedAt && (
            <div>
              <dt className="text-meta font-bold text-ink-subtle">Joined</dt>
              <dd className="text-body-sm">
                {new Date(c.joinedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-body-sm text-ink-muted">
          The contributor's profile could not be read.
        </p>
      )}
    </Card>
  )
}

function ReviewedCard({ submission: s }: { submission: Submission }) {
  return (
    <Card
      className={
        s.status === 'approved'
          ? 'border-success/30 bg-success-soft p-5'
          : 'border-danger/30 bg-danger-soft p-5'
      }
    >
      <h2 className="text-heading">
        {s.status === 'approved' ? 'Approved' : 'Rejected'}
      </h2>
      <p className="mt-1.5 text-meta">
        {formatDateTime(s.reviewedAt)}
      </p>

      {s.status === 'approved' ? (
        <>
          <p className="mt-2 text-body-sm font-semibold text-success-ink">
            Published, and 50 RP Points awarded.
          </p>
          {s.publishedListingId && (
            <Button variant="secondary" size="sm" className="mt-3" block asChild>
              <Link
                to={`/listing/${s.publishedListingId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden="true" />
                View listing #{s.publishedListingId}
              </Link>
            </Button>
          )}
        </>
      ) : (
        <>
          {s.rejectionReason && (
            <p className="mt-2 text-body-sm font-semibold text-danger-ink">
              {s.rejectionReason}
            </p>
          )}
          {s.rejectionDetail && (
            <p className="mt-1 text-meta text-danger-ink/90">{s.rejectionDetail}</p>
          )}
        </>
      )}
    </Card>
  )
}

/**
 * §33 — a reason is required, and there is room for the admin's own words.
 *
 * The fixed list is there because eight consistent reasons produce a
 * contributor experience that can be learned; free text alone produces eight
 * different phrasings of "not enough information". The free-text box is there
 * because the list can never cover the specific thing that was wrong.
 */
function RejectDialog({
  open,
  onOpenChange,
  busy,
  onReject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  onReject: (reason: string, detail: string) => Promise<void>
}) {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0])
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)

  // "Other" with nothing written under it is a rejection with no reason at all,
  // which is the thing this dialog exists to prevent.
  const needsDetail = reason === 'Other'

  async function run() {
    if (needsDetail && !detail.trim()) {
      setError('Say what was wrong — the contributor sees this.')
      return
    }
    setError(null)
    await onReject(reason, detail)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading">Reject this submission?</DialogTitle>
          <DialogDescription>
            Nothing is published and no RP Points are awarded. The contributor sees
            the reason you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Field label="Reason" required>
            {({ id }) => (
              <Select
                id={id}
                value={reason}
                disabled={busy}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label={needsDetail ? 'What was wrong' : 'Anything to add (optional)'}
            hint="Shown to the contributor. Something they can act on is worth more than something polite."
            error={error ?? undefined}
            required={needsDetail}
          >
            {({ id, describedBy }) => (
              <TextArea
                id={id}
                rows={3}
                aria-describedby={describedBy}
                value={detail}
                disabled={busy}
                onChange={(e) => {
                  setDetail(e.target.value)
                  setError(null)
                }}
              />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void run()}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  if (!value?.trim()) return null
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-meta font-bold text-ink-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-body-sm text-ink">
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function Failure({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5 text-body-sm text-danger-ink"
      >
        {message}
      </div>
      <Button variant="secondary" asChild>
        <Link to="/admin/submissions">Back to submissions</Link>
      </Button>
    </div>
  )
}
