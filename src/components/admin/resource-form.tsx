import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Loader2, Save } from 'lucide-react'

import { BrandLoader } from '@/components/brand-loader'
import { ErrorState } from '@/components/feedback'
import { Field, FormSection, Input, Select, TextArea, ToggleField } from '@/components/admin/form'
import { StatusBadge } from '@/components/admin/resource-list'
import { useToast } from '@/components/admin/toast'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/lib/auth'
import { adminCreate, adminGet, adminUpdate, slugify } from '@/lib/admin-api'
import type { RecordStatus } from '@/lib/db'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Resource form.
 *
 * Driven by a field descriptor so each entity declares its sections once, in
 * the shape §43 asks for — Basic / Contact / Location / Publication — rather
 * than six bespoke forms that each group things slightly differently.
 * ========================================================================== */

export type FieldDef =
  | {
      kind: 'text' | 'textarea' | 'url' | 'tel' | 'email' | 'date' | 'number'
      name: string
      label: string
      hint?: string
      placeholder?: string
      required?: boolean
      wide?: boolean
      /**
       * Editable when creating, frozen afterwards. For a primary key an admin
       * types themselves: changing it later silently orphans everything that
       * references the old value.
       */
      lockedAfterCreate?: boolean
    }
  | {
      kind: 'select'
      name: string
      label: string
      hint?: string
      required?: boolean
      wide?: boolean
      options: { value: string; label: string }[]
    }
  | { kind: 'toggle'; name: string; label: string; hint?: string }
  /**
   * A `text[]` column, edited as a comma-separated line. Not structured text in
   * the sense §43 forbids — the admin types "MBBS, FCPS (Medicine)" the way they
   * would write it anywhere else, and the commas are the separator they already
   * expect. Values containing a comma need a different control; none currently do.
   */
  | { kind: 'list'; name: string; label: string; hint?: string; placeholder?: string; wide?: boolean }

export type SectionDef = { heading: string; description?: string; fields: FieldDef[] }

export type FormConfig = {
  table: string
  select: string
  title: string
  singular: string
  basePath: string
  sections: SectionDef[]
  /** Column holding the display name, used for messages and the slug default. */
  labelField: string
  /** Set when the table has a slug; enables auto-fill from `labelField`. */
  slugField?: string
  hasFeatured?: boolean
  publicPath?: (values: Record<string, unknown>) => string | null
  /** Last chance to normalise before the write. Return a message to block it. */
  validate?: (values: Record<string, unknown>) => string | null
}

type Values = Record<string, unknown>

export function ResourceForm({ config }: { config: FormConfig }) {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { profile } = useAdminAuth()

  const [values, setValues] = useState<Values>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actor = useMemo(
    () => ({ id: profile?.id ?? null, email: profile?.email ?? null }),
    [profile],
  )

  const record = useQuery({
    queryKey: ['admin', config.table, 'record', id],
    queryFn: () => adminGet<Values>(config.table, config.select, id!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (record.data) setValues(record.data)
  }, [record.data])

  function set(name: string, value: unknown) {
    setDirty(true)
    setValues((prev) => {
      const next = { ...prev, [name]: value }
      // Slug follows the name until someone types their own, then stops —
      // silently rewriting a hand-chosen slug breaks every link to it.
      if (
        config.slugField &&
        name === config.labelField &&
        isNew &&
        !prev[`__slug_touched__`]
      ) {
        next[config.slugField] = slugify(String(value ?? ''))
      }
      if (config.slugField && name === config.slugField) next['__slug_touched__'] = true
      return next
    })
  }

  async function save(nextStatus?: RecordStatus) {
    if (saving) return
    setError(null)

    // Built from the declared fields rather than by deleting keys off the
    // loaded row. The select statements pull joined relations and trigger-owned
    // columns for display, and a blacklist would eventually miss one and try to
    // write it back — which Postgres rejects with a message no admin can act on.
    const payload: Values = {}
    for (const section of config.sections) {
      for (const f of section.fields) payload[f.name] = values[f.name] ?? null
    }
    payload.status = nextStatus ?? (values.status as RecordStatus) ?? 'draft'

    const problem = config.validate?.(payload)
    if (problem) {
      setError(problem)
      return
    }

    const label = String(values[config.labelField] ?? config.singular)
    setSaving(true)
    try {
      if (isNew) {
        const created = await adminCreate(config.table, payload, actor, label)
        toast(`${label} created.`)
        setDirty(false)
        navigate(`${config.basePath}/${created.id}`, { replace: true })
      } else {
        await adminUpdate(config.table, id!, payload, actor, { summary: `Updated ${label}` })
        toast('Changes saved.')
        setDirty(false)
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', config.table] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'counts'] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save'
      setError(message)
      toast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && record.isPending) return <BrandLoader className="min-h-[50vh]" />

  if (!isNew && record.isError) {
    return <ErrorState onRetry={() => void record.refetch()} />
  }

  if (!isNew && record.data === null) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
        <h1 className="text-heading">That record no longer exists.</h1>
        <Button asChild variant="secondary" className="mt-5">
          <Link to={config.basePath}>Back to {config.title.toLowerCase()}</Link>
        </Button>
      </div>
    )
  }

  const status = (values.status as RecordStatus) ?? 'draft'
  const previewHref = config.publicPath?.(values) ?? null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back">
          <Link to={config.basePath}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-title">
            {isNew ? `Add ${config.singular}` : String(values[config.labelField] ?? 'Edit')}
          </h1>
          {!isNew && (
            <div className="mt-1.5 flex items-center gap-2">
              <StatusBadge status={status} />
              {status !== 'published' && (
                <span className="text-meta text-ink-subtle">Not visible on the public site</span>
              )}
            </div>
          )}
        </div>

        {!isNew && previewHref && status === 'published' && (
          <Button asChild variant="secondary" size="sm" className="ml-auto">
            <a href={previewHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              View public page
            </a>
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {config.sections.map((section) => (
          <FormSection
            key={section.heading}
            heading={section.heading}
            description={section.description}
          >
            {section.fields.map((f) => renderField(f, values, set, isNew))}
          </FormSection>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-body-sm font-semibold text-danger-ink"
        >
          {error}
        </p>
      )}

      {/* Sticky so the save control stays reachable on a long form. */}
      <div
        className={cn(
          'sticky bottom-0 z-20 mt-5 flex flex-wrap items-center gap-2.5',
          'border-t border-line bg-canvas/90 py-4 backdrop-blur',
        )}
      >
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          Save
        </Button>

        {status === 'published' ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={saving || isNew}
            onClick={() => void save('draft')}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            type="button"
            variant="soft-success"
            size="lg"
            disabled={saving}
            onClick={() => void save('published')}
          >
            Save &amp; publish
          </Button>
        )}

        {dirty && <span className="text-meta text-ink-subtle">Unsaved changes</span>}
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */

function renderField(
  f: FieldDef,
  values: Values,
  set: (name: string, value: unknown) => void,
  isNew: boolean,
) {
  const raw = values[f.name]
  const locked = 'lockedAfterCreate' in f && f.lockedAfterCreate === true && !isNew

  if (f.kind === 'toggle') {
    return (
      <ToggleField
        key={f.name}
        label={f.label}
        hint={f.hint}
        checked={Boolean(raw)}
        onChange={(next) => set(f.name, next)}
      />
    )
  }

  if (f.kind === 'list') {
    const text = Array.isArray(raw) ? (raw as string[]).join(', ') : ''
    return (
      <Field key={f.name} label={f.label} hint={f.hint} wide={f.wide}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            placeholder={f.placeholder}
            defaultValue={text}
            // On blur, not on change: splitting mid-word would fight the typist
            // every time they reached a comma.
            onBlur={(e) =>
              set(
                f.name,
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        )}
      </Field>
    )
  }

  return (
    <Field
      key={f.name}
      label={f.label}
      hint={locked ? 'Fixed once created — other records reference it.' : f.hint}
      required={f.required}
      wide={f.wide}
    >
      {({ id, describedBy }) => {
        if (f.kind === 'select') {
          return (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={raw == null ? '' : String(raw)}
              required={f.required}
              onChange={(e) => set(f.name, e.target.value || null)}
            >
              <option value="">—</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )
        }

        if (f.kind === 'textarea') {
          return (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              placeholder={f.placeholder}
              required={f.required}
              value={raw == null ? '' : String(raw)}
              onChange={(e) => set(f.name, e.target.value || null)}
            />
          )
        }

        const type =
          f.kind === 'number' ? 'number' : f.kind === 'text' ? 'text' : f.kind

        return (
          <Input
            id={id}
            type={type}
            aria-describedby={describedBy}
            placeholder={f.placeholder}
            required={f.required}
            disabled={locked}
            value={raw == null ? '' : String(raw)}
            onChange={(e) => {
              const v = e.target.value
              if (f.kind === 'number') {
                set(f.name, v === '' ? null : Number(v))
              } else {
                set(f.name, v || null)
              }
            }}
          />
        )
      }}
    </Field>
  )
}
