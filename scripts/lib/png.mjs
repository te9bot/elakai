import { inflateSync } from 'node:zlib'

/**
 * Just enough PNG to read the brand artwork: 8-bit, non-interlaced, RGB or
 * RGBA. Not a general decoder — it throws on anything the logo files are not,
 * because silently mis-reading the source would corrupt every shape traced out
 * of it.
 */
export function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')

  let width = 0
  let height = 0
  let channels = 0
  const idat = []

  for (let at = 8; at < buffer.length; ) {
    const length = buffer.readUInt32BE(at)
    const type = buffer.toString('ascii', at + 4, at + 8)
    const body = buffer.subarray(at + 8, at + 8 + length)
    at += length + 12

    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      const depth = body[8]
      const colorType = body[9]
      const interlace = body[12]
      if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`)
      if (interlace !== 0) throw new Error('interlaced PNGs are not supported')
      if (colorType === 2) channels = 3
      else if (colorType === 6) channels = 4
      else throw new Error(`unsupported colour type ${colorType}`)
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(width * height * 4)

  // Undo the per-scanline filters. `prior` is the already-reconstructed row
  // above, which is what filter types 2-4 predict from.
  let prior = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0
      const b = prior[i]
      const c = i >= channels ? prior[i - channels] : 0
      let value = line[i]

      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) {
        throw new Error(`unknown filter ${filter} on row ${y}`)
      }

      line[i] = value & 0xff
    }

    for (let x = 0; x < width; x++) {
      const from = x * channels
      const to = (y * width + x) * 4
      out[to] = line[from]
      out[to + 1] = line[from + 1]
      out[to + 2] = line[from + 2]
      out[to + 3] = channels === 4 ? line[from + 3] : 255
    }

    prior = line
  }

  return { width, height, data: out }
}
