/**
 * The PokeAPI calls a Pokémon page needs, kept out of the page itself.
 *
 * Two deliberate differences from the Pokédex's old inline panel:
 *
 *  - Evolution chains branch properly. The panel walked `evolves_to[0]` only,
 *    so it showed one arbitrary path and quietly lost the rest: Eevee's eight
 *    evolutions came out as one, and split families like Wurmple were wrong.
 *
 *  - Moves are read straight off the Pokémon payload rather than fetching every
 *    move's own endpoint. The panel issued 100+ extra requests per Pokémon to
 *    get type and power; a page that just lists what it learns and at what
 *    level doesn't need them, and it loads far faster for it.
 */

const API = 'https://pokeapi.co/api/v2'
const SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

export interface Evolution {
  id: number
  name: string
  /** How you get it. Empty for the base form. */
  method: string
  sprite: string
  /** Depth in the chain, so the UI can show branches side by side. */
  stage: number
}

export interface LevelUpMove {
  name: string
  level: number
}

export interface Learnset {
  levelUp: LevelUpMove[]
  machine: string[]
  egg: string[]
  tutor: string[]
}

const idFromSpeciesUrl = (url: string): number =>
  Number(url.replace(/\/$/, '').split('/').pop())

/** "level-up" -> "Level up", "hm" -> "HM". */
const pretty = (s: string) =>
  s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

function describe(details: Array<Record<string, unknown>>): string {
  const d = details?.[0]
  if (!d) return ''
  const named = (v: unknown) => (v as { name?: string } | null)?.name
  if (d.min_level) return `Level ${d.min_level}`
  if (named(d.item)) return `Use ${pretty(named(d.item)!)}`
  if (named(d.held_item)) return `Hold ${pretty(named(d.held_item)!)}`
  if (d.min_happiness) return 'High friendship'
  if (d.min_affection) return 'High affection'
  if (named(d.known_move)) return `Knows ${pretty(named(d.known_move)!)}`
  if (named(d.location)) return `At ${pretty(named(d.location)!)}`
  if (named(d.trigger) === 'trade') return 'Trade'
  return named(d.trigger) ? pretty(named(d.trigger)!) : ''
}

/** Walk the whole chain, including every branch. */
export async function fetchEvolutions(pokemonId: number): Promise<Evolution[]> {
  const species = await fetch(`${API}/pokemon-species/${pokemonId}`).then(r => r.json())
  if (!species?.evolution_chain?.url) return []
  const chain = await fetch(species.evolution_chain.url).then(r => r.json())

  const out: Evolution[] = []
  const walk = (node: Record<string, unknown>, stage: number) => {
    const sp = node.species as { name: string; url: string }
    const id = idFromSpeciesUrl(sp.url)
    out.push({
      id,
      name: sp.name,
      method: describe(node.evolution_details as Array<Record<string, unknown>>),
      sprite: `${SPRITE}${id}.png`,
      stage,
    })
    for (const next of (node.evolves_to as Array<Record<string, unknown>>) ?? []) {
      walk(next, stage + 1)
    }
  }
  walk(chain.chain, 0)
  return out
}

/**
 * Categorise what a Pokémon learns, from the payload it already ships with.
 * `red-blue` style version groups repeat the same move, so each is deduped and
 * the lowest level wins.
 */
export function toLearnset(moves: Array<Record<string, unknown>> = []): Learnset {
  const levelUp = new Map<string, number>()
  const machine = new Set<string>()
  const egg = new Set<string>()
  const tutor = new Set<string>()

  for (const entry of moves) {
    const name = pretty((entry.move as { name: string }).name)
    for (const v of (entry.version_group_details as Array<Record<string, unknown>>) ?? []) {
      const method = (v.move_learn_method as { name: string }).name
      const level = Number(v.level_learned_at ?? 0)
      if (method === 'level-up') {
        const prev = levelUp.get(name)
        if (prev === undefined || level < prev) levelUp.set(name, level)
      } else if (method === 'machine') machine.add(name)
      else if (method === 'egg') egg.add(name)
      else if (method === 'tutor') tutor.add(name)
    }
  }

  return {
    levelUp: [...levelUp.entries()]
      .map(([name, level]) => ({ name, level }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    machine: [...machine].sort(),
    egg: [...egg].sort(),
    tutor: [...tutor].sort(),
  }
}

export const spriteFor = (id: number) => `${SPRITE}${id}.png`
