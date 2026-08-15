import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'

import { ConfirmDialog } from '@/components/admin/confirm'
import { Field, Select, TextArea } from '@/components/admin/form'
import { ImageUpload, type ImageSelection } from '@/components/admin/image-upload'
import { AdminModal, ModalFields } from '@/components/admin/modal'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  categoriesForSection,
  categoryLabel,
  LISTING_SECTIONS,
  type Listing,
  type ListingStatus,
} from '@/lib/listings'
import {
  createListing,
  errorMessage,
  removeListingImage,
  updateListing,
  uploadListingImage,
  type ListingInput,
} from '@/lib/listings-admin'
import { normalizePhone, phoneWarning, validatePhone } from '@/lib/phone'

/* ==========================================================================
 * Create / edit a listing.
 *
 * One modal for both, because the two differ only in whether an id exists and
 * a second near-identical form would drift from this one within a week.
 *
 * The image is uploaded here rather than in the picker, at the moment the form
 * is saved. That ordering is what keeps the bucket clean: a modal opened,
 * filled in and closed again uploads nothing.
 * ========================================================================== */

/** Links the footer's submit button to the form in the scrolling body. */
const FORM_ID = 'listing-form'

type Draft = {
  section: string
  title: string
  description: string
  phone: string
  email: string
  address: string
  location: string
  category: string
  price: string
  availability: string
  status: ListingStatus
  display_order: string
}

const EMPTY: Draft = {
  section: LISTING_SECTIONS[0].id,
  title: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  location: '',
  category: '',
  price: '',
  availability: '',
  status: 'active',
  display_order: '0',
}

function draftFrom(listing: Listing): Draft {
  return {
    section: listing.section || LISTING_SECTIONS[0].id,
    title: listing.title,
    description: listing.description,
    phone: listing.phone,
    email: listing.email,
    address: listing.address,
    location: listing.location,
    category: listing.category,
    price: listing.price,
    availability: listing.availability,
    status: listing.status,
    display_order: String(listing.displayOrder),
  }
}

type Errors = Partial<Record<keyof Draft, string>>

/** Rules about data the public site would otherwise render badly. */
function validate(draft: Draft): Errors {
  const errors: Errors = {}
  if (!draft.title.trim()) errors.title = 'A listing needs a title.'
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = 'That does not look like an email address.'
  }
  // Only unparseable input blocks a save. A placeholder is a valid number that
  // simply will not dial, and is reported by `phoneWarning` instead — blocking
  // on it would make every imported listing uneditable, including uneditable
  // for the purpose of replacing the placeholder.
  const phoneError = validatePhone(draft.phone)
  if (phoneError) errors.phone = phoneError
  if (draft.display_order.trim() && !Number.isFinite(Number(draft.display_order))) {
    errors.display_order = 'Order has to be a number.'
  }
  return errors
}

export function ListingDialog({
  open,
  onOpenChange,
  listing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Absent for a new listing. */
  listing: Listing | null
  onSaved: () => void
}) {
  const { toast } = useToast()
  const editing = listing !== null

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [image, setImage] = useState<ImageSelection>({ kind: 'none' })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  /**
   * The values the form opened with, kept so "has anything changed?" can be
   * answered by comparison rather than by a dirty flag every field has to
   * remember to set.
   */
  const [initial, setInitial] = useState<{ draft: Draft; image: ImageSelection }>({
    draft: EMPTY,
    image: { kind: 'none' },
  })

  const dirty = useMemo(() => {
    if (JSON.stringify(draft) !== JSON.stringify(initial.draft)) return true
    // Images compare by kind and by the value that identifies them; a File
    // object is never equal to itself across renders, so picking one is
    // always a change and re-rendering never is.
    if (image.kind !== initial.image.kind) return true
    if (image.kind === 'existing' && initial.image.kind === 'existing') {
      return image.url !== initial.image.url
    }
    return image.kind === 'file'
  }, [draft, image, initial])

  /** Closing with unsaved edits asks first; closing a clean form does not. */
  function requestClose() {
    if (dirty && !saving) setConfirmDiscard(true)
    else onOpenChange(false)
  }

  // Re-seeded whenever the modal opens, so reopening after a cancel does not
  // present the previous listing's half-edited values.
  useEffect(() => {
    if (!open) return
    const next = listing ? draftFrom(listing) : EMPTY
    const nextImage: ImageSelection = listing?.imageUrl
      ? { kind: 'existing', url: listing.imageUrl }
      : { kind: 'none' }
    setDraft(next)
    setImage(nextImage)
    // Captured alongside, so the dirty check compares against what this
    // opening actually presented rather than against the previous record.
    setInitial({ draft: next, image: nextImage })
    setErrors({})
    setSaving(false)
    setUploading(false)
    setConfirmDiscard(false)
  }, [open, listing])

  const categories = useMemo(() => categoriesForSection(draft.section), [draft.section])

  /** What the public site will actually dial for the number as typed. */
  const phoneHint = useMemo(() => {
    if (!draft.phone.trim()) return 'Optional. Leave blank and no call button is shown.'
    const warning = phoneWarning(draft.phone)
    if (warning) return warning
    const { e164 } = normalizePhone(draft.phone)
    return e164 ? `Will dial ${e164}` : undefined
  }, [draft.phone])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return

    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    const previousUrl = listing?.imageUrl ?? null

    try {
      // 1. The image, if a new one was picked. A failure here stops the save:
      //    writing the row anyway would leave a listing pointing at nothing.
      let imageUrl: string | null
      if (image.kind === 'file') {
        setUploading(true)
        try {
          imageUrl = await uploadListingImage(image.file)
        } finally {
          setUploading(false)
        }
      } else if (image.kind === 'existing') {
        imageUrl = image.url
      } else {
        imageUrl = null
      }

      // 2. The row.
      const input: ListingInput = {
        section: draft.section,
        title: draft.title,
        description: draft.description,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        location: draft.location,
        category: draft.category,
        price: draft.price,
        availability: draft.availability,
        image_url: imageUrl,
        status: draft.status,
        display_order: Number(draft.display_order.trim() || '0'),
      }

      if (editing) await updateListing(listing.id, input)
      else await createListing(input)

      // 3. The image that was just orphaned, if any. Only after the row is
      //    safely written, and only when it is genuinely no longer referenced —
      //    deleting first would strand a live listing without a picture.
      if (previousUrl && previousUrl !== imageUrl) {
        await removeListingImage(previousUrl)
      }

      toast(editing ? 'Listing updated.' : 'Listing created.')
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast(errorMessage(error, 'Could not save the listing.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploading

  return (
    <>
    <AdminModal
      open={open}
      // Intercepted rather than passed through: the overlay click and the
      // Escape key both arrive here, and both would otherwise discard an
      // edited form without asking.
      onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
      locked={busy}
      title={editing ? 'Edit listing' : 'New listing'}
      description={
        editing
          ? 'Changes appear on the public site as soon as it is reloaded.'
          : 'Active listings appear on the public site straight away.'
      }
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={requestClose}>
            Cancel
          </Button>
          {/* Submits the form in the body by id, since the footer sits outside
              it — the footer has to stay out of the scrolling region. */}
          <Button type="submit" form={FORM_ID} disabled={busy}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {uploading ? 'Uploading…' : saving ? 'Saving…' : editing ? 'Save changes' : 'Create listing'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
          <ModalFields>
            <Field label="Section" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.section}
                  disabled={busy}
                  onChange={(e) => {
                    // The category list is scoped to the section, so a category
                    // from the old one would silently stop matching the filter.
                    set('section', e.target.value)
                    set('category', '')
                  }}
                >
                  {LISTING_SECTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Category">
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.category}
                  disabled={busy}
                  onChange={(e) => set('category', e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                  {/* A category saved before the catalogue changed still has to
                      be selectable, or editing anything else on the row would
                      quietly reset it. */}
                  {draft.category && !categories.includes(draft.category as never) && (
                    <option value={draft.category}>{draft.category}</option>
                  )}
                </Select>
              )}
            </Field>

            <Field label="Title" required error={errors.title} wide>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.title}
                  disabled={busy}
                  onChange={(e) => set('title', e.target.value)}
                />
              )}
            </Field>

            <Field label="Description" wide>
              {({ id }) => (
                <TextArea
                  id={id}
                  value={draft.description}
                  disabled={busy}
                  onChange={(e) => set('description', e.target.value)}
                />
              )}
            </Field>

            {/* The hint echoes the number back in the exact form the public
                site will dial, so "will the call button work?" is answered
                while typing rather than after publishing. */}
            <Field label="Phone" error={errors.phone} hint={phoneHint}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  placeholder="01712-345678"
                  aria-describedby={describedBy}
                  value={draft.phone}
                  disabled={busy}
                  onChange={(e) => set('phone', e.target.value)}
                />
              )}
            </Field>

            <Field label="Email" error={errors.email}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  value={draft.email}
                  disabled={busy}
                  onChange={(e) => set('email', e.target.value)}
                />
              )}
            </Field>

            <Field label="Address" wide>
              {({ id }) => (
                <Input
                  id={id}
                  value={draft.address}
                  disabled={busy}
                  onChange={(e) => set('address', e.target.value)}
                />
              )}
            </Field>

            <Field label="Location" hint="Area or upazila, e.g. Kushtia Sadar.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.location}
                  disabled={busy}
                  onChange={(e) => set('location', e.target.value)}
                />
              )}
            </Field>

            <Field label="Price" hint="Free text — “৳500/visit”, “Negotiable”.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.price}
                  disabled={busy}
                  onChange={(e) => set('price', e.target.value)}
                />
              )}
            </Field>

            <Field label="Availability" hint="“24/7”, “Sat–Thu, 9am–5pm”." wide>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.availability}
                  disabled={busy}
                  onChange={(e) => set('availability', e.target.value)}
                />
              )}
            </Field>

            <ImageUpload
              value={image}
              onChange={setImage}
              uploading={uploading}
              disabled={saving && !uploading}
            />

            <Field label="Status" hint="Inactive listings stay hidden from the public site.">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.status}
                  disabled={busy}
                  onChange={(e) => set('status', e.target.value as ListingStatus)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              )}
            </Field>

            <Field
              label="Display order"
              hint="Lower numbers come first."
              error={errors.display_order}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  aria-describedby={describedBy}
                  value={draft.display_order}
                  disabled={busy}
                  onChange={(e) => set('display_order', e.target.value)}
                />
              )}
            </Field>
          </ModalFields>
      </form>
    </AdminModal>

    {/* Sits outside AdminModal so it is not unmounted by the very close it is
        asking about. */}
    <ConfirmDialog
      open={confirmDiscard}
      onOpenChange={setConfirmDiscard}
      title="Discard your changes?"
      description={
        editing
          ? `Your edits to “${listing.title || 'this listing'}” have not been saved. Closing now loses them.`
          : 'This listing has not been created yet. Closing now loses what you have entered.'
      }
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={() => {
        setConfirmDiscard(false)
        onOpenChange(false)
      }}
    />
    </>
  )
}
