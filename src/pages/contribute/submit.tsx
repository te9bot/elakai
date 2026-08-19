import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Send,
} from 'lucide-react'

import { ImagePicker, type ImageChoice } from '@/components/contribute/image-picker'
import { LoadFailure } from '@/components/contribute/contribute-parts'
import {
  Field,
  FormSection,
  Select,
  ServiceListField,
  TextArea,
} from '@/components/forms/fields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/lib/auth'
import { clearIntent } from '@/lib/contribute-intent'
import { formatPhone, isDialable, toStoredPhone } from '@/lib/phone'
import { isLink } from '@/lib/listings'
import {
  categoriesFor,
  sectionSpec,
  SUBMISSION_SECTIONS,
  type SectionSpec,
} from '@/lib/submission-fields'
import { uploadSubmissionImage } from '@/lib/submission-images'
import {
  createSubmission,
  getSubmission,
  seedFromListing,
  submissionError,
  updateSubmission,
  type SubmissionInput,
} from '@/lib/submissions'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Submit information.
 *
 * §20 asks for a form organised as Basic → Contact → Location → Details →
 * Images → Review → Submit, rather than twenty unrelated inputs in a column.
 * That is what this is, with one structural decision worth stating:
 *
 * IT IS SECTIONS ON ONE PAGE, NOT A SEVEN-STEP WIZARD
 *
 * A wizard looks like the more considered answer and is the worse one here.
 * Every step boundary is a place to lose someone, the review step cannot show
 * what is wrong without sending them backwards through it, and on a phone —
 * which is most of this audience — a stepper spends a permanent strip of screen
 * telling you which of seven screens you are on. Sections give the same order
 * and the same grouping, keep every answer visible and correctable at once, and
 * cost nothing to abandon halfway.
 *
 * What survives from the wizard is the part that matters: choosing what you are
 * adding happens first and on its own, because it changes what the rest of the
 * form asks for.
 * ========================================================================== */

const EMPTY: SubmissionInput = {
  section: '',
  category: '',
  subcategory: '',
  title: '',
  description: '',
  phone: '',
  altPhone: '',
  email: '',
  address: '',
  location: '',
  mapsUrl: '',
  price: '',
  availability: '',
  services: [],
  imageUrl: null,
  targetListingId: null,
}

type Errors = Partial<Record<keyof SubmissionInput, string>>

export default function ContributeSubmitPage() {
  const { schemaReady, profile } = useAccount()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  /*
   * Three ways to arrive here, and they are read in this order:
   *
   *   ?edit=<uuid>     continue editing a pending submission
   *   ?listing=<id>    propose a change to something already published (§35)
   *   ?section=&category=   the "Add a pharmacy" deep link (§5)
   */
  const editId = params.get('edit')
  const listingId = params.get('listing')

  const [form, setForm] = useState<SubmissionInput>(() => ({
    ...EMPTY,
    section: params.get('section') ?? '',
    category: params.get('category') ?? '',
  }))
  const [image, setImage] = useState<ImageChoice>({ kind: 'none' })
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving'>('idle')
  const [done, setDone] = useState<{ title: string; editing: boolean } | null>(null)

  /* -------- seeding -------- */

  const existing = useQuery({
    queryKey: ['contribute', 'submission', editId],
    queryFn: () => getSubmission(editId!),
    enabled: !!editId && schemaReady,
  })

  const seed = useQuery({
    queryKey: ['contribute', 'seed-listing', listingId],
    queryFn: () => seedFromListing(Number(listingId)),
    enabled: !!listingId && /^\d+$/.test(listingId ?? '') && schemaReady,
  })

  useEffect(() => {
    const source = existing.data
    if (!source) return
    setForm({
      section: source.section,
      category: source.category,
      subcategory: source.subcategory,
      title: source.title,
      description: source.description,
      phone: source.phone,
      altPhone: source.altPhone,
      email: source.email,
      address: source.address,
      location: source.location,
      mapsUrl: source.mapsUrl,
      price: source.price,
      availability: source.availability,
      services: source.services,
      imageUrl: source.imageUrl,
      targetListingId: source.targetListingId,
    })
    setImage(source.imageUrl ? { kind: 'existing', url: source.imageUrl } : { kind: 'none' })
  }, [existing.data])

  useEffect(() => {
    if (!seed.data) return
    setForm(seed.data)
    setImage(seed.data.imageUrl ? { kind: 'existing', url: seed.data.imageUrl } : { kind: 'none' })
  }, [seed.data])

  const spec = useMemo(() => sectionSpec(form.section), [form.section])
  const categories = useMemo(() => categoriesFor(form.section), [form.section])

  const busy = phase !== 'idle'
  const isEdit = !!editId
  const isProposal = !!form.targetListingId

  function set<K extends keyof SubmissionInput>(key: K, value: SubmissionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    // Clearing on change rather than on blur: an error that persists while you
    // are fixing it reads as "still wrong", which is discouraging and untrue.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  /* -------- validation -------- */

  function validate(): boolean {
    const next: Errors = {}

    if (!form.section) next.section = 'Choose what you are adding.'
    if (!form.title.trim()) next.title = `${spec.title.label} is needed.`
    else if (form.title.trim().length < 3) next.title = 'That is too short to identify a place.'

    /*
     * A submission with no way to reach the place is not information, it is a
     * name. One of phone, address or map link has to be there — which one is
     * up to the contributor, because a rickshaw mechanic has a phone and no
     * address and a government office is the reverse.
     */
    const reachable = [form.phone, form.address, form.mapsUrl].some((v) => v.trim())
    if (!reachable) {
      next.phone = 'Add at least one of: a phone number, an address, or a map link.'
    }

    if (form.phone.trim() && !isDialable(toStoredPhone(form.phone))) {
      next.phone = 'That does not look like a Bangladeshi phone number.'
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = 'That does not look like an email address.'
    }
    if (form.mapsUrl.trim() && !isLink(form.mapsUrl)) {
      next.mapsUrl = 'Paste the full link, starting with https://'
    }
    if (spec.price?.required && !form.price.trim()) {
      next.price = `${spec.price.label} is needed.`
    }

    setErrors(next)

    if (Object.keys(next).length > 0) {
      // The first thing wrong is what should be on screen, not the top of a
      // form somebody has already filled in.
      const firstError = document.querySelector('[data-field-error="true"]')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  /* -------- submit -------- */

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setSubmitError(null)
    if (!validate()) return

    try {
      let imageUrl = form.imageUrl

      /*
       * Uploaded first, and only now.
       *
       * Choosing a file does not upload it (see components/contribute/
       * image-picker.tsx), so abandoning this form leaves nothing behind in the
       * bucket. The cost is that the upload happens on the submit press, which
       * is why it has its own phase and its own button label rather than
       * hiding inside "Submitting…".
       */
      if (image.kind === 'file') {
        setPhase('uploading')
        const uploaded = await uploadSubmissionImage(image.file)
        imageUrl = uploaded.url
      } else if (image.kind === 'none') {
        imageUrl = null
      }

      setPhase('saving')
      const payload: SubmissionInput = { ...form, imageUrl }

      if (editId) await updateSubmission(editId, payload)
      else await createSubmission(payload)

      // The intent that brought them here is spent the moment it is fulfilled,
      // so signing in again next week does not drop them back into this form.
      clearIntent()

      await queryClient.invalidateQueries({ queryKey: ['contribute'] })
      setDone({ title: payload.title.trim(), editing: !!editId })
    } catch (err) {
      setSubmitError(submissionError(err))
      setPhase('idle')
    }
  }

  /* -------- states -------- */

  if (!schemaReady) {
    return (
      <LoadFailure message="Contributions are not switched on for this site yet." />
    )
  }

  if (done) {
    return <Submitted title={done.title} editing={done.editing} onAnother={() => {
      setDone(null)
      setForm({ ...EMPTY })
      setImage({ kind: 'none' })
      setPhase('idle')
      setParams({}, { replace: true })
    }} />
  }

  if (existing.isError) return <LoadFailure message={submissionError(existing.error)} />

  if (editId && existing.isSuccess && !existing.data) {
    return (
      <LoadFailure message="That submission could not be found. It may have been withdrawn." />
    )
  }

  if (editId && existing.data && existing.data.status !== 'pending') {
    return (
      <div className="space-y-4">
        <LoadFailure message="This has already been reviewed, so it can no longer be edited." />
        <Button variant="secondary" asChild>
          <Link to={`/contribute/submissions/${editId}`}>See what happened to it</Link>
        </Button>
      </div>
    )
  }

  /* -------- section chooser -------- */

  if (!form.section) {
    return <SectionChooser onPick={(id) => set('section', id)} />
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormHeading
        spec={spec}
        isProposal={isProposal}
        isEdit={isEdit}
        onChangeSection={() => {
          // Clearing the category with the section: a pharmacy category on a
          // rentals submission would be saved and would render as nonsense.
          setForm((f) => ({ ...f, section: '', category: '' }))
        }}
      />

      {isProposal && (
        <Card className="flex items-start gap-3 border-primary/30 bg-primary-soft/50 p-4">
          <AlertTriangle
            className="mt-0.5 size-[18px] shrink-0 text-primary-ink"
            aria-hidden="true"
          />
          <p className="text-body-sm text-primary-ink">
            You are proposing a change to information that is already public. The
            live version stays exactly as it is until an administrator approves
            your version.
          </p>
        </Card>
      )}

      {/* ---- 1. Basic information ---- */}
      <FormSection
        heading="Basic information"
        description="What it is called and what it does."
      >
        <Field label={spec.title.label} hint={spec.title.hint} error={errors.title} required wide>
          {({ id, describedBy }) => (
            <div data-field-error={!!errors.title}>
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!errors.title}
                value={form.title}
                placeholder={spec.title.placeholder}
                disabled={busy}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
          )}
        </Field>

        <Field label="Category" hint="Helps people find it in the right place.">
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={form.category}
              disabled={busy}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="">Not sure</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji}  ` : ''}
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="More specific (optional)" hint="e.g. 24-hour, imaging, bachelor.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.subcategory}
              disabled={busy}
              onChange={(e) => set('subcategory', e.target.value)}
            />
          )}
        </Field>

        <Field label={spec.description.label} hint={spec.description.hint} wide>
          {({ id, describedBy }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              value={form.description}
              disabled={busy}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>
      </FormSection>

      {/* ---- 2. Contact ---- */}
      <FormSection
        heading="Contact"
        description="How someone reaches them. At least one way to get there is needed."
      >
        <Field
          label="Phone"
          hint={
            form.phone.trim() && isDialable(toStoredPhone(form.phone))
              ? `Will be shown as ${formatPhone(toStoredPhone(form.phone))}`
              : 'A Bangladeshi mobile or landline.'
          }
          error={errors.phone}
        >
          {({ id, describedBy }) => (
            <div data-field-error={!!errors.phone}>
              <Input
                id={id}
                type="tel"
                inputMode="tel"
                aria-describedby={describedBy}
                aria-invalid={!!errors.phone}
                value={form.phone}
                placeholder="01712 345678"
                disabled={busy}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
          )}
        </Field>

        <Field label="Second number (optional)">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="tel"
              inputMode="tel"
              aria-describedby={describedBy}
              value={form.altPhone}
              disabled={busy}
              onChange={(e) => set('altPhone', e.target.value)}
            />
          )}
        </Field>

        <Field label="Email (optional)" error={errors.email} wide>
          {({ id, describedBy }) => (
            <div data-field-error={!!errors.email}>
              <Input
                id={id}
                type="email"
                inputMode="email"
                aria-describedby={describedBy}
                aria-invalid={!!errors.email}
                value={form.email}
                disabled={busy}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          )}
        </Field>
      </FormSection>

      {/* ---- 3. Location ---- */}
      <FormSection heading="Location" description="Where it is, as precisely as you can.">
        <Field
          label="Address"
          hint="Street, landmark, whatever people actually use to find it."
          wide
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.address}
              disabled={busy}
              onChange={(e) => set('address', e.target.value)}
            />
          )}
        </Field>

        <Field label="Area" hint="e.g. Kushtia Sadar, Kumarkhali.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.location}
              disabled={busy}
              onChange={(e) => set('location', e.target.value)}
            />
          )}
        </Field>

        <Field
          label="Google Maps link (optional)"
          hint="Share → Copy link, from the Maps app. This is what the Directions button uses."
          error={errors.mapsUrl}
        >
          {({ id, describedBy }) => (
            <div data-field-error={!!errors.mapsUrl}>
              <Input
                id={id}
                type="url"
                inputMode="url"
                aria-describedby={describedBy}
                aria-invalid={!!errors.mapsUrl}
                value={form.mapsUrl}
                placeholder="https://maps.app.goo.gl/…"
                disabled={busy}
                onChange={(e) => set('mapsUrl', e.target.value)}
              />
            </div>
          )}
        </Field>
      </FormSection>

      {/* ---- 4. Category-specific ---- */}
      {(spec.price || spec.availability || spec.services.show) && (
        <FormSection heading={`${spec.label} details`} description="The part that is specific to this kind of listing.">
          {spec.price && (
            <Field
              label={spec.price.label}
              hint={spec.price.hint}
              error={errors.price}
              required={spec.price.required}
            >
              {({ id, describedBy }) => (
                <div data-field-error={!!errors.price}>
                  <Input
                    id={id}
                    inputMode={spec.price?.inputMode ?? 'text'}
                    aria-describedby={describedBy}
                    aria-invalid={!!errors.price}
                    value={form.price}
                    placeholder={spec.price?.placeholder}
                    disabled={busy}
                    onChange={(e) => set('price', e.target.value)}
                  />
                </div>
              )}
            </Field>
          )}

          {spec.availability && (
            <Field label={spec.availability.label} hint={spec.availability.hint}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={form.availability}
                  placeholder={spec.availability?.placeholder}
                  disabled={busy}
                  onChange={(e) => set('availability', e.target.value)}
                />
              )}
            </Field>
          )}

          {spec.services.show && (
            <ServiceListField
              label={spec.services.label}
              hint={spec.services.hint}
              values={form.services}
              disabled={busy}
              onChange={(next) => set('services', next)}
            />
          )}
        </FormSection>
      )}

      {/* ---- 5. Image ---- */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="text-heading">Photo</h2>
        <p className="mt-1 text-meta text-ink-muted">
          Optional, and the single thing that most improves a listing.
        </p>
        <div className="mt-4">
          <ImagePicker
            value={image}
            onChange={setImage}
            uploading={phase === 'uploading'}
            disabled={phase === 'saving'}
          />
        </div>
      </section>

      {/* ---- 6. Review ---- */}
      <ReviewPanel form={form} spec={spec} hasImage={image.kind !== 'none'} />

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3.5 text-body-sm text-danger-ink"
        >
          <AlertTriangle className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          {submitError}
        </div>
      )}

      {/* ---- 7. Submit ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {phase === 'uploading'
            ? 'Uploading image…'
            : phase === 'saving'
              ? 'Submitting…'
              : isEdit
                ? 'Save changes'
                : 'Submit for verification'}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          disabled={busy}
          onClick={() => navigate('/contribute/submissions')}
        >
          Cancel
        </Button>

        {profile && (
          <p className="text-meta text-ink-subtle">
            Submitting as {profile.fullName ?? profile.email}
          </p>
        )}
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Choosing what to add                                                */
/* ------------------------------------------------------------------ */

/**
 * The first and only decision that changes the rest of the form.
 *
 * Its own screen rather than a dropdown at the top of the form, because a
 * dropdown that silently relabels six fields underneath it is disorienting —
 * you answer a question and the page you were reading becomes a different page.
 * Choosing deliberately, once, and then seeing a form built for that choice is
 * calmer and is one extra tap.
 */
function SectionChooser({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-heading">What are you adding?</h2>
      <p className="mt-1 text-body-sm text-ink-muted">
        This decides what the form asks you for.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {SUBMISSION_SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className={cn(
                'group flex w-full items-center gap-4 rounded-card border border-line bg-surface p-5 text-left shadow-card',
                'transition-colors hover:border-primary/40 hover:bg-surface-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-body font-bold">{s.label}</p>
                <p className="mt-1 text-meta text-pretty text-ink-muted">{s.blurb}</p>
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FormHeading({
  spec,
  isEdit,
  isProposal,
  onChangeSection,
}: {
  spec: SectionSpec
  isEdit: boolean
  isProposal: boolean
  onChangeSection: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-heading">
          {isProposal
            ? 'Suggest a change'
            : isEdit
              ? 'Edit your submission'
              : `Add ${spec.addPhrase}`}
        </h2>
        <p className="mt-1 text-meta text-ink-muted">
          An administrator checks this before anything appears on ELAKAI.
        </p>
      </div>

      {!isEdit && !isProposal && (
        <Button variant="ghost" size="sm" onClick={onChangeSection}>
          <ArrowLeft aria-hidden="true" />
          Change type
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

/**
 * What is about to be sent, in one list.
 *
 * Not a duplicate of the form above it — it shows only what has been filled in,
 * which is the thing the form itself cannot show. A contributor who left the
 * phone number blank sees a list with no phone number in it, which is a much
 * louder signal than an empty input two screens up.
 */
function ReviewPanel({
  form,
  spec,
  hasImage,
}: {
  form: SubmissionInput
  spec: SectionSpec
  hasImage: boolean
}) {
  const rows: { label: string; value: string }[] = [
    { label: spec.title.label, value: form.title },
    { label: 'Description', value: form.description },
    { label: 'Phone', value: form.phone },
    { label: 'Second number', value: form.altPhone },
    { label: 'Email', value: form.email },
    { label: 'Address', value: form.address },
    { label: 'Area', value: form.location },
    { label: 'Map link', value: form.mapsUrl },
    ...(spec.price ? [{ label: spec.price.label, value: form.price }] : []),
    ...(spec.availability ? [{ label: spec.availability.label, value: form.availability }] : []),
    ...(spec.services.show
      ? [{ label: spec.services.label, value: form.services.join(', ') }]
      : []),
    { label: 'Photo', value: hasImage ? 'Attached' : '' },
  ].filter((r) => r.value.trim())

  return (
    <section className="rounded-card border border-line bg-surface-2 p-5">
      <h2 className="text-heading">Review</h2>
      <p className="mt-1 text-meta text-ink-muted">
        This is everything you are sending. Anything you left blank is simply not
        here.
      </p>

      <dl className="mt-4 divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-meta font-bold text-ink-subtle">{r.label}</dt>
            <dd className="min-w-0 break-words text-body-sm text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Afterwards                                                          */
/* ------------------------------------------------------------------ */

/**
 * §62, close to word for word — and the wording is the point.
 *
 * It does not say "published". It does not say "thank you, it's live". It says
 * what actually happened and what happens next, because a contributor who
 * believes their submission is public and then cannot find it on the site
 * concludes the site is broken.
 */
function Submitted({
  title,
  editing,
  onAnother,
}: {
  title: string
  editing: boolean
  onAnother: () => void
}) {
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success-ink">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>

        <h2 className="mt-4 text-title">
          {editing ? 'Changes saved' : 'Submission received'}
        </h2>

        <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-ink-muted">
          {editing ? (
            <>Your changes to <strong className="text-ink">{title}</strong> are saved and still waiting for review.</>
          ) : (
            <>
              <strong className="text-ink">{title}</strong> has been sent for
              verification. It becomes public only after an ELAKAI administrator
              approves it, and you receive 50 RP Points if they do.
            </>
          )}
        </p>

        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1.5 text-micro font-bold uppercase tracking-wide text-warning-ink">
          <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
          Status: pending review
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/contribute/submissions">See my contributions</Link>
          </Button>
          <Button variant="secondary" onClick={onAnother}>
            Submit something else
          </Button>
        </div>
      </div>
    </Card>
  )
}
