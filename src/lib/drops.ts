/**
 * Turning drop lines into numbers you can sort and compare.
 *
 * The dataset ships drops as the wiki writes them - "3-5 Bone (100%)" - which
 * is fine to print and useless to rank. This parses them into amounts and
 * chances so a page can ask "who drops Leather", "what's guaranteed", or "which
 * Pal gives the most Ore per kill".
 *
 * On disassembly: there is no separate table for it. The Pal Disassembly
 * Conveyor "automatically butchers any Pal placed inside", and butcher-only
 * items (Chikipi Poultry, Lamball Mutton) already sit in this same list with
 * nothing marking them apart. Neither palcalc's game-file dump nor the wiki
 * infobox splits them, so this doesn't invent a split it can't source.
 *
 * Parsing is lenient, unlike the passive-skill build step which throws on an
 * unrecognised line. That one reads authoritative game files where a reworded
 * effect means a silently wrong number. This reads community wikitext, where
 * three of 580 lines are bare item names with no amount at all ("Ore" on
 * Digtoise). Those still carry the item, which is most of the value, so they're
 * kept with unknown amounts rather than failing the page.
 */

import type { Pal } from '../hooks/usePalworldData'

export interface Drop {
  item: string
  /** null when the wiki gave no amount. min === max for a flat "1 Egg". */
  min: number | null
  max: number | null
  /** Percent. null when the wiki gave no chance. */
  chance: number | null
}

/** "3-5 Bone (100%)" and "1 Egg (100%)". Anything else falls through. */
const LINE = /^(\d+)(?:\s*-\s*(\d+))?\s+(.+?)\s+\((\d+(?:\.\d+)?)%\)$/

export function parseDrop(line: string): Drop {
  const m = LINE.exec(line.trim())
  if (!m) return { item: line.trim(), min: null, max: null, chance: null }
  const min = Number(m[1])
  return {
    item: m[3].trim(),
    min,
    max: m[2] ? Number(m[2]) : min,
    chance: Number(m[4]),
  }
}

export function parseDrops(pal: Pal): Drop[] {
  return (pal.drops ?? []).map(parseDrop)
}

/** Average units per kill, for ranking. Unknown amounts count as nothing. */
export function expectedYield(drop: Drop): number {
  if (drop.min === null || drop.max === null) return 0
  return ((drop.min + drop.max) / 2) * ((drop.chance ?? 100) / 100)
}

export interface DropSource {
  pal: Pal
  drop: Drop
}

export interface ItemEntry {
  item: string
  sources: DropSource[]
  /** Best single-kill yield anyone offers, so items sort by usefulness. */
  best: number
}

/**
 * Every item, with who drops it. Sorted by how many Pals drop it, so the
 * bulk materials you actually farm float above the one-off trinkets.
 */
export function itemIndex(pals: Pal[]): ItemEntry[] {
  const byItem = new Map<string, DropSource[]>()
  for (const pal of pals) {
    for (const drop of parseDrops(pal)) {
      const list = byItem.get(drop.item)
      if (list) list.push({ pal, drop })
      else byItem.set(drop.item, [{ pal, drop }])
    }
  }

  return [...byItem]
    .map(([item, sources]) => ({
      item,
      sources: sources.sort((a, b) => expectedYield(b.drop) - expectedYield(a.drop)
        || a.pal.dex - b.pal.dex),
      best: Math.max(...sources.map(s => expectedYield(s.drop))),
    }))
    .sort((a, b) => b.sources.length - a.sources.length || a.item.localeCompare(b.item))
}

/** Formatted amount: "3-5", "1", or "?" when the wiki didn't say. */
export function amountText(drop: Drop): string {
  if (drop.min === null) return '?'
  return drop.min === drop.max ? String(drop.min) : `${drop.min}-${drop.max}`
}
