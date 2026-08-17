import { requireSupabase } from './supabase'

/* ==========================================================================
 * Contributor image uploads.
 *
 * Separate from `uploadListingImage` in lib/listings-admin.ts, which uploads to
 * `elakai-images` as an administrator. This uploads to `elakai-submissions` as
 * whoever is signed in, and the difference that matters is the path.
 *
 * OWNERSHIP IS THE FIRST PATH SEGMENT
 *
 *     <auth uid>/<uuid>-<sanitised name>.<ext>
 *
 * The storage policies in migration 0008 compare `(storage.foldername(name))[1]`
 * to `auth.uid()`, so a contributor can write into their own folder and nowhere
 * else. This is not a convention the client is trusted to follow: composing the
 * path here is a convenience, and the policy is what makes an upload to
 * `someone-elses-uid/...` fail at the server whatever this file does.
 *
 * WHAT THE BROWSER CHECKS, AND WHAT ACTUALLY ENFORCES IT
 *
 * `validateSubmissionImage` below runs in the browser, which means it is advice
 * — it exists so somebody who picked a 40 MB RAW file learns that in the file
 * picker rather than after ninety seconds of upload. The enforcement is the
 * bucket's own `allowed_mime_types` and `file_size_limit`, declared in the
 * migration, which reject a renamed executable regardless of what this file
 * decided. §24 of the brief asks for both, and both are here — but only one of
 * them is a control.
 * ========================================================================== */

export const SUBMISSION_BUCKET = 'elakai-submissions'

/**
 * Kept in step with `allowed_mime_types` on the bucket. AVIF is accepted by the
 * bucket and offered here; GIF is not, because an animated GIF on a pharmacy
 * card is never what the contributor meant and the bucket would refuse it.
 */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

/** Matches the bucket's `file_size_limit`. Both must move together. */
export const MAX_BYTES = 5 * 1024 * 1024

export const ACCEPT_ATTR =
  '.jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/**
 * Below this, a photograph of a shopfront is a thumbnail somebody screenshotted
 * — legible on the phone that took it, useless on the listing page. Warned
 * about rather than refused: an admin can still judge whether it is good enough,
 * and refusing the only picture somebody has is worse than showing a small one.
 */
const MIN_USEFUL_EDGE = 320

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Returns a message when the file cannot be used, or null when it can. */
export function validateSubmissionImage(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'That file type is not supported. Use JPG, PNG, WEBP or AVIF.'
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_BYTES)}.`
  }
  return null
}

/**
 * Reads the pixel dimensions, for the "this is very small" warning.
 *
 * Resolves to null rather than rejecting when the file cannot be decoded: a
 * dimension check is not worth failing an upload over, and the bucket's MIME
 * check has already established this is an image.
 */
export function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** A soft warning about an image that will upload fine and look poor. */
export async function imageQualityWarning(file: File): Promise<string | null> {
  const size = await readImageSize(file)
  if (!size) return null
  if (Math.min(size.width, size.height) < MIN_USEFUL_EDGE) {
    return `This image is only ${size.width}×${size.height}. A larger photo shows up much better on the listing.`
  }
  return null
}

/**
 * Strips a filename down to something safe in a storage key.
 *
 * Storage paths are URL path segments, so anything that could change how the
 * path parses — slashes, dots, spaces, non-ASCII — collapses to a hyphen.
 * Bengali filenames are common here and would otherwise arrive percent-encoded
 * and unreadable in the bucket listing. When nothing survives, the uuid alone
 * still names the object.
 */
function safeName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function uniqueId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export type UploadedImage = {
  /** The public URL to store on the submission and, later, on the listing. */
  url: string
  /** The object key, kept so the uploader can remove its own file. */
  path: string
}

/**
 * Uploads one image into the signed-in contributor's own folder.
 *
 * `upsert: false` is a guarantee rather than a convention: a name collision
 * fails the upload instead of silently replacing whatever was there. Combined
 * with a uuid in every key, one contributor cannot overwrite another's file
 * even if the storage policy were somehow permissive — and the storage policy
 * is not permissive.
 */
export async function uploadSubmissionImage(file: File): Promise<UploadedImage> {
  const invalid = validateSubmissionImage(file)
  if (invalid) throw new Error(invalid)

  const db = requireSupabase()

  const { data: auth } = await db.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You need to be signed in to upload an image.')

  const ext = EXT_BY_TYPE[file.type] ?? 'jpg'
  const label = safeName(file.name)
  const path = `${userId}/${uniqueId()}${label ? `-${label}` : ''}.${ext}`

  const { error } = await db.storage.from(SUBMISSION_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })

  if (error) {
    console.error(
      `[elakai] submission image upload failed.\n  bucket: ${SUBMISSION_BUCKET}\n` +
        `  path: ${path}\n  reason: ${error.message}`,
    )
    if (/bucket not found/i.test(error.message)) {
      throw new Error('Image uploads are not switched on for this site yet.')
    }
    if (/mime type|not supported/i.test(error.message)) {
      throw new Error('That file type is not supported. Use JPG, PNG, WEBP or AVIF.')
    }
    if (/exceeded the maximum allowed size|payload too large/i.test(error.message)) {
      throw new Error(`That image is larger than the ${formatBytes(MAX_BYTES)} limit.`)
    }
    if (/row-level security|not authorized|permission/i.test(error.message)) {
      throw new Error('Your account is not allowed to upload that.')
    }
    throw new Error('The image could not be uploaded. Please try again.')
  }

  const { data } = db.storage.from(SUBMISSION_BUCKET).getPublicUrl(path)
  const publicUrl = data?.publicUrl?.trim()

  /*
   * The object is in the bucket at this point, so a failure here is the one
   * that used to be invisible on the admin side of this project: the upload
   * reported success, the row was saved, and the site had nothing to render. It
   * stops the save rather than storing a null, because writing the row without
   * the image would silently discard a photograph the contributor can see they
   * just picked.
   */
  if (!publicUrl) {
    console.error(
      `[elakai] submission image uploaded but no public URL came back.\n` +
        `  bucket: ${SUBMISSION_BUCKET}\n  path: ${path}\n` +
        `  The object is in storage; the URL could not be derived from it.`,
    )
    throw new Error('The image uploaded but no address came back for it.')
  }

  if (!publicUrl.includes(PUBLIC_PREFIX)) {
    console.error(
      `[elakai] submission image URL does not match the expected storage path.\n` +
        `  expected to contain: ${PUBLIC_PREFIX}\n  got: ${publicUrl}`,
    )
  }

  return { url: publicUrl, path }
}

const PUBLIC_PREFIX = `/storage/v1/object/public/${SUBMISSION_BUCKET}/`

/**
 * The object path inside `elakai-submissions` for a stored public URL, or null.
 *
 * Null for anything this app did not put there — an admin image from the other
 * bucket, a URL shape we do not recognise. Callers use that to decide whether
 * an object is theirs to remove, so guessing wrong here would mean trying to
 * delete somebody else's file. (The storage policy would refuse it; that is not
 * a reason to ask.)
 */
export function submissionImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const at = url.indexOf(PUBLIC_PREFIX)
  if (at === -1) return null
  const path = url.slice(at + PUBLIC_PREFIX.length).split(/[?#]/)[0]
  return path ? decodeURIComponent(path) : null
}

/**
 * Removes an uploaded image.
 *
 * Reports success as a boolean rather than throwing: this runs as cleanup after
 * the thing it belongs to is already gone, and a failure to tidy up a file must
 * not be reported as "the delete failed" when the delete did happen.
 */
export async function removeSubmissionImage(url: string | null | undefined): Promise<boolean> {
  const path = submissionImagePath(url)
  if (!path) return false
  try {
    const { error } = await requireSupabase().storage.from(SUBMISSION_BUCKET).remove([path])
    if (error) {
      console.warn('[elakai] could not remove submission image:', error.message)
      return false
    }
    return true
  } catch (error) {
    console.warn('[elakai] could not remove submission image:', error)
    return false
  }
}
