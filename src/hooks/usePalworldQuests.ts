/**
 * Palworld quests
 *
 * Loads public/palworld-quests.json once and shares it, the same way
 * usePalworldPassives does. The file is built by scripts/fetch-palworld-quests.js
 * from paldb's datamine of the game's own DT_PalQuestData: all 117 quests, each
 * keyed by its internal id, with its objectives in the order the game asks for
 * them and its links to other quests.
 *
 * The shaping lives here rather than in the page, because Palworld's quest
 * structure is not the tree the phrase "quest tree" suggests and it takes some
 * work to make it navigable:
 *
 *  - The 58 main missions are one chain about 30 quests long. paldb records two
 *    tutorial entry points that run separately for a dozen steps and converge;
 *    the build script orders from the one a new save opens with, and marks the
 *    reachable set `inStory` so the rest can be shelved separately instead of
 *    interleaved.
 *  - 57 of the 59 side missions have no recorded links at all. What unlocks
 *    them lives in Blueprint graphs the datamine never reached. Rather than
 *    invent edges, they are grouped by questgiver - which their ids carry, and
 *    which is a grouping the game itself uses - and `nearby` reconnects them by
 *    geography instead.
 */

import { useState, useEffect } from 'react'

export interface QuestStep {
  text: string
  /** Present when paldb linked the step to a map position. */
  map?: string
  x?: number
  y?: number
}

export interface Quest {
  id: string
  slug: string
  name: string
  /** "Main Mission" or "Sub Mission", paldb's own label. */
  kind: string
  description: string
  objectives: QuestStep[]
  rewards: string[]
  next: string[]
  prev: string[]
  /** Reading-order index among main missions; absent on side missions. */
  order?: number
  /** Main missions reachable from the game's opening. */
  inStory?: boolean
}

interface RawQuests {
  generatedAt: string
  gameVersion: string
  mainEntry: string
  quests: Quest[]
}

export interface QuestData {
  generatedAt: string
  gameVersion: string
  mainEntry: string
  quests: Quest[]
  byId: Map<string, Quest>
  bySlug: Map<string, Quest>
  main: Quest[]
  side: Quest[]
  /** Main missions split into the story you follow and everything else. */
  mainSections: Array<{ label: string; quests: Quest[] }>
  /** Side missions shelved by questgiver, biggest line first. */
  sideGroups: Array<{ label: string; quests: Quest[] }>
}

let cached: QuestData | null = null
let inFlight: Promise<QuestData> | null = null

export function usePalworldQuests() {
  const [data, setData] = useState<QuestData | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) return
    let alive = true

    if (!inFlight) {
      inFlight = fetch(`${import.meta.env.BASE_URL}palworld-quests.json`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((raw: RawQuests) => {
          cached = shape(raw)
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
// Shaping
// ---------------------------------------------------------------------------

export const isMain = (q: Quest) => q.kind.startsWith('Main')

/**
 * Side-quest id stems that read badly split on capitals, or that are one family
 * under several stems. Everything else is spaced out from its stem.
 */
const GROUP_LABELS: Record<string, string> = {
  StrongOldMan: 'Strong Old Man',
  RookieExpeditionTeam: 'Rookie Expedition Team',
  LoneWolf: 'Lone Wolf',
}
/** Stems collapsed onto one shelf. Longest prefix first. */
const GROUP_MERGES: Array<[string, string]> = [
  ['PalDisplay', 'Pal Display Requests'],
  ['Delivery', 'Deliveries'],
  ['Kigurumi', 'Depresso Costume'],
  ['Zoe', 'Zoe'],
]

/** The questgiver a side quest belongs to; '' for main missions. */
export function questGroup(quest: Quest): string {
  if (isMain(quest)) return ''
  const stem = quest.id.slice(quest.id.indexOf('_') + 1)
  for (const [prefix, label] of GROUP_MERGES) if (stem.startsWith(prefix)) return label
  const bare = stem.replace(/_?\d+$/, '').replace(/_+$/, '')
  return GROUP_LABELS[bare] ?? bare.replace(/([a-z])([A-Z])/g, '$1 $2')
}

/** Trailing number in the id, which orders a questgiver's line. */
const lineOrder = (quest: Quest) => Number(/(\d+)$/.exec(quest.id)?.[1] ?? 0)

function shape(raw: RawQuests): QuestData {
  const quests = raw.quests
  const byId = new Map(quests.map(q => [q.id, q]))
  const bySlug = new Map(quests.map(q => [q.slug, q]))

  const main = quests.filter(isMain).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const side = quests.filter(q => !isMain(q))

  const story = main.filter(q => q.inStory)
  const rest = main.filter(q => !q.inStory)
  const mainSections = [{ label: 'Main story', quests: story }]
  if (rest.length) mainSections.push({ label: 'Other main missions', quests: rest })

  const shelves = new Map<string, Quest[]>()
  for (const quest of side) {
    const label = questGroup(quest)
    if (!shelves.has(label)) shelves.set(label, [])
    shelves.get(label)!.push(quest)
  }
  const sideGroups = [...shelves.entries()]
    .map(([label, qs]) => ({
      label,
      quests: qs.sort((a, b) => lineOrder(a) - lineOrder(b) || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => b.quests.length - a.quests.length || a.label.localeCompare(b.label))

  return {
    generatedAt: raw.generatedAt,
    gameVersion: raw.gameVersion,
    mainEntry: raw.mainEntry,
    quests, byId, bySlug, main, side, mainSections, sideGroups,
  }
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** Quests matching `term` in name, id, briefing or any objective. */
export function searchQuests(data: QuestData, term: string): Quest[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return []
  return data.quests
    .filter(q =>
      q.name.toLowerCase().includes(needle) ||
      q.id.toLowerCase().includes(needle) ||
      q.description.toLowerCase().includes(needle) ||
      q.objectives.some(o => o.text.toLowerCase().includes(needle)))
    // Name matches first: typing "zoe" should surface Zoe Rayne, not a quest
    // that merely mentions her in a paragraph of flavour text.
    .sort((a, b) =>
      Number(!a.name.toLowerCase().includes(needle)) - Number(!b.name.toLowerCase().includes(needle)) ||
      a.name.localeCompare(b.name))
}

/**
 * How close two objectives must be to count as nearby, in Palworld's own world
 * units. 150 keeps a settlement and its outskirts together without sweeping in
 * the next biome.
 */
const NEARBY_RADIUS = 150
const NEARBY_LIMIT = 6

const places = (quest: Quest) => quest.objectives.filter(o => o.x !== undefined)

/**
 * Other quests with an objective close to one of this quest's.
 *
 * The point of this is the side missions: with no edges of their own, the only
 * honest way to say "and while you're here" is geography.
 */
export function nearbyQuests(data: QuestData, quest: Quest): Quest[] {
  const mine = places(quest)
  if (!mine.length) return []

  const found: Array<{ distance: number; quest: Quest }> = []
  for (const other of data.quests) {
    if (other.id === quest.id) continue
    let best = Infinity
    for (const a of mine) {
      for (const b of places(other)) {
        if (a.map !== b.map) continue
        best = Math.min(best, Math.max(Math.abs(a.x! - b.x!), Math.abs(a.y! - b.y!)))
      }
    }
    if (best <= NEARBY_RADIUS) found.push({ distance: best, quest: other })
  }

  return found
    .sort((a, b) => a.distance - b.distance || a.quest.name.localeCompare(b.quest.name))
    .slice(0, NEARBY_LIMIT)
    .map(f => f.quest)
}

export interface RelatedGroup {
  label: string
  quests: Quest[]
}

/** Everything the detail pane can offer as a next click, labelled. */
export function relatedQuests(data: QuestData, quest: Quest): RelatedGroup[] {
  const resolve = (ids: string[]) => ids.map(id => data.byId.get(id)).filter((q): q is Quest => !!q)

  const groups: RelatedGroup[] = [
    { label: 'Unlocked by', quests: resolve(quest.prev) },
    { label: 'Leads to', quests: resolve(quest.next) },
  ]

  if (!isMain(quest)) {
    const group = questGroup(quest)
    groups.push({
      label: `More from ${group}`,
      quests: data.side
        .filter(q => q.id !== quest.id && questGroup(q) === group)
        .sort((a, b) => lineOrder(a) - lineOrder(b)),
    })
  }

  groups.push({ label: 'Nearby', quests: nearbyQuests(data, quest) })
  return groups.filter(g => g.quests.length)
}

/**
 * Coordinates are shown, not linked.
 *
 * The obvious move is a "show on map" link into the embedded Palworld map, and
 * it is deliberately not here: that app reads only `?pal=` and `?calibrate` off
 * the query string, so a link carrying x/y would open the map and silently
 * ignore where it was told to go. Making it real means teaching palworld-map to
 * accept a position, rebuilding it, and re-embedding the build - a change to a
 * different repo, not something to fake from this one. Until then the numbers
 * are the useful thing: they are what you type into the map's own search.
 */

/** "Hill of Beginnings 240,-512" -> "Hill of Beginnings". */
export function placeName(step: QuestStep): string {
  if (step.x === undefined) return step.text
  return step.text.replace(/\s*-?\d+,-?\d+\s*$/, '').trim() || step.text
}
