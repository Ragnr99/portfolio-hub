/**
 * Pokemon Abilities System
 *
 * Abilities are passive effects that trigger automatically during battle.
 * They can modify stats, change type effectiveness, prevent status, and more.
 *
 * This file implements the most common competitive abilities you see in tournaments.
 * Each ability has specific trigger conditions and effects on the battle.
 *
 * Examples of how abilities work:
 * - Intimidate: When you switch in, lower opponent's Attack by 1 stage
 * - Levitate: Makes you immune to Ground-type moves
 * - Blaze: When HP is below 1/3, Fire moves get 1.5x power boost
 * - Sturdy: Survive any one-hit KO with 1 HP (like a built-in Focus Sash)
 */

/**
 * Ability Interface
 *
 * Defines the structure of an ability with its name and description.
 * The actual effects are handled in the battle calculation functions.
 */
export interface Ability {
  name: string        // The ability's name (e.g., "Intimidate")
  description: string // What the ability does (for UI display)
}

/**
 * Common Competitive Abilities
 *
 * These are the abilities you see most often in competitive Pokemon battles.
 * They're organized by how they affect the game:
 * - Stat modifiers (Intimidate, Download)
 * - Type immunities (Levitate, Water Absorb)
 * - Damage boosters (Blaze, Torrent, Overgrow)
 * - Survivability (Sturdy, Multiscale)
 * - Speed manipulation (Speed Boost, Chlorophyll)
 * - Status prevention (Immunity, Limber)
 */
export const ABILITIES: Record<string, Ability> = {
  // ==================================================================================
  // STAT MODIFICATION ABILITIES
  // ==================================================================================

  intimidate: {
    name: 'Intimidate',
    description: 'Lowers the foe\'s Attack stat when switching in',
  },
  download: {
    name: 'Download',
    description: 'Raises Attack or Sp. Attack based on opponent\'s lower defensive stat',
  },
  competitive: {
    name: 'Competitive',
    description: 'Sharply raises Sp. Attack when a stat is lowered',
  },
  defiant: {
    name: 'Defiant',
    description: 'Sharply raises Attack when a stat is lowered',
  },

  // ==================================================================================
  // TYPE IMMUNITY ABILITIES
  // ==================================================================================

  levitate: {
    name: 'Levitate',
    description: 'Makes the Pokemon immune to Ground-type moves',
  },
  waterAbsorb: {
    name: 'Water Absorb',
    description: 'Heals 25% HP when hit by a Water-type move',
  },
  voltAbsorb: {
    name: 'Volt Absorb',
    description: 'Heals 25% HP when hit by an Electric-type move',
  },
  flashFire: {
    name: 'Flash Fire',
    description: 'Powers up Fire-type moves after being hit by a Fire move',
  },
  sapSipper: {
    name: 'Sap Sipper',
    description: 'Raises Attack when hit by a Grass-type move',
  },
  lightningRod: {
    name: 'Lightning Rod',
    description: 'Draws in Electric-type moves and raises Sp. Attack',
  },
  stormDrain: {
    name: 'Storm Drain',
    description: 'Draws in Water-type moves and raises Sp. Attack',
  },

  // ==================================================================================
  // DAMAGE BOOST ABILITIES (TYPE-BASED)
  // ==================================================================================

  blaze: {
    name: 'Blaze',
    description: 'Powers up Fire-type moves when HP is low (below 1/3)',
  },
  torrent: {
    name: 'Torrent',
    description: 'Powers up Water-type moves when HP is low (below 1/3)',
  },
  overgrow: {
    name: 'Overgrow',
    description: 'Powers up Grass-type moves when HP is low (below 1/3)',
  },
  swarm: {
    name: 'Swarm',
    description: 'Powers up Bug-type moves when HP is low (below 1/3)',
  },

  // ==================================================================================
  // SURVIVABILITY ABILITIES
  // ==================================================================================

  sturdy: {
    name: 'Sturdy',
    description: 'Survives any attack with at least 1 HP if at full health',
  },
  multiscale: {
    name: 'Multiscale',
    description: 'Halves damage received when at full HP',
  },

  // ==================================================================================
  // SPEED MANIPULATION ABILITIES
  // ==================================================================================

  speedBoost: {
    name: 'Speed Boost',
    description: 'Raises Speed by 1 stage at the end of each turn',
  },
  chlorophyll: {
    name: 'Chlorophyll',
    description: 'Doubles Speed in harsh sunlight',
  },
  swiftSwim: {
    name: 'Swift Swim',
    description: 'Doubles Speed in rain',
  },
  sandRush: {
    name: 'Sand Rush',
    description: 'Doubles Speed in a sandstorm',
  },
  slushRush: {
    name: 'Slush Rush',
    description: 'Doubles Speed in hail',
  },

  // ==================================================================================
  // STATUS PREVENTION ABILITIES
  // ==================================================================================

  immunity: {
    name: 'Immunity',
    description: 'Prevents the Pokemon from being poisoned',
  },
  limber: {
    name: 'Limber',
    description: 'Prevents the Pokemon from being paralyzed',
  },
  waterVeil: {
    name: 'Water Veil',
    description: 'Prevents the Pokemon from being burned',
  },
  insomnia: {
    name: 'Insomnia',
    description: 'Prevents the Pokemon from falling asleep',
  },
  vitalSpirit: {
    name: 'Vital Spirit',
    description: 'Prevents the Pokemon from falling asleep',
  },
  magmaArmor: {
    name: 'Magma Armor',
    description: 'Prevents the Pokemon from being frozen',
  },

  // ==================================================================================
  // ACCURACY/EVASION ABILITIES
  // ==================================================================================

  compoundEyes: {
    name: 'Compound Eyes',
    description: 'Boosts the Pokemon\'s accuracy by 30%',
  },
  sandVeil: {
    name: 'Sand Veil',
    description: 'Raises evasion in a sandstorm',
  },
  snowCloak: {
    name: 'Snow Cloak',
    description: 'Raises evasion in hail',
  },

  // ==================================================================================
  // MISC COMPETITIVE ABILITIES
  // ==================================================================================

  adaptability: {
    name: 'Adaptability',
    description: 'Powers up STAB moves from 1.5x to 2x',
  },
  technician: {
    name: 'Technician',
    description: 'Powers up weak moves (60 power or less) by 1.5x',
  },
  ironFist: {
    name: 'Iron Fist',
    description: 'Powers up punching moves by 1.2x',
  },
  sheerForce: {
    name: 'Sheer Force',
    description: 'Removes secondary effects but powers up moves by 1.3x',
  },
  skillLink: {
    name: 'Skill Link',
    description: 'Multi-hit moves always hit 5 times',
  },
  magicGuard: {
    name: 'Magic Guard',
    description: 'Only takes damage from attacks (not status, weather, recoil, etc.)',
  },
  moldBreaker: {
    name: 'Mold Breaker',
    description: 'Moves ignore the target\'s ability',
  },
}

/**
 * Get Ability by Name
 *
 * Helper function to look up an ability by its key.
 * Returns undefined if the ability doesn't exist.
 *
 * @param abilityKey - The ability's key (e.g., 'intimidate', 'levitate')
 * @returns The Ability object or undefined
 */
export function getAbility(abilityKey: string): Ability | undefined {
  return ABILITIES[abilityKey]
}

/**
 * Get All Abilities as Array
 *
 * Returns all abilities as an array for UI purposes (like dropdowns).
 * Useful when you need to show a list of available abilities.
 *
 * @returns Array of all Ability objects
 */
export function getAllAbilities(): Ability[] {
  return Object.values(ABILITIES)
}

/**
 * Check Type Immunity
 *
 * Some abilities grant immunity to specific move types.
 * This function checks if an ability makes the Pokemon immune to a move.
 *
 * Examples:
 * - Levitate makes you immune to Ground moves
 * - Water Absorb makes you immune to Water moves (and heals instead!)
 * - Flash Fire makes you immune to Fire moves (after being hit once)
 *
 * @param abilityKey - The defender's ability
 * @param moveType - The type of move being used
 * @returns true if immune, false otherwise
 */
export function checkTypeImmunity(abilityKey: string, moveType: string): boolean {
  const immunities: Record<string, string[]> = {
    levitate: ['ground'],
    waterAbsorb: ['water'],
    voltAbsorb: ['electric'],
    flashFire: ['fire'],
    sapSipper: ['grass'],
    lightningRod: ['electric'],
    stormDrain: ['water'],
  }

  const immuneTypes = immunities[abilityKey]
  return immuneTypes ? immuneTypes.includes(moveType.toLowerCase()) : false
}

/**
 * Check Status Immunity
 *
 * Some abilities prevent specific status conditions.
 * This is checked before applying status moves like Thunder Wave or Toxic.
 *
 * Examples:
 * - Immunity prevents Poison
 * - Limber prevents Paralysis
 * - Water Veil prevents Burn
 *
 * @param abilityKey - The Pokemon's ability
 * @param status - The status condition being applied ('burn', 'paralyze', etc.)
 * @returns true if immune, false otherwise
 */
export function checkStatusImmunity(abilityKey: string, status: string): boolean {
  const immunities: Record<string, string[]> = {
    immunity: ['poison'],
    limber: ['paralyze'],
    waterVeil: ['burn'],
    insomnia: ['sleep'],
    vitalSpirit: ['sleep'],
    magmaArmor: ['freeze'],
  }

  const immuneStatuses = immunities[abilityKey]
  return immuneStatuses ? immuneStatuses.includes(status.toLowerCase()) : false
}

/**
 * Apply Ability Damage Modifier
 *
 * Some abilities modify the damage of moves.
 * This is called during damage calculation to apply ability-based multipliers.
 *
 * Damage boost abilities:
 * - Blaze/Torrent/Overgrow/Swarm: 1.5x when HP < 1/3
 * - Adaptability: Changes STAB from 1.5x to 2x
 * - Technician: 1.5x for weak moves (60 power or less)
 * - Iron Fist: 1.2x for punching moves
 * - Sheer Force: 1.3x but removes secondary effects
 *
 * @param abilityKey - The attacker's ability
 * @param moveType - The move's type
 * @param movePower - The move's base power
 * @param currentHP - Attacker's current HP
 * @param maxHP - Attacker's max HP
 * @param attackerTypes - Attacker's types (for STAB)
 * @returns Damage multiplier (1.0 = no change, 1.5 = 50% boost, etc.)
 */
export function getAbilityDamageModifier(
  abilityKey: string,
  moveType: string,
  movePower: number,
  currentHP: number,
  maxHP: number,
  attackerTypes: string[]
): number {
  // Blaze, Torrent, Overgrow, Swarm (type-specific boosts when HP < 1/3)
  const lowHPBoosts: Record<string, string> = {
    blaze: 'fire',
    torrent: 'water',
    overgrow: 'grass',
    swarm: 'bug',
  }

  const boostedType = lowHPBoosts[abilityKey]
  if (boostedType && moveType.toLowerCase() === boostedType && currentHP < maxHP / 3) {
    return 1.5 // 50% boost when low on HP
  }

  // Adaptability (boosts STAB from 1.5x to 2x)
  if (abilityKey === 'adaptability' && attackerTypes.includes(moveType)) {
    return 2.0 / 1.5 // This multiplies with STAB to make 2x total instead of 1.5x
  }

  // Technician (1.5x for weak moves)
  if (abilityKey === 'technician' && movePower <= 60 && movePower > 0) {
    return 1.5
  }

  // Iron Fist (1.2x for punching moves)
  // Note: You'd need to track which moves are punching moves
  // For now, we'll leave this as a placeholder
  if (abilityKey === 'ironFist') {
    // TODO: Implement punching move detection
    return 1.0
  }

  // Sheer Force (1.3x but removes secondary effects)
  if (abilityKey === 'sheerForce') {
    // TODO: Implement secondary effect removal
    return 1.3
  }

  // No modifier
  return 1.0
}

/**
 * Apply Ability Defense Modifier
 *
 * Some abilities modify damage received.
 * This is called during damage calculation for the defender's ability.
 *
 * Defensive abilities:
 * - Multiscale: Halves damage when at full HP
 *
 * @param abilityKey - The defender's ability
 * @param currentHP - Defender's current HP
 * @param maxHP - Defender's max HP
 * @returns Damage multiplier (0.5 = half damage, 1.0 = no change)
 */
export function getAbilityDefenseModifier(
  abilityKey: string,
  currentHP: number,
  maxHP: number
): number {
  // Multiscale (halve damage at full HP)
  if (abilityKey === 'multiscale' && currentHP === maxHP) {
    return 0.5
  }

  // No modifier
  return 1.0
}

/**
 * Get Random Ability for Pokemon
 *
 * Each Pokemon species has 1-3 possible abilities.
 * This function selects a random one from their pool.
 *
 * In the real games, each Pokemon has:
 * - Ability 1 (50% chance)
 * - Ability 2 (50% chance, some Pokemon don't have this)
 * - Hidden Ability (special, requires breeding/events)
 *
 * For now, we'll just return common competitive abilities.
 * TODO: Load real ability pools from Pokemon data
 *
 * @param pokemonName - The Pokemon's species name
 * @returns A random ability key
 */
export function getRandomAbilityForPokemon(_pokemonName: string): string {
  // Placeholder: Return a random common ability
  // In a real implementation, you'd look this up from the Pokemon's data
  const commonAbilities = [
    'intimidate',
    'levitate',
    'sturdy',
    'speedBoost',
    'adaptability',
    'technician',
  ]

  return commonAbilities[Math.floor(Math.random() * commonAbilities.length)]
}
