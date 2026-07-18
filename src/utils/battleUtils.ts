/**
 * Battle Calculation Utilities
 *
 * This file handles all the heavy lifting for Pokemon battle mechanics.
 * It calculates damage, type effectiveness, stat modifiers, and status effects.
 * These formulas are based on the official Pokemon damage calculation.
 */

import {
  checkTypeImmunity,
  getAbilityDamageModifier,
  getAbilityDefenseModifier,
} from './abilities'

/**
 * Type Effectiveness Chart
 *
 * This massive object tells us how effective each type is against other types.
 * - 2 = Super effective (2x damage)
 * - 0.5 = Not very effective (half damage)
 * - 0 = No effect (immune)
 * - If a type isn't listed, it's neutral (1x damage)
 *
 * Example: Fire moves deal 2x damage to Grass, but only 0.5x to Water
 */
export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

/**
 * Calculate Type Effectiveness
 *
 * Figures out how effective a move is against a Pokemon based on types.
 * Pokemon can have 1 or 2 types, so we multiply the effectiveness together.
 *
 * Examples:
 * - Fire move vs Grass Pokemon = 2x damage
 * - Fire move vs Grass/Bug Pokemon = 2x * 2x = 4x damage (super effective!)
 * - Electric move vs Ground Pokemon = 0x damage (no effect)
 *
 * @param moveType - The type of the move being used (like "fire" or "water")
 * @param defenderTypes - Array of the defender's types (can be 1 or 2 types)
 * @returns The damage multiplier (0, 0.25, 0.5, 1, 2, or 4)
 */
export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let effectiveness = 1 // Start at neutral (1x damage)

  // Check effectiveness against each of the defender's types
  for (const type of defenderTypes) {
    const matchup = TYPE_CHART[moveType]?.[type]
    if (matchup !== undefined) {
      effectiveness *= matchup // Multiply the effectiveness
    }
  }

  return effectiveness
}

/**
 * Get Stat Stage Multiplier
 *
 * In Pokemon battles, moves can boost or lower your stats (like Swords Dance raising Attack).
 * Stats can be modified from -6 to +6 stages. This function converts those stages into multipliers.
 *
 * Stage examples:
 * - +1 = 1.5x (50% boost)
 * - +2 = 2x (double)
 * - +6 = 4x (max boost)
 * - -1 = 0.67x (33% reduction)
 * - -6 = 0.25x (max reduction)
 *
 * @param stage - The stat stage modifier (-6 to +6)
 * @returns The multiplier to apply to the stat
 */
export function getStatMultiplier(stage: number): number {
  if (stage >= 0) {
    // Positive stages: (2 + stage) / 2
    // +1 = 3/2 = 1.5x, +2 = 4/2 = 2x, etc.
    return (2 + stage) / 2
  } else {
    // Negative stages: 2 / (2 + |stage|)
    // -1 = 2/3 = 0.67x, -2 = 2/4 = 0.5x, etc.
    return 2 / (2 + Math.abs(stage))
  }
}

/**
 * Calculate Damage
 *
 * This is THE big function that calculates how much damage a move deals.
 * It uses the official Pokemon damage formula with all the modifiers:
 * - Physical vs Special (different stats used)
 * - Stat stage modifications (buffs/debuffs)
 * - STAB bonus (Same Type Attack Bonus - 1.5x if move matches attacker's type)
 * - Type effectiveness (super effective, not very effective, etc.)
 * - Random factor (85-100% for some variation)
 *
 * @param attacker - The Pokemon using the move
 * @param defender - The Pokemon getting hit
 * @param move - The move being used
 * @returns The final damage number
 */
export function calculateDamage(
  attacker: {
    level: number
    attack: number
    spAttack: number
    types: string[]
    statStages: { attack: number; spAttack: number }
    ability?: string
    hp?: number
    maxHp?: number
  },
  defender: {
    defense: number
    spDefense: number
    types: string[]
    statStages: { defense: number; spDefense: number }
    ability?: string
    hp?: number
    maxHp?: number
  },
  move: {
    power: number
    type: string
    category: 'physical' | 'special' | 'status'
  }
): number {
  // Status moves don't deal damage (like Thunder Wave or Swords Dance)
  if (move.category === 'status' || move.power === 0) return 0

  // Check if defender is immune due to ability (like Levitate vs Ground moves)
  if (defender.ability && checkTypeImmunity(defender.ability, move.type)) {
    return 0 // Move has no effect!
  }

  // Figure out if this is a physical or special move
  // Physical moves use Attack vs Defense (like Tackle, Earthquake)
  // Special moves use Sp. Attack vs Sp. Defense (like Flamethrower, Thunderbolt)
  const isPhysical = move.category === 'physical'
  const attackStat = isPhysical ? attacker.attack : attacker.spAttack
  const defenseStat = isPhysical ? defender.defense : defender.spDefense
  const attackStage = isPhysical ? attacker.statStages.attack : attacker.statStages.spAttack
  const defenseStage = isPhysical ? defender.statStages.defense : defender.statStages.spDefense

  // Apply stat stage modifiers (like from Swords Dance or Growl)
  const effectiveAttack = Math.floor(attackStat * getStatMultiplier(attackStage))
  const effectiveDefense = Math.floor(defenseStat * getStatMultiplier(defenseStage))

  // Step 1: Base damage calculation
  // This is the official Pokemon formula - looks complex but it's just math
  // Formula: ((((2 * Level / 5 + 2) * Power * Attack / Defense) / 50) + 2)
  let damage = Math.floor(
    Math.floor(Math.floor((2 * attacker.level) / 5 + 2) * move.power * effectiveAttack / effectiveDefense) / 50 + 2
  )

  // Step 2: STAB (Same Type Attack Bonus)
  // If the move type matches the attacker's type, 1.5x damage
  // Example: Charizard (Fire type) using Flamethrower (Fire move) gets STAB
  const stab = attacker.types.includes(move.type) ? 1.5 : 1
  damage = Math.floor(damage * stab)

  // Step 3: Type effectiveness
  // Apply super effective, not very effective, etc.
  const effectiveness = getTypeEffectiveness(move.type, defender.types)
  damage = Math.floor(damage * effectiveness)

  // Step 4: Ability modifiers
  // Apply damage boosts from attacker's ability (like Blaze, Technician, Adaptability)
  if (attacker.ability && attacker.hp !== undefined && attacker.maxHp !== undefined) {
    const abilityMod = getAbilityDamageModifier(
      attacker.ability,
      move.type,
      move.power,
      attacker.hp,
      attacker.maxHp,
      attacker.types
    )
    damage = Math.floor(damage * abilityMod)
  }

  // Apply damage reduction from defender's ability (like Multiscale)
  if (defender.ability && defender.hp !== undefined && defender.maxHp !== undefined) {
    const defenseMod = getAbilityDefenseModifier(defender.ability, defender.hp, defender.maxHp)
    damage = Math.floor(damage * defenseMod)
  }

  // Step 5: Random factor
  // Add some randomness (85-100%) so the same move doesn't always deal exact damage
  // This keeps battles interesting and unpredictable
  damage = Math.floor(damage * (0.85 + Math.random() * 0.15))

  // Make sure we deal at least 1 damage (even if everything resists)
  return Math.max(1, damage)
}

/**
 * Apply Status Effect
 *
 * Status conditions happen at the end of each turn and can really mess you up.
 * This function handles the passive damage and effects from status conditions.
 *
 * Status effects:
 * - Burn: Deals 1/16 of max HP each turn + halves physical attack (not implemented yet)
 * - Poison: Deals 1/8 of max HP each turn (ouch!)
 * - Sleep: Pokemon can't move for 1-3 turns
 * - Paralyze: 25% chance to be fully paralyzed and unable to move
 * - Freeze: Pokemon is frozen solid until they thaw out (20% chance per turn)
 *
 * @param pokemon - The Pokemon with the status condition
 * @param attacker - The attacker's stats (currently unused but kept for future use)
 * @returns Object with damage dealt and message to display
 */
export function applyStatusEffect(
  pokemon: { hp: number; status: string; sleepTurns: number },
  attacker: { attack: number; spAttack: number }
): { damage: number; message: string } {
  let damage = 0
  let message = ''

  switch (pokemon.status) {
    case 'burn':
      // Burn deals 1/16 of max HP per turn
      damage = Math.floor(pokemon.hp * 0.0625)
      message = ' is hurt by its burn!'
      break

    case 'poison':
      // Poison deals 1/8 of max HP per turn (twice as bad as burn!)
      damage = Math.floor(pokemon.hp * 0.125)
      message = ' is hurt by poison!'
      break

    case 'sleep':
      // Sleep just prevents the Pokemon from moving
      // The sleepTurns counter is handled elsewhere
      if (pokemon.sleepTurns > 0) {
        message = ' is fast asleep.'
      }
      break

    case 'paralyze':
      // 25% chance to be fully paralyzed and unable to attack
      if (Math.random() < 0.25) {
        message = ' is paralyzed! It can\'t move!'
      }
      break

    case 'freeze':
      // Frozen Pokemon can't move until they thaw (20% chance per turn)
      if (Math.random() < 0.2) {
        message = ' thawed out!'
      } else {
        message = ' is frozen solid!'
      }
      break
  }

  return { damage, message }
}
