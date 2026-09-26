// Generates placeholder PWA icons (a simple storefront) into public/.
// No dependencies: writes PNGs with node:zlib. Replace the output with real artwork anytime.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [4, 120, 87] // emerald-700
const WHITE = [255, 255, 255]
const LIGHT = [167, 243, 208] // emerald-200
const DARK = [6, 95, 70] // emerald-800

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixel) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Storefront in unit coordinates (u, v in 0..1) inside the padded content box. */
function storefront(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return BG
  const stripes = 6
  const stripe = Math.min(stripes - 1, Math.floor(u * stripes))
  const stripeColor = stripe % 2 === 0 ? WHITE : LIGHT
  if (v >= 0.1 && v < 0.14 && u >= 0.02 && u <= 0.98) return WHITE // roof
  if (v >= 0.14 && v < 0.36) return stripeColor // awning
  if (v >= 0.36 && v < 0.36 + 1 / (stripes * 2)) {
    const cx = (stripe + 0.5) / stripes
    const r = 1 / (stripes * 2)
    if ((u - cx) ** 2 + (v - 0.36) ** 2 <= r * r) return stripeColor // scallops
  }
  if (u >= 0.1 && u <= 0.9 && v >= 0.42 && v <= 0.9) {
    if (u >= 0.4 && u <= 0.6 && v >= 0.58) return DARK // door
    if (v >= 0.5 && v <= 0.68 && ((u >= 0.16 && u <= 0.34) || (u >= 0.66 && u <= 0.84))) return LIGHT
    return WHITE
  }
  return BG
}

function icon(size, padding) {
  const inner = size * (1 - padding * 2)
  const offset = size * padding
  return encodePng(size, (x, y) => storefront((x - offset) / inner, (y - offset) / inner))
}

const outputs = [
  ['public/pwa-192x192.png', 192, 0.12],
  ['public/pwa-512x512.png', 512, 0.12],
  ['public/maskable-512x512.png', 512, 0.22], // keep art inside the maskable safe zone
  ['public/apple-touch-icon.png', 180, 0.14],
]

for (const [path, size, padding] of outputs) {
  writeFileSync(path, icon(size, padding))
  console.log(`wrote ${path}`)
}
