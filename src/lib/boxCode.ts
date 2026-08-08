/**
 * Packing a box of Pals into something you can put in a URL.
 *
 * The box lives in localStorage, which means it's stuck in one browser on one
 * machine. There's no backend to sync it through and this is a static site, so
 * the URL is the transport: a link both shares a box and moves it to your phone.
 *
 * Membership is a bitset over species index rather than a list of numbers,
 * because a box is a set and a bitset is the smallest honest way to write one
 * down. Trailing empty bytes are dropped, so a box of three starter Pals codes
 * to a few characters while the whole roster still fits in about 50 - short
 * enough to survive being pasted into a chat client that likes to wrap URLs.
 *
 * Anything malformed decodes to an empty set rather than throwing: this input
 * arrives from a URL bar, so it's guaranteed to be mangled eventually.
 */

/** Bytes -> base64url, no padding, safe to drop straight into a query string. */
function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

export function encodeBox(box: ReadonlySet<number>): string {
  const ids = [...box].filter(i => Number.isInteger(i) && i >= 0)
  if (!ids.length) return ''
  const bytes = new Uint8Array((Math.max(...ids) >> 3) + 1)
  for (const i of ids) bytes[i >> 3] |= 1 << (i & 7)
  return toBase64Url(bytes)
}

/** `limit` is the roster size, so a stale code can't inject impossible indices. */
export function decodeBox(code: string, limit: number): Set<number> {
  const out = new Set<number>()
  if (!code) return out
  const bytes = fromBase64Url(code)
  if (!bytes) return out
  for (let byte = 0; byte < bytes.length; byte++) {
    for (let bit = 0; bit < 8; bit++) {
      if (!(bytes[byte] & (1 << bit))) continue
      const id = byte * 8 + bit
      if (id < limit) out.add(id)
    }
  }
  return out
}
