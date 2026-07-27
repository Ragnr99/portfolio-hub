/**
 * Palworld Data Hook
 *
 * Loads public/palworld-data.json once and shares it across every Palworld page,
 * the same module-level cache trick usePokemonData uses.
 *
 * The interesting part is breeding. Palworld's real parent -> child table can't
 * be reduced to a tidy formula: the community "average the two CombiRanks and
 * take the nearest Pal" rule only reproduces ~69% of actual results, and about a
 * quarter of real outcomes aren't even distance-optimal, so they can't be
 * patched up with a handful of special cases either.
 *
 * So we ship the real table. All 299 x 299 outcomes are packed as the upper
 * triangle of a uint16 grid (the matrix is symmetric, one gender-dependent pair
 * aside), base64'd into the JSON. That's ~117KB of the payload, ~49KB over the
 * wire gzipped, and it is exactly right rather than approximately right.
 */

import { useState, useEffect } from 'react'

export interface Pal {
  i: number
  dex: number
  variant: boolean
  name: string
  internal: string
  hidden: boolean
  elements: string[]
  hp: number
  attack: number
  defense: number
  rarity: number
  size: string
  nocturnal: boolean
  food: number
  price: number
  wild: [number, number]
  rideSprint: number
  transport: number
  stamina: number
  work: number[]
  partnerSkill: string
  partnerDesc: string
  drops: string[]
  /** URL slug, assigned in build() so it's guaranteed unique. */
  slug: string
}

interface GenderPair {
  a: number
  b: number
  child: number
}

interface RawData {
  generatedAt: string
  workKeys: string[]
  pals: Pal[]
  breeding: { n: number; tri: string; genderPairs: GenderPair[] }
}

export interface PalworldData {
  generatedAt: string
  workKeys: string[]
  /** Every entry, including the hidden Terraria collab rows. Indexed by `i`. */
  all: Pal[]
  /** The real Pals: what the dex and the breeding pickers should show. */
  pals: Pal[]
  genderPairs: GenderPair[]
  /** Child of two parents, or null if the pair can't breed. */
  childOf: (a: number, b: number) => Pal | null
  /** Every parent pair that produces `target`, as [parentA, parentB]. */
  parentsOf: (target: number) => Array<[Pal, Pal]>
}

let cached: PalworldData | null = null
let inFlight: Promise<PalworldData> | null = null

/** Upper-triangle offset for i <= j in an n x n symmetric grid. */
function triIndex(i: number, j: number, n: number) {
  return (i * n - (i * (i - 1)) / 2) + (j - i)
}

function decodeTri(b64: string): Uint16Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
  return new Uint16Array(bytes.buffer)
}

function build(raw: RawData): PalworldData {
  const { n, tri: triB64, genderPairs } = raw.breeding
  const tri = decodeTri(triB64)
  const all = raw.pals
  assignSlugs(all)

  const lookup = (a: number, b: number): number => {
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return tri[triIndex(lo, hi, n)]
  }

  const childOf = (a: number, b: number): Pal | null => {
    if (a < 0 || b < 0 || a >= n || b >= n) return null
    const c = lookup(a, b)
    return c === 0xffff ? null : all[c] ?? null
  }

  // Built lazily: scanning 44,850 pairs is instant, but there's no reason to do
  // it at all unless the Breeder page actually asks.
  let reverse: Map<number, Array<[number, number]>> | null = null
  const buildReverse = () => {
    const map = new Map<number, Array<[number, number]>>()
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const c = tri[triIndex(i, j, n)]
        if (c === 0xffff) continue
        const list = map.get(c)
        if (list) list.push([i, j])
        else map.set(c, [[i, j]])
      }
    }
    return map
  }

  const parentsOf = (target: number): Array<[Pal, Pal]> => {
    if (!reverse) reverse = buildReverse()
    const pairs = reverse.get(target) ?? []
    return pairs
      .filter(([i, j]) => !all[i].hidden && !all[j].hidden)
      .map(([i, j]) => [all[i], all[j]] as [Pal, Pal])
  }

  return {
    generatedAt: raw.generatedAt,
    workKeys: raw.workKeys,
    all,
    pals: all.filter(p => !p.hidden),
    genderPairs: genderPairs ?? [],
    childOf,
    parentsOf,
  }
}

export function usePalworldData() {
  const [data, setData] = useState<PalworldData | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) return
    let alive = true

    if (!inFlight) {
      inFlight = fetch(`${import.meta.env.BASE_URL}palworld-data.json`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((raw: RawData) => {
          cached = build(raw)
          return cached
        })
        .finally(() => { inFlight = null })
    }

    inFlight
      .then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch((e: Error) => {
        if (alive) { setError(e.message); setLoading(false) }
      })

    return () => { alive = false }
  }, [])

  return { data, loading, error }
}

/** "Fuack Ignis" -> "fuack-ignis". Not unique on its own: see assignSlugs. */
const baseSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Give every Pal a unique URL slug.
 *
 * Display names are *almost* unique. Gumoss and its flower variant share one,
 * so a plain name slug would make one of them unreachable. Collisions fall back
 * to the internal name's variant suffix (PlantSlime_Flower -> "gumoss-flower"),
 * and to a counter if even that repeats. The first Pal to claim a slug keeps
 * the clean one, so /palworld/pal/gumoss still resolves.
 */
function assignSlugs(pals: Pal[]) {
  const used = new Map<string, number>()
  for (const p of pals) {
    const base = baseSlug(p.name)
    const seen = (used.get(base) ?? 0) + 1
    used.set(base, seen)
    if (seen === 1) {
      p.slug = base
    } else {
      const suffix = p.internal.split('_')[1]
      p.slug = suffix ? `${base}-${baseSlug(suffix)}` : `${base}-${seen}`
    }
  }
}

/**
 * Portrait filename, under public/pal-images/. Keyed on the internal name
 * because it survives game patches, unlike dex order.
 * Must stay identical to slug() in scripts/fetch-pal-images.js.
 */
export const palImageSlug = (internal: string) =>
  internal.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Display label for a work-suitability key ("GenerateElectricity" -> "Electricity"). */
export const WORK_LABELS: Record<string, string> = {
  Kindling: 'Kindling',
  Watering: 'Watering',
  Planting: 'Planting',
  GenerateElectricity: 'Electricity',
  Handiwork: 'Handiwork',
  Gathering: 'Gathering',
  Lumbering: 'Lumbering',
  Mining: 'Mining',
  MedicineProduction: 'Medicine',
  Cooling: 'Cooling',
  Transporting: 'Transport',
  Farming: 'Farming',
}

export const ELEMENTS = [
  'Neutral', 'Fire', 'Water', 'Electric', 'Grass',
  'Ice', 'Ground', 'Dark', 'Dragon',
] as const

/** Same palette the desktop overlay uses, so the two tools read as one set. */
export const ELEMENT_COLORS: Record<string, string> = {
  Neutral: '#b8b2a4',
  Fire: '#ff6f2c',
  Water: '#2fa6ff',
  Electric: '#e8b800',
  Grass: '#46c85a',
  Ice: '#4fd2f0',
  Ground: '#c58a4e',
  Dark: '#a95cff',
  Dragon: '#20c2a0',
}

/** What each element takes extra damage from. Fire is the only two-way attacker. */
export const WEAK_TO: Record<string, string> = {
  Neutral: 'Dark',
  Fire: 'Water',
  Water: 'Electric',
  Electric: 'Ground',
  Grass: 'Fire',
  Ice: 'Fire',
  Ground: 'Grass',
  Dark: 'Dragon',
  Dragon: 'Ice',
}

/** What each element deals extra damage to. */
export const STRONG_AGAINST: Record<string, string[]> = {
  Neutral: [],
  Fire: ['Grass', 'Ice'],
  Water: ['Fire'],
  Electric: ['Water'],
  Grass: ['Ground'],
  Ice: ['Dragon'],
  Ground: ['Electric'],
  Dark: ['Neutral'],
  Dragon: ['Dark'],
}
