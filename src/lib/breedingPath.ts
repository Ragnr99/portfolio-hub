/**
 * Shortest breeding chain from one Pal to another.
 *
 * Passive skills come out of the parents' pool, so the way you get a junk-tier
 * Lamball's perfect passives onto a Jormuntide Ignis is to keep breeding the
 * carrier forward until its descendants are the species you want. Every step is
 * another roll on inheritance, so the fewest steps wins.
 *
 * The graph: carrier X becomes C in one step if any partner P has
 * childOf(X, P) = C. Distances come from a backwards BFS off the target using
 * the reverse table, which costs one pass over the 44,850 pairs. Walking
 * forward against those distances then hands back every equally-short branch at
 * each step, so a route can be re-picked without recomputing anything.
 *
 * In practice nothing is more than three steps apart, and the 25 Pals that only
 * breed from themselves (Jetragon, Frostallion, Shadowbeak…) are unreachable
 * from anything else at all. See `PathPlan`.
 */

import type { Pal, PalworldData } from '../hooks/usePalworldData'

/** One species you can breed into next, and every partner that gets you there. */
export interface StepOption {
  child: Pal
  /** Sorted easiest-to-obtain first. Never empty. */
  partners: Pal[]
}

export interface PathStep {
  /** The Pal carrying the passives going into this step. */
  from: Pal
  /** The branch currently taken. */
  chosen: StepOption
  /** Every branch that stays on a shortest route, best first. Includes `chosen`. */
  options: StepOption[]
}

export type PathPlan =
  | { kind: 'same' }
  | { kind: 'ok'; steps: PathStep[] }
  /**
   * `self-only`: the target's only parent pair is itself + itself, so no
   * outside lineage can ever reach it. `no-parents`: nothing breeds it at all.
   * `no-route`: it has real parents but none descend from this carrier.
   */
  | { kind: 'unreachable'; reason: 'self-only' | 'no-parents' | 'no-route' }

/** Steps from each Pal to `target`, -1 where no lineage connects. */
function distancesTo(data: PalworldData, target: number): Int32Array {
  const dist = new Int32Array(data.all.length).fill(-1)
  dist[target] = 0
  let layer = [target]

  while (layer.length) {
    const next: number[] = []
    for (const child of layer) {
      for (const pair of data.parentsOf(child)) {
        for (const parent of pair) {
          if (dist[parent.i] !== -1) continue
          dist[parent.i] = dist[child] + 1
          next.push(parent.i)
        }
      }
    }
    layer = next
  }
  return dist
}

/** Every one-step move from `from` that closes the gap to the target. */
function optionsFrom(data: PalworldData, from: number, dist: Int32Array): StepOption[] {
  const want = dist[from] - 1
  const byChild = new Map<number, Pal[]>()

  for (const partner of data.pals) {
    const child = data.childOf(from, partner.i)
    if (!child || dist[child.i] !== want) continue
    const list = byChild.get(child.i)
    if (list) list.push(partner)
    else byChild.set(child.i, [partner])
  }

  return [...byChild].map(([i, partners]) => ({
    child: data.all[i],
    partners: partners.sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name)),
  }))
}

/**
 * Total rarity of the partners a route still needs, cheapest route wins.
 *
 * Hop count is already fixed by `dist`, so this only breaks ties, and it breaks
 * them the way it matters: a route through two commons beats one that wants a
 * legendary you'd have to go catch first. Memoised, and every edge steps
 * strictly closer to the target, so the recursion can't cycle.
 */
function makeCost(data: PalworldData, dist: Int32Array, target: number) {
  const memo = new Map<number, number>()

  const cost = (pal: number): number => {
    if (pal === target) return 0
    const seen = memo.get(pal)
    if (seen !== undefined) return seen

    let best = Infinity
    for (const opt of optionsFrom(data, pal, dist)) {
      best = Math.min(best, opt.partners[0].rarity + cost(opt.child.i))
    }
    memo.set(pal, best)
    return best
  }
  return cost
}

/**
 * Plan the chain from `from` to `to`.
 *
 * `overrides[k]` picks the species to breed into at step k, for when you'd
 * rather take a branch you already own the parents for. An override that no
 * longer applies (because an earlier step changed) is ignored, so callers can
 * pass a stale array safely.
 */
export function planBreedingPath(
  data: PalworldData,
  from: Pal,
  to: Pal,
  overrides: number[] = [],
): PathPlan {
  if (from.i === to.i) return { kind: 'same' }

  const dist = distancesTo(data, to.i)
  if (dist[from.i] < 0) {
    const pairs = data.parentsOf(to.i)
    const reason = pairs.length === 0
      ? 'no-parents'
      : pairs.every(([a, b]) => a.i === to.i && b.i === to.i)
        ? 'self-only'
        : 'no-route'
    return { kind: 'unreachable', reason }
  }

  const cost = makeCost(data, dist, to.i)
  const rank = (o: StepOption) => o.partners[0].rarity + cost(o.child.i)

  const steps: PathStep[] = []
  let current = from.i

  while (current !== to.i) {
    const options = optionsFrom(data, current, dist)
      .sort((a, b) => rank(a) - rank(b) || a.child.name.localeCompare(b.child.name))
    // dist[current] > 0 guarantees at least one option; belt and braces.
    if (!options.length) break

    const wanted = overrides[steps.length]
    const chosen = options.find(o => o.child.i === wanted) ?? options[0]
    steps.push({ from: data.all[current], chosen, options })
    current = chosen.child.i
  }

  return { kind: 'ok', steps }
}
