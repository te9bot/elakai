/* ==========================================================================
 * Shrink a photograph before it is uploaded.
 *
 * THE PROBLEM THIS SOLVES
 *
 * A phone camera produces a 12-megapixel JPEG of three to six megabytes. The
 * largest place that image is ever shown on ELAKAI is a listing hero, a few
 * hundred pixels tall; on a card it is a 16:9 thumbnail. So without this, every
 * visitor to a page with six listings on it downloads and decodes tens of
 * megabytes to display a few hundred kilobytes' worth of pixels — on a mobile
 * connection in Kushtia, which is the whole audience.
 *
 * WHY IT IS DONE IN THE BROWSER
 *
 * The usual answer is a resizing service — Supabase Storage has one, and
 * `/storage/v1/render/image/...` would serve a `?width=640` variant of every
 * upload. It is a paid feature. Wiring the public site to an endpoint that
 * answers 400 on this project's plan would replace a slow image with a broken
 * one, so it is not used.
 *
 * The alternative is to make the stored original a sensible size in the first
 * place, which a canvas can do for free, on the device that took the photo,
 * before a single byte crosses the network. It also makes the upload itself
 * faster, which is the part the contributor is actually waiting for.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It never enlarges, never crops, and never converts a small file into a bigger
 * one — an image already within bounds is passed through untouched, byte for
 * byte. And every failure path returns the original file rather than throwing:
 * a contributor's photograph must not be lost because a canvas was unavailable
 * or an encode failed. Downscaling is an optimisation, and an optimisation that
 * can fail the operation it optimises is a bug.
 * ========================================================================== */

/**
 * The long edge, in pixels.
 *
 * 1600 is chosen against how the image is actually used, not as a round number:
 * the widest a listing photograph is ever displayed is the detail page on a
 * large desktop, which is roughly 800 CSS pixels, and 1600 covers that at 2x
 * for a retina display with nothing left over. A gallery view added later would
 * be the reason to raise it.
 */
const MAX_EDGE = 1600

/**
 * JPEG quality for the re-encode.
 *
 * 0.82 is the point where, on photographs of shopfronts and signage, the
 * artefacts stop being visible at 100% zoom. Below about 0.75 the lettering on
 * a sign — which is frequently the entire informational content of the picture
 * — starts to smear.
 */
const QUALITY = 0.82

/** Below this there is nothing worth doing and the original is kept. */
const SKIP_BELOW_BYTES = 400 * 1024

export type ResizeResult = {
  file: File
  /** True when the file actually changed, for the "compressed to…" note. */
  resized: boolean
  originalBytes: number
}

/**
 * PNG is left as PNG, everything else becomes JPEG.
 *
 * A PNG upload is usually a screenshot, a logo or a price list — flat colour
 * and hard edges, which JPEG handles badly and which is often the reason it was
 * a PNG. A photograph re-encoded as JPEG is both smaller and correct. WEBP and
 * AVIF re-encode to JPEG because `canvas.toBlob` support for writing them is
 * inconsistent across the Android browsers this audience uses, and a silent
 * fallback to PNG would produce a file larger than the one we started with.
 */
function outputType(input: string): string {
  return input === 'image/png' ? 'image/png' : 'image/jpeg'
}

function extensionFor(mime: string): string {
  return mime === 'image/png' ? 'png' : 'jpg'
}

function renameTo(name: string, ext: string): string {
  return `${name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`
}

/**
 * Decodes the file at its natural size.
 *
 * `createImageBitmap` where available — it decodes off the main thread, which
 * on a low-end phone is the difference between a brief wait and a frozen tab.
 * The `<img>` path is the fallback for browsers without it.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the img path — some Androids reject certain JPEGs here.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

function dimensionsOf(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return source instanceof HTMLImageElement
    ? { w: source.naturalWidth, h: source.naturalHeight }
    : { w: source.width, h: source.height }
}

/**
 * Returns a smaller version of the file, or the file itself.
 *
 * Never rejects. Every branch that could fail resolves to the original, because
 * losing somebody's only photograph of a pharmacy to a canvas error is a much
 * worse outcome than uploading four megabytes.
 */
export async function downscaleImage(file: File): Promise<ResizeResult> {
  const unchanged: ResizeResult = { file, resized: false, originalBytes: file.size }

  // A small file is already fine, and re-encoding it would usually make it
  // larger while throwing away a generation of quality for nothing.
  if (file.size < SKIP_BELOW_BYTES) return unchanged
  if (typeof document === 'undefined') return unchanged

  let source: ImageBitmap | HTMLImageElement | null = null
  try {
    source = await decode(file)
    if (!source) return unchanged

    const { w, h } = dimensionsOf(source)
    if (!w || !h) return unchanged

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h))

    // Already within bounds. Not re-encoded: a 1200px photo that happens to be
    // 500KB is exactly what we want to store, and running it through the canvas
    // would only cost it quality.
    if (scale === 1) return unchanged

    const width = Math.round(w * scale)
    const height = Math.round(h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return unchanged

    // Browsers downsample in one step by default, which aliases badly at large
    // ratios — a 4000px photo going to 1600px loses fine detail like the text
    // on a signboard. This asks for the better filter.
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(source as CanvasImageSource, 0, 0, width, height)

    const type = outputType(file.type)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY),
    )
    if (!blob) return unchanged

    // The re-encode came out bigger. Possible with an already-optimised source,
    // and the whole point was to make it smaller.
    if (blob.size >= file.size) return unchanged

    return {
      file: new File([blob], renameTo(file.name, extensionFor(type)), {
        type,
        lastModified: Date.now(),
      }),
      resized: true,
      originalBytes: file.size,
    }
  } catch (error) {
    console.warn('[elakai] could not downscale the image; uploading it as-is.', error)
    return unchanged
  } finally {
    // ImageBitmap holds decoded pixels off-heap until it is closed. Skipping
    // this leaks the full-size bitmap of every image the person picks.
    if (source && 'close' in source) source.close()
  }
}
