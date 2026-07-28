/**
 * Pokemon Constants
 *
 * This file contains all the shared constants used across the Pokemon battle system.
 * Centralizing these values makes it easy to tweak game balance and maintain consistency.
 */

// Tailwind CSS classes for each Pokemon type
// These make the type badges look nice and match the official Pokemon colors
export const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-400',      // Normal types are pretty basic, so gray works
  fire: 'bg-orange-500',       // Fire is hot and orangey-red
  water: 'bg-blue-500',        // Water is blue like the ocean
  electric: 'bg-yellow-400',   // Electric is bright yellow like lightning
  grass: 'bg-green-500',       // Grass is green like plants
  ice: 'bg-cyan-300',          // Ice is light blue/cyan like frozen water
  fighting: 'bg-red-700',      // Fighting is dark red for intensity
  poison: 'bg-purple-500',     // Poison is purple like toxic goo
  ground: 'bg-yellow-600',     // Ground is darker yellow like dirt
  flying: 'bg-indigo-400',     // Flying is light blue like the sky
  psychic: 'bg-pink-500',      // Psychic is pink for mind powers
  bug: 'bg-lime-500',          // Bug is lime green like insects
  rock: 'bg-yellow-700',       // Rock is even darker yellow/brown
  ghost: 'bg-purple-700',      // Ghost is dark purple for spooky vibes
  dragon: 'bg-indigo-600',     // Dragon is deep indigo for mystical creatures
  dark: 'bg-gray-700',         // Dark is dark gray (obviously)
  steel: 'bg-gray-500',        // Steel is metallic gray
  fairy: 'bg-pink-300',        // Fairy is light pink for magical creatures
}

// Text colors for status condition indicators
// These show up next to the Pokemon's HP to indicate what's wrong with them
export const STATUS_COLORS: Record<string, string> = {
  burn: 'text-orange-500',     // Burn is orange like fire
  paralyze: 'text-yellow-500', // Paralyze is yellow like electricity
  sleep: 'text-blue-500',      // Sleep is blue for calm/sleepy vibes
  poison: 'text-purple-500',   // Poison is purple like toxic damage
  freeze: 'text-cyan-500',     // Freeze is cyan like ice
}

// Only Pokemon with base stat totals of 400+ are allowed in battles

// All Pokemon are set to level 50 for balanced competitive battles
// Level 50 is the standard for official Pokemon tournaments
export const DEFAULT_LEVEL = 50

// Each team can have up to 3 Pokemon
// Keeps battles fast-paced instead of the usual 6v6
export const MAX_TEAM_SIZE = 3

// Each Pokemon can know up to 4 moves at once
// This is the official Pokemon limit
export const MAX_MOVES = 4

// ==================================================================================
// COMPETITIVE POKEMON FEATURES
// ==================================================================================

/**
 * Pokemon Natures
 *
 * Natures modify a Pokemon's stats, boosting one and lowering another.
 * This adds strategic depth - do you want more speed or more attack?
 *
 * Format: { name, increased stat, decreased stat }
 * - Increased stat gets +10% (1.1x multiplier)
 * - Decreased stat gets -10% (0.9x multiplier)
 * - Neutral natures don't modify anything (for balanced Pokemon)
 */
export const NATURES = [
  // Neutral natures (no stat changes)
  { name: 'Hardy', increases: null, decreases: null },
  { name: 'Docile', increases: null, decreases: null },
  { name: 'Serious', increases: null, decreases: null },
  { name: 'Bashful', increases: null, decreases: null },
  { name: 'Quirky', increases: null, decreases: null },

  // Attack-boosting natures
  { name: 'Lonely', increases: 'attack', decreases: 'defense' },
  { name: 'Brave', increases: 'attack', decreases: 'speed' },
  { name: 'Adamant', increases: 'attack', decreases: 'spAttack' },
  { name: 'Naughty', increases: 'attack', decreases: 'spDefense' },

  // Defense-boosting natures
  { name: 'Bold', increases: 'defense', decreases: 'attack' },
  { name: 'Relaxed', increases: 'defense', decreases: 'speed' },
  { name: 'Impish', increases: 'defense', decreases: 'spAttack' },
  { name: 'Lax', increases: 'defense', decreases: 'spDefense' },

  // Speed-boosting natures
  { name: 'Timid', increases: 'speed', decreases: 'attack' },
  { name: 'Hasty', increases: 'speed', decreases: 'defense' },
  { name: 'Jolly', increases: 'speed', decreases: 'spAttack' },
  { name: 'Naive', increases: 'speed', decreases: 'spDefense' },

  // Special Attack-boosting natures
  { name: 'Modest', increases: 'spAttack', decreases: 'attack' },
  { name: 'Mild', increases: 'spAttack', decreases: 'defense' },
  { name: 'Quiet', increases: 'spAttack', decreases: 'speed' },
  { name: 'Rash', increases: 'spAttack', decreases: 'spDefense' },

  // Special Defense-boosting natures
  { name: 'Calm', increases: 'spDefense', decreases: 'attack' },
  { name: 'Gentle', increases: 'spDefense', decreases: 'defense' },
  { name: 'Sassy', increases: 'spDefense', decreases: 'speed' },
  { name: 'Careful', increases: 'spDefense', decreases: 'spAttack' },
] as const

/**
 * EV and IV Limits
 *
 * EVs (Effort Values):
 * - Gained from battling Pokemon
 * - Max 252 per stat, 510 total across all stats
 * - Every 4 EVs = +1 to that stat at level 50
 *
 * IVs (Individual Values):
 * - Genetic values (like DNA)
 * - 0-31 per stat (perfect = 31)
 * - Can't be changed (except with Bottle Caps in real games)
 */
export const MAX_EV_PER_STAT = 252
export const MAX_TOTAL_EVS = 510
export const MAX_IV = 31
export const MIN_IV = 0
