/**
 * Which Pals the map actually has spawn points for.
 *
 * 258 of the 288 Pals have wild spawns; bosses, tower guardians and some
 * variants don't. The "Where to find" button checks this so it isn't offered
 * for a Pal the map can't show, which would just dump you on an empty map.
 *
 * The file is ~3KB and lives with the embedded map app.
 */

import { useEffect, useState } from 'react'

let cached: Set<string> | null = null
let inFlight: Promise<Set<string>> | null = null

export function useSpawnIndex(): Set<string> | null {
  const [names, setNames] = useState<Set<string> | null>(cached)

  useEffect(() => {
    if (cached) return
    let alive = true
    if (!inFlight) {
      inFlight = fetch(`${import.meta.env.BASE_URL}palworld-app/data/spawn_index.json`)
        .then(r => (r.ok ? r.json() : []))
        .then((list: string[]) => {
          cached = new Set(list)
          return cached
        })
        .catch(() => new Set<string>())
        .finally(() => { inFlight = null })
    }
    inFlight.then(s => { if (alive) setNames(s) })
    return () => { alive = false }
  }, [])

  return names
}
