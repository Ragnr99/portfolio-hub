/**
 * Pokemon Data Hook
 *
 * This custom React hook loads the Pokemon data from our local JSON file.
 * The cool part: it caches the data globally so we only load it ONCE for the entire app!
 *
 * Why caching matters:
 * - The pokemon-data.json file is 4MB (all 1,025 Pokemon with moves)
 * - Without caching, every page would reload this huge file
 * - With caching, first load takes a second, then instant afterwards
 *
 * How it works:
 * - First component to use this hook loads the data
 * - Data gets stored in module-level variables (cachedPokemonData)
 * - Other components using this hook get the cached data instantly
 * - Even if you navigate between pages, the cache persists!
 */

import { useState, useEffect } from 'react'
import { MIN_BASE_STAT_TOTAL } from '../utils/pokemonConstants'

// Module-level cache (shared across ALL components using this hook)
// This lives outside the component so it survives re-renders and page changes
let cachedPokemonData: any[] | null = null
let cachePromise: Promise<any[]> | null = null

/**
 * Custom hook to load and cache Pokemon data
 *
 * @returns Object with availablePokemon array and loading boolean
 */
export function usePokemonData() {
  const [availablePokemon, setAvailablePokemon] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPokemon()
  }, [])

  const loadPokemon = async () => {
    // Case 1: Data already cached - use it immediately!
    if (cachedPokemonData) {
      const strong = cachedPokemonData.filter((p: any) => p.stats.total >= MIN_BASE_STAT_TOTAL)
      setAvailablePokemon(strong)
      setLoading(false)
      return
    }

    // Case 2: Another component is already loading - wait for their promise
    // This prevents multiple simultaneous fetches of the same file
    if (cachePromise) {
      const data = await cachePromise
      const strong = data.filter((p: any) => p.stats.total >= MIN_BASE_STAT_TOTAL)
      setAvailablePokemon(strong)
      setLoading(false)
      return
    }

    // Case 3: First time loading - fetch the data
    // BASE_URL-aware: the site deploys under /portfolio-hub/ on GitHub Pages
    cachePromise = fetch(`${import.meta.env.BASE_URL}pokemon-data.json`).then(r => r.json())

    try {
      const data = await cachePromise
      cachedPokemonData = data // Cache it for next time!

      // Filter to only strong Pokemon (400+ base stat total)
      const strong = data.filter((p: any) => p.stats.total >= MIN_BASE_STAT_TOTAL)
      setAvailablePokemon(strong)
    } catch (error) {
      console.error('Failed to load Pokemon data:', error)
    } finally {
      setLoading(false)
      cachePromise = null // Clear the promise (but keep the cached data!)
    }
  }

  return { availablePokemon, loading }
}
