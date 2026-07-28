/**
 * The lightweight Pokémon list the search palette matches against.
 *
 * Deliberately *not* pokemon-data.json. That file is ~4MB because it carries
 * every move and ability, and pulling it down each time someone taps Search
 * would be indefensible. public/pokemon-index.json is the same 1,025 Pokémon
 * stripped to id, name and types: about 37KB, 10KB over the wire.
 *
 * Built by scripts/build-pokemon-index.js. Re-run that after
 * fetch-pokemon-data.js.
 *
 * This replaces the old usePokemonData hook, which no page ever imported and
 * which silently filtered the roster down to Pokémon with a 400+ base stat
 * total, i.e. it would have dropped 386 of them the moment anyone wired it up.
 */

import { useEffect, useState } from 'react'

export interface PokemonEntry {
  id: number
  name: string
  types: string[]
  sprite: string
}

/** Wire rows are tuples, not objects: 1,025 repeated key names was most of the file. */
type Row = [number, string, string[], string | null]

interface RawIndex {
  spritePrefix: string
  pokemon: Row[]
}

let cached: PokemonEntry[] | null = null
let inFlight: Promise<PokemonEntry[]> | null = null

export function usePokemonIndex() {
  const [pokemon, setPokemon] = useState<PokemonEntry[]>(cached ?? [])

  useEffect(() => {
    if (cached) return
    let alive = true

    if (!inFlight) {
      inFlight = fetch(`${import.meta.env.BASE_URL}pokemon-index.json`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((raw: RawIndex) => {
          cached = raw.pokemon.map(([id, name, types, override]) => ({
            id,
            name,
            types,
            sprite: override ?? `${raw.spritePrefix}${id}.png`,
          }))
          return cached
        })
        .finally(() => { inFlight = null })
    }

    inFlight
      .then(list => { if (alive) setPokemon(list) })
      // Search still works for everything else if this fails, so don't surface it
      .catch(() => {})

    return () => { alive = false }
  }, [])

  return pokemon
}

/** "mr-mime" -> "Mr Mime". The API stores names lowercase and hyphenated. */
export const prettyPokemonName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
