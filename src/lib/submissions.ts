import { requireSupabase, supabase } from './supabase'
import { fromServiceList, toServiceList } from './listings'
import { toStoredPhone } from './phone'

/* ==========================================================================
 * `public.submissions` — the contributor half of the data layer.
 *
 * Mirrors the structure of lib/listings-admin.ts on purpose: same error
 * translation, same "nulls not empty strings" convention, same explicit column
 * lists. A submission is a proposed listing, so the two should not need two
 * different mental models.
 *
 * AUTHORIZATION IS NOT ATTEMPTED HERE
 *
 * Every call runs as the signed-in user and the RLS policies in migration 0008
 * decide what it may see and change. Nothing in this file checks whether the
 * caller owns a row before asking for it, because that check would be
 * decoration: a client can skip its own checks. `submissions_own_read` is what
 * makes `getSubmission(someoneElsesId)` return null rather than their phone
 * number, and it does that inside Postgres.
 *
 * The two operations that carry authority — publishing, and paying — are not
 * here at all. They are RPCs into SECURITY DEFINER functions, at the bottom of
 * this file, because a table write that the client composes is a table write
 * the client can compose differently.
 * ========================================================================== */

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

/** A submission as the UI works with it: nulls resolved, names in app casing. */
export type Submission = {
  id: string
  submittedBy: string
  section: string
  category: string
  subcategory: string
  title: string
  description: string
  phone: string
  altPhone: string
  email: string
  address: string
  location: string
  mapsUrl: string
  price: string
  availability: string
  services: string[]
  imageUrl: string | null
  status: SubmissionStatus
  submittedAt: string
  updatedAt: string
  reviewedAt: string | null
  approvedAt: string | null
  rejectionReason: string
  rejectionDetail: string
  /** Set when this submission proposes a change to an already-published row. */
  targetListingId: number | null
  /** Set once approved: the public listing this became. */
  publishedListingId: number | null
  /** Advisory flag from the insert trigger. Never blocks anything. */
  duplicateHint: string
  /** Only ever populated on the admin queries below. */
  contributor?: ContributorSummary
}

export type ContributorSummary = {
  id: string
  email: string
  fullName: string | null
  points: number
  joinedAt: string | null
}

const SUBMISSION_SELECT =
  'id, submitted_by, section, category, subcategory, title, description, phone, ' +
  'alt_phone, email, address, location, maps_url, price, availability, services, ' +
  'image_url, status, submitted_at, updated_at, reviewed_at, approved_at, ' +
  'rejection_reason, rejection_detail, target_listing_id, published_listing_id, ' +
  'duplicate_hint'

/**
 * The same select with the contributor's profile joined on.
 *
 * Readable only by an admin: `profiles_self_read` returns the caller's own row
 * or every row to an admin, so this embed silently yields null for a
 * contributor rather than leaking a name. That is the right failure — the
 * contributor's own screens never ask for it.
 */
const SUBMISSION_SELECT_WITH_CONTRIBUTOR =
  `${SUBMISSION_SELECT}, profiles!submissions_submitted_by_fkey (id, email, full_name, points, created_at)`

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Postgres speaks to developers. This translates the failures a contributor or
 * an admin can actually cause into something they can act on, and passes
 * anything else through unchanged rather than flattening every problem into the
 * same shrug. §61 of the brief: no raw database errors in front of a visitor.
 */
function friendly(message: string): string {
  if (/too many submissions/i.test(message)) {
    return 'You have sent several submissions in a short time. Please try again shortly.'
  }
  if (/daily submission limit/i.test(message)) {
    return 'You have reached the daily submission limit. Please try again tomorrow.'
  }
  if (/status is changed by approve_submission/i.test(message)) {
    return 'A submission is published or refused from the review screen, not by editing it.'
  }
  if (/cannot be edited/i.test(message)) {
    return 'This has already been reviewed. Submit an update instead of editing it.'
  }
  if (/insufficient_privilege|only an administrator/i.test(message)) {
    return 'Your account is not allowed to do that.'
  }
  if (/row-level security|permission denied|not authorized/i.test(message)) {
    return 'Your account is not allowed to do that.'
  }
  if (/could not find the table|does not exist/i.test(message)) {
    return 'Contributions are not switched on for this site yet.'
  }
  if (/payload too large|exceeded the maximum allowed size/i.test(message)) {
    return 'That file is larger than the limit.'
  }
  if (/jwt|expired|invalid token/i.test(message)) {
    return 'Your session has expired. Sign in again and retry.'
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}

export function submissionError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error) return friendly(error.message)
  if (typeof error === 'string') return friendly(error)
  return fallback
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function toContributor(value: unknown): ContributorSummary | undefined {
  // PostgREST returns an embedded one-to-one as an object, but returns an array
  // when it cannot prove the relationship is unique. Both shapes are accepted
  // rather than assumed, because which one arrives depends on the foreign key
  // metadata rather than on anything this file controls.
  const row = (Array.isArray(value) ? value[0] : value) as Row | null | undefined
  if (!row || typeof row !== 'object') return undefined
  return {
    id: str(row.id),
    email: str(row.email),
    fullName: str(row.full_name) || null,
    points: num(row.points) ?? 0,
    joinedAt: str(row.created_at) || null,
  }
}

function toSubmission(row: Row): Submission {
  const status = row.status
  return {
    id: str(row.id),
    submittedBy: str(row.submitted_by),
    section: str(row.section),
    category: str(row.category),
    subcategory: str(row.subcategory),
    title: str(row.title),
    description: str(row.description),
    phone: str(row.phone),
    altPhone: str(row.alt_phone),
    email: str(row.email),
    address: str(row.address),
    location: str(row.location),
    mapsUrl: str(row.maps_url),
    price: str(row.price),
    availability: str(row.availability),
    services: toServiceList(row.services),
    imageUrl: str(row.image_url) || null,
    // Anything unrecognised reads as pending: it is the state that publishes
    // nothing and pays nothing, so an unexpected value fails closed.
    status:
      status === 'approved' || status === 'rejected' ? status : 'pending',
    submittedAt: str(row.submitted_at),
    updatedAt: str(row.updated_at) || str(row.submitted_at),
    reviewedAt: str(row.reviewed_at) || null,
    approvedAt: str(row.approved_at) || null,
    rejectionReason: str(row.rejection_reason),
    rejectionDetail: str(row.rejection_detail),
    targetListingId: num(row.target_listing_id),
    publishedListingId: num(row.published_listing_id),
    duplicateHint: str(row.duplicate_hint),
    contributor: toContributor(row.profiles),
  }
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/** The editable half of a submission — what the contributor form produces. */
export type SubmissionInput = {
  section: string
  category: string
  subcategory: string
  title: string
  description: string
  phone: string
  altPhone: string
  email: string
  address: string
  location: string
  mapsUrl: string
  price: string
  availability: string
  services: string[]
  imageUrl: string | null
  /** Set when proposing a change to an already-published listing. */
  targetListingId?: number | null
}

/** Blank optional text is stored as null rather than as an empty string. */
function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toRow(input: SubmissionInput) {
  return {
    section: input.section.trim(),
    category: nullable(input.category),
    subcategory: nullable(input.subcategory),
    title: input.title.trim(),
    description: nullable(input.description),
    // Stored canonical (+8801XXXXXXXXX), the same normalisation the admin write
    // path applies, so an approved submission dials identically to a listing
    // typed in by hand. Unparseable input is kept verbatim rather than
    // discarded — the form has already warned, and losing what somebody typed
    // is worse than storing it oddly.
    phone: toStoredPhone(input.phone),
    alt_phone: toStoredPhone(input.altPhone),
    email: nullable(input.email),
    address: nullable(input.address),
    location: nullable(input.location),
    maps_url: nullable(input.mapsUrl),
    price: nullable(input.price),
    availability: nullable(input.availability),
    services: fromServiceList(input.services),
    image_url: input.imageUrl,
  }
}

/**
 * Files a new submission.
 *
 * `submitted_by` is written from the live session rather than taken from the
 * caller. The RLS policy checks it against `auth.uid()` anyway, so passing
 * somebody else's id would be refused — but composing it here means the refusal
 * is never reached, and there is no parameter for a caller to get wrong.
 *
 * Note what is absent: `status`. The column defaults to 'pending' and
 * `authenticated` holds no INSERT grant on it, so a submission cannot be filed
 * pre-approved even by a request built by hand.
 */
export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const db = requireSupabase()

  const { data: auth } = await db.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You need to be signed in to submit information.')

  const { data, error } = await db
    .from('submissions')
    .insert({
      ...toRow(input),
      submitted_by: userId,
      target_listing_id: input.targetListingId ?? null,
    })
    .select(SUBMISSION_SELECT)
    .single()

  if (error) throw new Error(friendly(error.message))
  return toSubmission(data as unknown as Row)
}

/**
 * Edits a submission that is still pending.
 *
 * Reachable by the contributor who filed it and by an admin correcting it
 * before approval (§34). Both are the same UPDATE; the two policies that permit
 * it differ, and neither can move `status` — that is the trigger's job.
 */
export async function updateSubmission(
  id: string,
  input: SubmissionInput,
): Promise<Submission> {
  const { data, error } = await requireSupabase()
    .from('submissions')
    .update(toRow(input))
    .eq('id', id)
    .select(SUBMISSION_SELECT)
    .single()

  if (error) throw new Error(friendly(error.message))
  return toSubmission(data as unknown as Row)
}

/** Withdraws a pending submission. Approved and rejected rows are records. */
export async function deleteSubmission(id: string): Promise<void> {
  const { error } = await requireSupabase().from('submissions').delete().eq('id', id)
  if (error) throw new Error(friendly(error.message))
}

/* ------------------------------------------------------------------ */
/* Reading — contributor                                               */
/* ------------------------------------------------------------------ */

export async function listMySubmissions(): Promise<Submission[]> {
  const { data, error } = await requireSupabase()
    .from('submissions')
    .select(SUBMISSION_SELECT)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(friendly(error.message))
  return ((data ?? []) as unknown as Row[]).map(toSubmission)
}

/**
 * One submission.
 *
 * Returns null for an id with no row *the caller may see*, which covers both
 * "no such submission" and "somebody else's submission". Those are deliberately
 * not distinguished: telling an attacker that id 4f2a… exists but is not theirs
 * is the enumeration half of an IDOR, and the person legitimately hitting a
 * stale bookmark cannot act on the difference either.
 */
export async function getSubmission(id: string): Promise<Submission | null> {
  const { data, error } = await requireSupabase()
    .from('submissions')
    .select(SUBMISSION_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(friendly(error.message))
  return data ? toSubmission(data as unknown as Row) : null
}

export type ContributionStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  points: number
}

/**
 * The dashboard's five numbers, counted in Postgres.
 *
 * One RPC rather than five HEAD counts plus a profile read: six round trips on
 * a phone in Kushtia is the difference between a dashboard that appears and one
 * that assembles itself in front of you.
 */
export async function myContributionStats(): Promise<ContributionStats> {
  const { data, error } = await requireSupabase().rpc('my_contribution_stats')
  if (error) throw new Error(friendly(error.message))

  const stats = (data ?? {}) as Record<string, unknown>
  return {
    total: num(stats.total) ?? 0,
    pending: num(stats.pending) ?? 0,
    approved: num(stats.approved) ?? 0,
    rejected: num(stats.rejected) ?? 0,
    points: num(stats.points) ?? 0,
  }
}

export type PointsEntry = {
  id: number
  points: number
  reason: string
  createdAt: string
  submissionId: string | null
  submissionTitle: string | null
}

/** The ledger behind the balance, newest first. */
export async function listMyPoints(): Promise<PointsEntry[]> {
  const { data, error } = await requireSupabase()
    .from('points_transactions')
    .select('id, points, reason, created_at, submission_id, submissions (title)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(friendly(error.message))

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const joined = Array.isArray(row.submissions) ? row.submissions[0] : row.submissions
    return {
      id: num(row.id) ?? 0,
      points: num(row.points) ?? 0,
      reason: str(row.reason),
      createdAt: str(row.created_at),
      submissionId: str(row.submission_id) || null,
      submissionTitle: str((joined as Row | undefined)?.title) || null,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Reading — admin                                                     */
/* ------------------------------------------------------------------ */

export type AdminQueue = SubmissionStatus | 'all'

/**
 * The moderation queue.
 *
 * Unpaginated, matching `adminListListings`: the point of the screen is to see
 * everything waiting at once. If the pending queue ever runs to thousands, this
 * is the function that needs a range — not the component.
 */
export async function adminListSubmissions(queue: AdminQueue = 'pending'): Promise<Submission[]> {
  let q = requireSupabase()
    .from('submissions')
    .select(SUBMISSION_SELECT_WITH_CONTRIBUTOR)

  if (queue !== 'all') q = q.eq('status', queue)

  // Oldest first while pending — a review queue is a queue, and the person who
  // submitted on Tuesday should not wait behind Friday's arrivals. Everything
  // else is a history, so it reads newest first.
  const { data, error } = await q.order('submitted_at', { ascending: queue === 'pending' })

  if (error) throw new Error(friendly(error.message))
  return ((data ?? []) as unknown as Row[]).map(toSubmission)
}

export async function adminGetSubmission(id: string): Promise<Submission | null> {
  const { data, error } = await requireSupabase()
    .from('submissions')
    .select(SUBMISSION_SELECT_WITH_CONTRIBUTOR)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(friendly(error.message))
  return data ? toSubmission(data as unknown as Row) : null
}

/** Counts for the admin sidebar badge and dashboard tiles. */
export async function adminSubmissionCounts(): Promise<Record<SubmissionStatus, number>> {
  const db = requireSupabase()
  const base = (status: SubmissionStatus) =>
    db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', status)

  const [pending, approved, rejected] = await Promise.all([
    base('pending'),
    base('approved'),
    base('rejected'),
  ])

  const failed = pending.error ?? approved.error ?? rejected.error
  if (failed) throw new Error(friendly(failed.message))

  return {
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
  }
}

/** Everyone who holds an account, for the admin's Contributors screen. */
export async function adminListContributors(): Promise<ContributorSummary[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, email, full_name, points, created_at')
    .order('points', { ascending: false })

  if (error) throw new Error(friendly(error.message))
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: str(row.id),
    email: str(row.email),
    fullName: str(row.full_name) || null,
    points: num(row.points) ?? 0,
    joinedAt: str(row.created_at) || null,
  }))
}

/* ------------------------------------------------------------------ */
/* Moderation                                                          */
/* ------------------------------------------------------------------ */

export type ApprovalResult = {
  status: string
  listingId: number | null
  pointsAwarded: number
  /**
   * True when the submission had already been reviewed before this call — a
   * double-click, a retried request, a second admin on the same queue. The
   * caller says "already reviewed" rather than "approved, +50", which would be
   * a lie: the second approval awards nothing.
   */
  alreadyReviewed: boolean
}

/**
 * Publishes a submission and pays the contributor.
 *
 * An RPC rather than a sequence of writes from here, and this is the single
 * most important line in the file. Doing it client-side would mean the browser
 * issuing "set status = approved", "insert into listings", "add 50 points" as
 * three separate authenticated requests — which is three chances to send the
 * third one on its own, and a partial failure that leaves a submission marked
 * approved with nothing published.
 *
 * As one function it is one transaction: admin checked, row locked, still
 * pending, listing written, points inserted under a unique index that makes a
 * second award impossible. Either all of that happened or none of it did.
 *
 * `edits` carries the admin's corrections so a nearly-right submission can be
 * fixed and approved in one action (§34). Only the keys named in the function's
 * whitelist are applied; anything else is ignored rather than executed.
 */
export async function approveSubmission(
  id: string,
  edits?: Partial<SubmissionInput>,
): Promise<ApprovalResult> {
  const payload = edits ? editsToJson(edits) : null

  const { data, error } = await requireSupabase().rpc('approve_submission', {
    p_submission_id: id,
    p_edits: payload,
  })

  if (error) throw new Error(friendly(error.message))

  const result = (data ?? {}) as Record<string, unknown>
  return {
    status: str(result.status) || 'approved',
    listingId: num(result.listing_id),
    pointsAwarded: num(result.points_awarded) ?? 0,
    alreadyReviewed: result.already_reviewed === true,
  }
}

/** The fixed reasons the review screen offers, plus room for the admin's own. */
export const REJECTION_REASONS = [
  'Incorrect information',
  'Duplicate listing',
  'Invalid phone number',
  'Wrong location',
  'Insufficient information',
  'Invalid image',
  'Spam',
  'Other',
] as const

export async function rejectSubmission(
  id: string,
  reason: string,
  detail?: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc('reject_submission', {
    p_submission_id: id,
    p_reason: reason,
    p_detail: detail?.trim() || null,
  })
  if (error) throw new Error(friendly(error.message))
}

/** Column-named jsonb for `approve_submission`'s edit whitelist. */
function editsToJson(edits: Partial<SubmissionInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (edits.title !== undefined) out.title = edits.title.trim()
  if (edits.description !== undefined) out.description = edits.description.trim()
  if (edits.phone !== undefined) out.phone = toStoredPhone(edits.phone)
  if (edits.altPhone !== undefined) out.alt_phone = toStoredPhone(edits.altPhone)
  if (edits.email !== undefined) out.email = edits.email.trim()
  if (edits.address !== undefined) out.address = edits.address.trim()
  if (edits.location !== undefined) out.location = edits.location.trim()
  if (edits.mapsUrl !== undefined) out.maps_url = edits.mapsUrl.trim()
  if (edits.price !== undefined) out.price = edits.price.trim()
  if (edits.availability !== undefined) out.availability = edits.availability.trim()
  if (edits.section !== undefined) out.section = edits.section
  if (edits.category !== undefined) out.category = edits.category
  if (edits.subcategory !== undefined) out.subcategory = edits.subcategory
  if (edits.imageUrl !== undefined) out.image_url = edits.imageUrl ?? ''
  if (edits.services !== undefined) out.services = fromServiceList(edits.services)
  return out
}

/* ------------------------------------------------------------------ */
/* Editing something already published                                 */
/* ------------------------------------------------------------------ */

/**
 * Seeds a submission form from a live listing, for §35 — a contributor
 * proposing a change to something already public.
 *
 * The listing is read through the ordinary public policy, so this can only ever
 * pre-fill from a row that is already visible to everyone. The proposal it
 * produces is an ordinary pending submission carrying `targetListingId`; the
 * public row is not touched until an admin approves, which is the whole point.
 */
export async function seedFromListing(listingId: number): Promise<SubmissionInput | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, section, category, title, description, phone, email, address, ' +
        'location, price, availability, image_url',
    )
    .eq('id', listingId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as Row

  return {
    section: str(row.section),
    category: str(row.category),
    subcategory: '',
    title: str(row.title),
    description: str(row.description),
    phone: str(row.phone),
    altPhone: '',
    email: str(row.email),
    address: str(row.address),
    location: str(row.location),
    mapsUrl: '',
    price: str(row.price),
    availability: str(row.availability),
    services: [],
    imageUrl: str(row.image_url) || null,
    targetListingId: listingId,
  }
}
