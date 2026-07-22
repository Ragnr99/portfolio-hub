/**
 * Stat Calculation Utilities
 *
 * Handles the complex stat calculations for competitive Pokemon.
 * This includes EVs, IVs, Natures, and the official Pokemon stat formulas.
 *
 * How Pokemon stats work:
 * 1. Base Stats - The species' base values (e.g., Charizard has 78 base HP)
 * 2. IVs (Individual Values) - Random genetic values 0-31 (like DNA)
 * 3. EVs (Effort Values) - Training values 0-252 per stat (like XP for stats)
 * 4. Nature - Modifies one stat +10% and another -10%
 * 5. Level - Higher level = higher stats
 *
 * All of these combine to give the final stat value used in battle.
 */

import { NATURES, MAX_IV, MAX_EV_PER_STAT } from './pokemonConstants'

/**
 * Nature Type
 *
 * Represents a Pokemon's nature with stat modifiers.
 */
export type Nature = typeof NATURES[number]

/**
 * EV Spread
 *
 * Represents how EVs are distributed across stats.
 * Common spreads:
 * - 252 Attack / 252 Speed / 4 HP (fast physical attacker)
 * - 252 Sp. Attack / 252 Speed / 4 HP (fast special attacker)
 * - 252 HP / 252 Defense / 4 Sp. Defense (physical wall)
 */
export interface EVSpread {
  hp: number        // 0-252
  attack: number    // 0-252
  defense: number   // 0-252
  spAttack: number  // 0-252
  spDefense: number // 0-252
  speed: number     // 0-252
}

/**
 * IV Spread
 *
 * Represents the Pokemon's genetic stat values.
 * Perfect Pokemon have 31 in all stats.
 */
export interface IVSpread {
  hp: number        // 0-31
  attack: number    // 0-31
  defense: number   // 0-31
  spAttack: number  // 0-31
  spDefense: number // 0-31
  speed: number     // 0-31
}

/**
 * Calculate HP Stat
 *
 * HP uses a different formula than other stats:
 * HP = floor(((2 * Base + IV + floor(EV / 4)) * Level / 100)) + Level + 10
 *
 * Example: Charizard at level 50 with 31 IVs, 0 EVs:
 * HP = floor(((2 * 78 + 31 + 0) * 50 / 100)) + 50 + 10 = 153
 *
 * @param base - Base HP stat for the species
 * @param iv - Individual Value (0-31)
 * @param ev - Effort Value (0-252)
 * @param level - Pokemon level
 * @returns Calculated HP
 */
export function calculateHP(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
}

/**
 * Calculate Stat (Attack, Defense, etc.)
 *
 * Non-HP stats use this formula:
 * Stat = floor((floor(((2 * Base + IV + floor(EV / 4)) * Level / 100)) + 5) * Nature)
 *
 * Example: Adamant Charizard's Attack at level 50 with 252 EVs, 31 IVs:
 * Without nature: floor(((2 * 84 + 31 + 63) * 50 / 100)) + 5 = 147
 * With Adamant (+10% Attack): floor(147 * 1.1) = 161
 *
 * @param base - Base stat for the species
 * @param iv - Individual Value (0-31)
 * @param ev - Effort Value (0-252)
 * @param level - Pokemon level
 * @param nature - Nature multiplier (1.1 for increased, 0.9 for decreased, 1.0 for neutral)
 * @returns Calculated stat
 */
export function calculateStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: number
): number {
  const baseStat = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5
  return Math.floor(baseStat * nature)
}

/**
 * Get Nature Multiplier
 *
 * Returns the multiplier for a specific stat based on the nature.
 * - Increased stat: 1.1 (+10%)
 * - Decreased stat: 0.9 (-10%)
 * - Neutral/other stats: 1.0 (no change)
 *
 * @param nature - The Pokemon's nature
 * @param stat - The stat to check ('attack', 'defense', etc.)
 * @returns Multiplier (0.9, 1.0, or 1.1)
 */
export function getNatureMultiplier(
  nature: Nature,
  stat: 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed'
): number {
  if (nature.increases === stat) return 1.1  // +10% boost
  if (nature.decreases === stat) return 0.9  // -10% reduction
  return 1.0 // Neutral (no change)
}

/**
 * Generate Random IVs
 *
 * Creates a random IV spread for a Pokemon.
 * In the real games, wild Pokemon have random IVs.
 *
 * @param perfect - If true, all IVs are 31 (perfect Pokemon)
 * @returns Random IV spread
 */
export function generateRandomIVs(perfect: boolean = false): IVSpread {
  if (perfect) {
    // Perfect Pokemon (competitive standard)
    return {
      hp: 31,
      attack: 31,
      defense: 31,
      spAttack: 31,
      spDefense: 31,
      speed: 31,
    }
  }

  // Random IVs (0-31 for each stat)
  return {
    hp: Math.floor(Math.random() * (MAX_IV + 1)),
    attack: Math.floor(Math.random() * (MAX_IV + 1)),
    defense: Math.floor(Math.random() * (MAX_IV + 1)),
    spAttack: Math.floor(Math.random() * (MAX_IV + 1)),
    spDefense: Math.floor(Math.random() * (MAX_IV + 1)),
    speed: Math.floor(Math.random() * (MAX_IV + 1)),
  }
}

/**
 * Get Default EV Spread
 *
 * Returns a good default EV spread based on the Pokemon's highest stats.
 * This is used for auto-generating competitive spreads.
 *
 * Common spreads:
 * - Physical Attacker: 252 Attack / 252 Speed / 4 HP
 * - Special Attacker: 252 Sp. Attack / 252 Speed / 4 HP
 * - Tank: 252 HP / 252 Defense (or Sp. Defense) / 4 (other defense)
 *
 * @param baseStats - The Pokemon's base stats
 * @returns Optimized EV spread
 */
export function getDefaultEVSpread(baseStats: {
  hp: number
  attack: number
  defense: number
  spAttack: number
  spDefense: number
  speed: number
}): EVSpread {
  // Determine if Pokemon is physical or special attacker
  const isPhysical = baseStats.attack > baseStats.spAttack

  // Determine if Pokemon is fast or bulky
  const isFast = baseStats.speed >= 80

  if (isFast) {
    // Fast Pokemon: Max out offensive stat and speed
    if (isPhysical) {
      return { hp: 4, attack: 252, defense: 0, spAttack: 0, spDefense: 0, speed: 252 }
    } else {
      return { hp: 4, attack: 0, defense: 0, spAttack: 252, spDefense: 0, speed: 252 }
    }
  } else {
    // Slow/Bulky Pokemon: Max out HP and best defense
    const bestDefense = baseStats.defense > baseStats.spDefense ? 'defense' : 'spDefense'
    if (bestDefense === 'defense') {
      return { hp: 252, attack: 0, defense: 252, spAttack: 0, spDefense: 4, speed: 0 }
    } else {
      return { hp: 252, attack: 0, defense: 4, spAttack: 0, spDefense: 252, speed: 0 }
    }
  }
}

/**
 * Get Recommended Nature
 *
 * Returns a good nature based on the Pokemon's stat distribution.
 * This helps auto-generate competitive Pokemon.
 *
 * @param baseStats - The Pokemon's base stats
 * @returns Recommended nature
 */
export function getRecommendedNature(baseStats: {
  hp: number
  attack: number
  defense: number
  spAttack: number
  spDefense: number
  speed: number
}): Nature {
  const isPhysical = baseStats.attack > baseStats.spAttack
  const isFast = baseStats.speed >= 80

  if (isPhysical && isFast) {
    // Fast physical attacker: Jolly (boost Speed, lower Sp. Attack)
    return NATURES.find(n => n.name === 'Jolly')!
  } else if (isPhysical && !isFast) {
    // Slow physical attacker: Adamant (boost Attack, lower Sp. Attack)
    return NATURES.find(n => n.name === 'Adamant')!
  } else if (!isPhysical && isFast) {
    // Fast special attacker: Timid (boost Speed, lower Attack)
    return NATURES.find(n => n.name === 'Timid')!
  } else {
    // Slow special attacker: Modest (boost Sp. Attack, lower Attack)
    return NATURES.find(n => n.name === 'Modest')!
  }
}

/**
 * Validate EV Spread
 *
 * Checks if an EV spread is legal (follows Pokemon rules).
 * Rules:
 * - No stat can exceed 252 EVs
 * - Total EVs cannot exceed 510
 *
 * @param evs - The EV spread to validate
 * @returns Object with { valid: boolean, error?: string }
 */
export function validateEVSpread(evs: EVSpread): { valid: boolean; error?: string } {
  // Check individual stat limits
  for (const [stat, value] of Object.entries(evs)) {
    if (value < 0) {
      return { valid: false, error: `${stat} cannot be negative` }
    }
    if (value > MAX_EV_PER_STAT) {
      return { valid: false, error: `${stat} cannot exceed ${MAX_EV_PER_STAT}` }
    }
  }

  // Check total EV limit
  const total = evs.hp + evs.attack + evs.defense + evs.spAttack + evs.spDefense + evs.speed
  if (total > 510) {
    return { valid: false, error: `Total EVs (${total}) cannot exceed 510` }
  }

  return { valid: true }
}
