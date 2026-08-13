import { requireSupabase } from './supabase'
import { writeAuditLog } from './auth'
import type { RecordStatus } from './db'

/* ==========================================================================
 * Admin data access.
 *
 * Generic on purpose: six entity types need the same list/filter/paginate and
 * the same publish/feature/archive verbs, and six hand-written copies would
 * drift apart within a week.
 *
 * Authorization is not attempted here. Every call below runs as the signed-in
 * user, and the RLS policies decide what it may see and change — an admin
 * screen that queried its way around them would simply come back empty.
 * ========================================================================== */

export type SortSpec = { column: string; ascending: boolean }

export type ListParams = {
  table: string
  select: string
  /** Free text, matched against `searchColumns`. */
  search?: string
  searchColumns?: string[]
  /** Column equality filters. Undefined and null entries are ignored. */
  filters?: Record<string, string | boolean | number | null | undefined>
  /** 'all' includes drafts and archived — the admin default. */
  status?: RecordStatus | 'all'
  sort?: SortSpec
  page?: number
  pageSize?: number
}

export type ListResult<T> = { rows: T[]; total: number; pageCount: number }

/**
 * PostgREST parses `or=(...)` as structured text, so a raw search term can
 * break out of the filter it was meant to sit inside — a comma starts a new
 * condition, a parenthesis closes the group. Wrapping the value in double
 * quotes is the documented escape, which in turn means any embedded double
 * quote and backslash has to be escaped first.
 */
function quoteForOr(term: string): string {
  return `"${term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export async function adminList<T>(params: ListParams): Promise<ListResult<T>> {
  const {
    table,
    select,
    search,
    searchColumns = [],
    filters = {},
    status = 'all',
    sort,
    page = 1,
    pageSize = 25,
  } = params

  const db = requireSupabase()
  let q = db.from(table).select(select, { count: 'exact' })

  if (status !== 'all') q = q.eq('status', status)

  for (const [column, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    q = q.eq(column, value)
  }

  const term = search?.trim()
  if (term && searchColumns.length) {
    // `%` and `_` are ilike wildcards; a user typing them means the literal
    // character, not "match anything".
    const escaped = term.replace(/[%_]/g, (c) => `\\${c}`)
    q = q.or(searchColumns.map((c) => `${c}.ilike.${quoteForOr(`%${escaped}%`)}`).join(','))
  }

  if (sort) q = q.order(sort.column, { ascending: sort.ascending, nullsFirst: false })

  // Server-side windowing: the table never pulls more than one page, however
  // many thousand rows sit behind it.
  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw new Error(`Could not load ${table}: ${error.message}`)

  const total = count ?? 0
  return {
    rows: (data ?? []) as unknown as T[],
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function adminGet<T>(table: string, select: string, id: string): Promise<T | null> {
  const db = requireSupabase()
  const { data, error } = await db.from(table).select(select).eq('id', id).maybeSingle()
  if (error) throw new Error(`Could not load record: ${error.message}`)
  return (data as unknown as T) ?? null
}

/** Who is making the change, for `created_by` / `updated_by` and the audit log. */
export type Actor = { id: string | null; email: string | null }

export async function adminCreate<T extends Record<string, unknown>>(
  table: string,
  values: T,
  actor: Actor,
  label?: string,
): Promise<{ id: string }> {
  const db = requireSupabase()
  const { data, error } = await db
    .from(table)
    .insert({ ...values, created_by: actor.id, updated_by: actor.id })
    .select('id')
    .single()

  if (error) throw new Error(friendly(error.message))

  await writeAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'create',
    entity: table,
    entityId: data.id,
    summary: label ? `Created ${label}` : 'Created',
  })

  return data as { id: string }
}

export async function adminUpdate<T extends Record<string, unknown>>(
  table: string,
  id: string,
  values: T,
  actor: Actor,
  options?: { summary?: string; changes?: Record<string, unknown> },
): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from(table)
    .update({ ...values, updated_by: actor.id })
    .eq('id', id)

  if (error) throw new Error(friendly(error.message))

  await writeAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'update',
    entity: table,
    entityId: id,
    summary: options?.summary ?? 'Updated',
    changes: options?.changes,
  })
}

/**
 * Publish / unpublish / archive.
 *
 * `published_at` is maintained by a trigger, so this only moves `status` —
 * keeping the two in sync is the database's job, not five call sites'.
 */
export async function adminSetStatus(
  table: string,
  id: string,
  status: RecordStatus,
  actor: Actor,
): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from(table).update({ status, updated_by: actor.id }).eq('id', id)
  if (error) throw new Error(friendly(error.message))

  await writeAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish',
    entity: table,
    entityId: id,
    summary:
      status === 'published'
        ? 'Published'
        : status === 'archived'
          ? 'Archived'
          : 'Unpublished — hidden from the public site',
  })
}

export async function adminSetFeatured(
  table: string,
  id: string,
  featured: boolean,
  actor: Actor,
): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from(table).update({ featured, updated_by: actor.id }).eq('id', id)
  if (error) throw new Error(friendly(error.message))

  await writeAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'feature',
    entity: table,
    entityId: id,
    summary: featured ? 'Featured' : 'Removed from featured',
  })
}

/**
 * Permanent delete. Archiving is the default path everywhere in the UI; this
 * exists for records created by mistake, and the confirmation that guards it
 * lives in the component (see components/admin/confirm.tsx).
 */
export async function adminDelete(table: string, id: string, actor: Actor): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from(table).delete().eq('id', id)
  if (error) throw new Error(friendly(error.message))

  await writeAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'delete',
    entity: table,
    entityId: id,
    summary: 'Permanently deleted',
  })
}

/**
 * Postgres speaks to developers, not to the person filling in a form. These
 * are the three failures an admin can actually cause and act on; anything else
 * passes through unchanged rather than being flattened into a vague apology.
 */
function friendly(message: string): string {
  if (/duplicate key|unique constraint/i.test(message)) {
    return 'Something with that slug already exists. Slugs have to be unique.'
  }
  if (/violates foreign key/i.test(message)) {
    return 'That references a record which no longer exists. Reload and try again.'
  }
  if (/row-level security|permission denied/i.test(message)) {
    return 'Your account is not allowed to make that change.'
  }
  return message
}

/** Slug helper — Latin only, so a Bengali-only name still needs one typed. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
