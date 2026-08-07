/**
 * Palworld Passive Skills
 *
 * Loads public/palworld-passives.json once and shares it, the same way
 * usePalworldData does. The file is built by scripts/fetch-palworld-passives.js
 * out of the game's own DataTables: all 115 passives a Pal can hold in 1.0,
 * with every description line parsed into a typed effect.
 *
 * The stacking model is the simple one, because that is what the game does.
 * Palworld's passive bonuses are additive percentages against the base stat,
 * not multiplicative against each other, so Legend (+20% Attack) alongside
 * Demon God (+30% Attack) is +50% Attack and not +56%. That makes combining
 * four skills a sum per stat, which is `combine` below.
 *
 * One normalization happens at build time and matters here: positive is always
 * good for the player. The game phrases some effects as a rate that you want to
 * go down ("Hunger decreases 15% faster"), so those are stored negated. It
 * means nothing in this file has to special-case a direction, and the only
 * place direction reappears is the wording in STAT_META.
 */

import { useState, useEffect } from 'react'

export interface PassiveEffect {
  stat: string
  /** Present on numeric effects. Percent unless the stat's unit says otherwise. */
  value?: number
  /** Present on on/off effects like "Immune to Flinch". */
  flag?: boolean
}

export interface Passive {
  name: string
  internal: string
  /** The game's own tier, -3 to 5. Negative ranks are the drawback passives. */
  rank: number
  /** The description exactly as the game prints it, one entry per line. */
  lines: string[]
  effects: PassiveEffect[]
  notes: string[]
  /** False for the 30 that can never be bred onto a Pal. */
  inheritable: boolean
  /** 100 for ordinary passives, 5 for the rare tier, 0 if not inheritable. */
  inheritWeight: number
  surgeryCost: number
  hasSurgeryItem: boolean
}

interface RawPassives {
  generatedAt: string
  gameVersion: string
  stats: string[]
  skills: Passive[]
}

export interface PassiveData {
  generatedAt: string
  gameVersion: string
  skills: Passive[]
  byInternal: Map<string, Passive>
}

let cached: PassiveData | null = null
let inFlight: Promise<PassiveData> | null = null

export function usePalworldPassives() {
  const [data, setData] = useState<PassiveData | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) return
    let alive = true

    if (!inFlight) {
      inFlight = fetch(`${import.meta.env.BASE_URL}palworld-passives.json`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((raw: RawPassives) => {
          if (import.meta.env.DEV) assertStatsCovered(raw.stats)
          cached = {
            generatedAt: raw.generatedAt,
            gameVersion: raw.gameVersion,
            skills: raw.skills,
            byInternal: new Map(raw.skills.map(s => [s.internal, s])),
          }
          return cached
        })
        .finally(() => { inFlight = null })
    }

    inFlight
      .then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch((e: Error) => { if (alive) { setError(e.message); setLoading(false) } })

    return () => { alive = false }
  }, [])

  return { data, loading, error }
}

// ---------------------------------------------------------------------------
// Stat presentation
// ---------------------------------------------------------------------------

export const STAT_GROUPS = [
  'Combat',
  'Elemental attack',
  'Damage taken',
  'Work',
  'Upkeep',
  'Mount',
  'Player',
  'Base & economy',
  'Traits',
] as const

export type StatGroup = typeof STAT_GROUPS[number]

interface StatMeta {
  label: string
  group: StatGroup
  /**
   * How to word a value. Percent stats read "+20%"; the rate stats read
   * "20% slower" / "15% faster", because "+20% hunger" is genuinely ambiguous
   * about which way it cuts.
   */
  unit?: 'percent' | 'level' | 'count'
  /** [wording for positive, wording for negative], for the rate stats. */
  direction?: [string, string]
  /** Flags have no value, just a presence. */
  flag?: boolean
  hint?: string
}

/**
 * Every stat the parser can emit. Declaration order is display order within a
 * group. `assertStatsCovered` keeps this honest against the dataset.
 */
export const STAT_META: Record<string, StatMeta> = {
  // Combat
  attack: { label: 'Attack', group: 'Combat', unit: 'percent' },
  defense: { label: 'Defense', group: 'Combat', unit: 'percent' },
  maxHealth: { label: 'Max HP', group: 'Combat', unit: 'percent' },
  moveSpeed: { label: 'Movement speed', group: 'Combat', unit: 'percent' },
  cooldown: {
    label: 'Skill cooldown', group: 'Combat', unit: 'percent', direction: ['shorter', 'longer'],
  },
  lifeSteal: { label: 'Life steal', group: 'Combat', unit: 'percent' },
  palRegen: { label: 'Pal HP regen', group: 'Combat', unit: 'percent' },

  // Work
  workSpeed: { label: 'Work speed', group: 'Work', unit: 'percent' },
  farmingSuitability: {
    label: 'Farming suitability', group: 'Work', unit: 'level',
    hint: 'Adds levels of the Farming work suitability, even to Pals that have none.',
  },

  // Upkeep
  hungerRate: {
    label: 'Hunger drain', group: 'Upkeep', unit: 'percent', direction: ['slower', 'faster'],
  },
  sanRate: {
    label: 'SAN drain', group: 'Upkeep', unit: 'percent', direction: ['slower', 'faster'],
  },

  // Mount
  maxStamina: {
    label: 'Max stamina', group: 'Mount', unit: 'percent',
    hint: 'Only applies while the Pal is being ridden.',
  },
  waterMoveSpeed: { label: 'Swim speed', group: 'Mount', unit: 'percent' },
  mountedJumps: { label: 'Mounted jumps', group: 'Mount', unit: 'count' },

  // Player
  playerAttack: { label: 'Player attack', group: 'Player', unit: 'percent' },
  playerDefense: { label: 'Player defense', group: 'Player', unit: 'percent' },
  playerWorkSpeed: { label: 'Player work speed', group: 'Player', unit: 'percent' },
  playerMining: { label: 'Player mining', group: 'Player', unit: 'percent' },
  playerLogging: { label: 'Player logging', group: 'Player', unit: 'percent' },
  playerRegen: { label: 'Player HP regen', group: 'Player', unit: 'percent' },
  playerReload: { label: 'Player reload speed', group: 'Player', unit: 'percent' },
  playerStaminaSaved: {
    label: 'Player stamina cost', group: 'Player', unit: 'percent', direction: ['lower', 'higher'],
  },

  // Base & economy
  sellValue: { label: 'Item sell value', group: 'Base & economy', unit: 'percent' },
  dropRate: { label: 'Your dropped items', group: 'Base & economy', unit: 'percent' },
  breedingSpeed: { label: 'Breeding speed', group: 'Base & economy', unit: 'percent' },
  eggProduction: { label: 'Egg production speed', group: 'Base & economy', unit: 'percent' },
  incubationSpeed: { label: 'Incubation speed', group: 'Base & economy', unit: 'percent' },

  // Traits
  immuneFlinch: { label: 'Immune to flinch', group: 'Traits', flag: true },
  immuneKnockback: { label: 'Immune to knockback', group: 'Traits', flag: true },
  immuneExplosion: { label: 'Immune to explosion damage', group: 'Traits', flag: true },
  immunePoison: { label: 'Immune to poison damage', group: 'Traits', flag: true },
  immuneBurn: { label: 'Immune to burn damage', group: 'Traits', flag: true },
  insomnia: { label: 'Works through the night', group: 'Traits', flag: true },
  daySleeper: { label: 'Naps during the day', group: 'Traits', flag: true },
  nonLethal: { label: 'Cannot reduce a target below 1 HP', group: 'Traits', flag: true },
  lifeStealUnquantified: {
    label: 'Absorbs damage dealt as health', group: 'Traits', flag: true,
    hint: 'The game never states a number for this one, so it cannot be added to Life steal.',
  },
  worldTreeHarvest: {
    label: 'World Tree resources do not vanish', group: 'Traits', flag: true,
  },
}

const ELEMENT_ORDER = [
  'Neutral', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Ground', 'Dark', 'Dragon',
]
for (const el of ELEMENT_ORDER) {
  STAT_META[`atk:${el}`] = { label: `${el} damage dealt`, group: 'Elemental attack', unit: 'percent' }
  STAT_META[`res:${el}`] = { label: `${el} damage taken`, group: 'Damage taken', unit: 'percent', direction: ['less', 'more'] }
}

const STAT_ORDER = new Map(Object.keys(STAT_META).map((k, i) => [k, i]))

/**
 * Shout in development if the dataset grew a stat this file has never heard of.
 * statMeta falls back to the raw key so nothing breaks in production, but an
 * unlabelled "atk:Astral" row in the totals is a patch worth noticing.
 */
function assertStatsCovered(stats: string[]) {
  const missing = stats.filter(s => !(s in STAT_META))
  if (missing.length) {
    console.warn(
      `[passives] ${missing.length} stat(s) have no STAT_META entry and will render unlabelled: ${missing.join(', ')}`
    )
  }
}

export function statMeta(stat: string): StatMeta {
  return STAT_META[stat] ?? { label: stat, group: 'Traits', unit: 'percent' }
}

/** "+20%", "30% slower", "+2 levels". Positive is always the good direction. */
export function formatStat(stat: string, value: number): string {
  const meta = statMeta(stat)
  if (meta.direction) {
    const [pos, neg] = meta.direction
    return `${Math.abs(value)}% ${value >= 0 ? pos : neg}`
  }
  if (meta.unit === 'level') return `${value >= 0 ? '+' : ''}${value} ${Math.abs(value) === 1 ? 'level' : 'levels'}`
  if (meta.unit === 'count') return `${value >= 0 ? '+' : ''}${value}`
  return `${value >= 0 ? '+' : ''}${value}%`
}

// ---------------------------------------------------------------------------
// Combining a loadout
// ---------------------------------------------------------------------------

export interface CombinedStat {
  stat: string
  group: StatGroup
  label: string
  /** Summed value, absent on flags. */
  value?: number
  flag?: boolean
  /** Which of the chosen skills fed into this line, for the "why" breakdown. */
  from: Array<{ name: string; value?: number }>
}

export interface Combined {
  /** Non-zero totals, grouped and ordered for display. */
  groups: Array<{ group: StatGroup; stats: CombinedStat[] }>
  /** Totals that cancelled to exactly zero. Worth showing: they cost a slot. */
  cancelled: CombinedStat[]
  /** "Ferocious is fully covered by Legend" style observations. */
  redundancies: Array<{ redundant: string; coveredBy: string }>
}

/**
 * Add up a loadout. Four slots is the game's cap, but nothing here depends on
 * that, so the page enforces it and this stays a plain fold.
 */
export function combine(skills: Passive[]): Combined {
  const totals = new Map<string, CombinedStat>()

  for (const skill of skills) {
    for (const eff of skill.effects) {
      const existing = totals.get(eff.stat)
      const entry: CombinedStat = existing ?? {
        stat: eff.stat,
        group: statMeta(eff.stat).group,
        label: statMeta(eff.stat).label,
        value: eff.flag ? undefined : 0,
        flag: eff.flag,
        from: [],
      }
      if (!eff.flag) entry.value = (entry.value ?? 0) + (eff.value ?? 0)
      entry.from.push({ name: skill.name, value: eff.value })
      totals.set(eff.stat, entry)
    }
  }

  const all = [...totals.values()].sort(
    (a, b) => (STAT_ORDER.get(a.stat) ?? 999) - (STAT_ORDER.get(b.stat) ?? 999)
  )
  // A stat that sums to zero isn't "no effect", it's two skills undoing each
  // other, which is exactly the thing you want to see while theorycrafting.
  const live = all.filter(s => s.flag || s.value !== 0)
  const cancelled = all.filter(s => !s.flag && s.value === 0)

  const groups = STAT_GROUPS
    .map(group => ({ group, stats: live.filter(s => s.group === group) }))
    .filter(g => g.stats.length)

  return { groups, cancelled, redundancies: findRedundancies(skills) }
}

/**
 * Which chosen skills are doing nothing that another chosen skill isn't already
 * doing better. Four slots is a tight budget and the game happily lets you
 * stack Brave onto Ferocious, so this is worth pointing out.
 *
 * Deliberately conservative: B only covers A when it matches or beats A on
 * every stat A touches and brings no downside A didn't already have. Musclehead
 * is not called redundant next to Demon God, even though both give +30% Attack,
 * because Musclehead's -50% Work Speed is a real difference in behaviour.
 */
function findRedundancies(skills: Passive[]): Array<{ redundant: string; coveredBy: string }> {
  const out: Array<{ redundant: string; coveredBy: string }> = []

  const asMap = (s: Passive) => new Map(s.effects.map(e => [e.stat, e.flag ? Infinity : (e.value ?? 0)]))

  for (const a of skills) {
    if (!a.effects.length) continue
    for (const b of skills) {
      if (a === b || a.internal === b.internal) continue
      const ma = asMap(a)
      const mb = asMap(b)

      // B has to at least match A everywhere A does something.
      const matchesA = [...ma].every(([stat, va]) => mb.has(stat) && (mb.get(stat) as number) >= va)
      if (!matchesA) continue
      // ...and B's extras can't be drawbacks A was free of.
      const noNewCost = [...mb].every(([stat, vb]) => ma.has(stat) || vb >= 0)
      if (!noNewCost) continue
      // Identical twins would otherwise report each other, both directions.
      const bIsBetter = [...mb].some(([stat, vb]) => !ma.has(stat) || vb > (ma.get(stat) as number))
      if (!bIsBetter) continue

      out.push({ redundant: a.name, coveredBy: b.name })
      break
    }
  }

  return out
}

/** Tier chip styling. Rank 5 is the World Tree set 1.0 added. */
export function rankStyle(rank: number): { label: string; className: string } {
  if (rank >= 5) return { label: 'World Tree', className: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300' }
  if (rank === 4) return { label: 'Tier 4', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  if (rank === 3) return { label: 'Tier 3', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' }
  if (rank === 2) return { label: 'Tier 2', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' }
  if (rank === 1) return { label: 'Tier 1', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  return { label: `Tier ${rank}`, className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
}
