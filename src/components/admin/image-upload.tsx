import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  ACCEPT_ATTR,
  formatBytes,
  MAX_IMAGE_BYTES,
  validateImage,
} from '@/lib/listings-admin'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * Listing image picker.
 *
 * Chooses a file; it does not upload one. The upload happens when the form is
 * saved, so abandoning a half-filled modal cannot leave an orphaned object in
 * the bucket that nothing references.
 *
 * The three states below are kept explicit rather than inferred from a pair of
 * nullable fields, because "no image" and "the existing image was removed" have
 * to be told apart: the first leaves `image_url` alone, the second clears it.
 * ========================================================================== */

export type ImageSelection =
  /** Nothing chosen — on an edit, this means keep whatever is already stored. */
  | { kind: 'none' }
  /** The image already saved against this listing. */
  | { kind: 'existing'; url: string }
  /** A newly picked file, not yet uploaded. */
  | { kind: 'file'; file: File }

export function ImageUpload({
  value,
  onChange,
  uploading = false,
  disabled = false,
}: {
  value: ImageSelection
  onChange: (next: ImageSelection) => void
  uploading?: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A drag that crosses a child element fires dragleave on the parent, so the
  // highlight is driven by a counter rather than by the last event to arrive.
  const dragDepth = useRef(0)

  const busy = uploading || disabled

  /**
   * Object URLs are created for the preview and revoked when the selection
   * changes or the component unmounts — without that, picking six images in a
   * row leaks all six blobs for the life of the page.
   */
  const previewUrl = useMemo(() => {
    if (value.kind === 'file') return URL.createObjectURL(value.file)
    if (value.kind === 'existing') return value.url
    return null
  }, [value])

  useEffect(() => {
    if (value.kind !== 'file' || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [value, previewUrl])

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return
      const invalid = validateImage(file)
      if (invalid) {
        setError(invalid)
        return
      }
      setError(null)
      onChange({ kind: 'file', file })
    },
    [onChange],
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (busy) return
    accept(e.dataTransfer.files?.[0])
  }

  function clear() {
    setError(null)
    onChange({ kind: 'none' })
    // Without this the same file cannot be re-picked after removing it: the
    // input still holds the old value, so choosing it again fires no change.
    if (inputRef.current) inputRef.current.value = ''
  }

  const hasImage = value.kind !== 'none'

  // `min-w-0` so the dropzone can never set the grid column's minimum width and
  // push the modal wider than the viewport.
  return (
    <div className="min-w-0 sm:col-span-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        disabled={busy}
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {hasImage ? (
        <div className="overflow-hidden rounded-card border border-line bg-canvas">
          {/* `contain` rather than `cover`: this is the admin's check that they
              picked the right file, so it has to show the whole image — a crop
              can hide exactly the part that is wrong. The public card crops to
              its own aspect ratio separately. */}
          <div className="relative grid max-h-[300px] place-items-center bg-surface-2 p-2">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected listing image"
                className="max-h-[284px] max-w-full object-contain"
              />
            )}

            {uploading && (
              <div className="absolute inset-0 grid place-items-center bg-ink/55 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                  <p className="text-meta font-bold">Uploading…</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">
                {value.kind === 'file' ? value.file.name : 'Current image'}
              </p>
              <p className="text-meta text-ink-subtle">
                {value.kind === 'file'
                  ? `${formatBytes(value.file.size)} — uploads when you save`
                  : 'Already saved to this listing'}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw aria-hidden="true" />
                Replace
              </Button>
              <Button variant="soft-danger" size="sm" disabled={busy} onClick={clear}>
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={(e) => {
            e.preventDefault()
            dragDepth.current += 1
            if (!busy) setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault()
            dragDepth.current = Math.max(0, dragDepth.current - 1)
            if (dragDepth.current === 0) setDragging(false)
          }}
          onDrop={onDrop}
          className={cn(
            'rounded-card border-2 border-dashed p-6 text-center transition-colors duration-150',
            dragging ? 'border-primary bg-primary-soft/50' : 'border-line bg-canvas',
            busy && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'mx-auto grid size-12 place-items-center rounded-full transition-colors',
              dragging ? 'bg-primary text-white' : 'bg-surface-2 text-ink-muted',
            )}
          >
            {dragging ? (
              <UploadCloud className="size-5" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
          </span>

          <p className="mt-3 text-body-sm font-semibold text-ink">
            Drag an image here, or
          </p>

          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </Button>

          <p className="mt-3 text-meta text-ink-subtle">
            JPG, PNG, WEBP or GIF — up to {formatBytes(MAX_IMAGE_BYTES)}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-2 text-meta font-semibold text-danger"
        >
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
