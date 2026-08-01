/**
 * Deckfall content: cards, enemies, relics.
 *
 * Kept apart from the engine so the game can be rebalanced without touching a
 * line of logic. Everything an effect can do is expressed as data (see `Effect`
 * in engine.ts), so adding a card is adding an entry here, not a new code path.
 */

import type { CardDef, EnemyDef, RelicDef } from './engine'

/* ----------------------------------------------------------------- cards -- */

export const CARDS: Record<string, CardDef> = {
  strike: {
    id: 'strike', name: 'Strike', cost: 1, type: 'attack', rarity: 'starter',
    text: 'Deal 6 damage.',
    effects: [{ kind: 'damage', amount: 6 }],
    upgrade: { text: 'Deal 9 damage.', effects: [{ kind: 'damage', amount: 9 }] },
  },
  guard: {
    id: 'guard', name: 'Guard', cost: 1, type: 'skill', rarity: 'starter',
    text: 'Gain 5 Block.',
    effects: [{ kind: 'block', amount: 5 }],
    upgrade: { text: 'Gain 8 Block.', effects: [{ kind: 'block', amount: 8 }] },
  },
  cleave: {
    id: 'cleave', name: 'Cleave', cost: 1, type: 'attack', rarity: 'common',
    text: 'Deal 5 damage. Draw 1.',
    effects: [{ kind: 'damage', amount: 5 }, { kind: 'draw', amount: 1 }],
    upgrade: { text: 'Deal 8 damage. Draw 1.', effects: [{ kind: 'damage', amount: 8 }, { kind: 'draw', amount: 1 }] },
  },
  jab: {
    id: 'jab', name: 'Jab', cost: 0, type: 'attack', rarity: 'common',
    text: 'Deal 4 damage.',
    effects: [{ kind: 'damage', amount: 4 }],
    upgrade: { text: 'Deal 6 damage.', effects: [{ kind: 'damage', amount: 6 }] },
  },
  brace: {
    id: 'brace', name: 'Brace', cost: 2, type: 'skill', rarity: 'common',
    text: 'Gain 12 Block.',
    effects: [{ kind: 'block', amount: 12 }],
    upgrade: { text: 'Gain 17 Block.', effects: [{ kind: 'block', amount: 17 }] },
  },
  expose: {
    id: 'expose', name: 'Expose', cost: 1, type: 'skill', rarity: 'common',
    text: 'Apply 2 Vulnerable.',
    effects: [{ kind: 'applyEnemy', status: 'vulnerable', amount: 2 }],
    upgrade: { text: 'Apply 3 Vulnerable.', effects: [{ kind: 'applyEnemy', status: 'vulnerable', amount: 3 }] },
  },
  sap: {
    id: 'sap', name: 'Sap', cost: 1, type: 'skill', rarity: 'common',
    text: 'Apply 2 Weak.',
    effects: [{ kind: 'applyEnemy', status: 'weak', amount: 2 }],
    upgrade: { text: 'Apply 3 Weak.', effects: [{ kind: 'applyEnemy', status: 'weak', amount: 3 }] },
  },
  flurry: {
    id: 'flurry', name: 'Flurry', cost: 2, type: 'attack', rarity: 'uncommon',
    text: 'Deal 3 damage 3 times.',
    effects: [{ kind: 'damage', amount: 3, times: 3 }],
    upgrade: { text: 'Deal 3 damage 5 times.', effects: [{ kind: 'damage', amount: 3, times: 5 }] },
  },
  siphon: {
    id: 'siphon', name: 'Siphon', cost: 2, type: 'attack', rarity: 'uncommon',
    text: 'Deal 7 damage. Heal 4.',
    effects: [{ kind: 'damage', amount: 7 }, { kind: 'heal', amount: 4 }],
    upgrade: { text: 'Deal 10 damage. Heal 6.', effects: [{ kind: 'damage', amount: 10 }, { kind: 'heal', amount: 6 }] },
  },
  focus: {
    id: 'focus', name: 'Focus', cost: 1, type: 'skill', rarity: 'uncommon',
    text: 'Draw 2. Gain 1 Energy.',
    effects: [{ kind: 'draw', amount: 2 }, { kind: 'energy', amount: 1 }],
    upgrade: { text: 'Draw 3. Gain 1 Energy.', effects: [{ kind: 'draw', amount: 3 }, { kind: 'energy', amount: 1 }] },
  },
  temper: {
    id: 'temper', name: 'Temper', cost: 1, type: 'power', rarity: 'uncommon',
    text: 'Gain 2 Strength.',
    effects: [{ kind: 'applySelf', status: 'strength', amount: 2 }],
    upgrade: { text: 'Gain 3 Strength.', effects: [{ kind: 'applySelf', status: 'strength', amount: 3 }] },
  },
  bulwark: {
    id: 'bulwark', name: 'Bulwark', cost: 1, type: 'power', rarity: 'uncommon',
    text: 'Gain 3 Block at the start of each turn.',
    effects: [{ kind: 'applySelf', status: 'regenBlock', amount: 3 }],
    upgrade: {
      text: 'Gain 5 Block at the start of each turn.',
      effects: [{ kind: 'applySelf', status: 'regenBlock', amount: 5 }],
    },
  },
  execute: {
    id: 'execute', name: 'Execute', cost: 2, type: 'attack', rarity: 'rare',
    text: 'Deal 10 damage. Double it if the enemy is below half HP.',
    effects: [{ kind: 'execute', amount: 10 }],
    upgrade: {
      text: 'Deal 14 damage. Double it if the enemy is below half HP.',
      effects: [{ kind: 'execute', amount: 14 }],
    },
  },
  reckoning: {
    id: 'reckoning', name: 'Reckoning', cost: 3, type: 'attack', rarity: 'rare',
    text: 'Deal damage equal to 3x your Block.',
    effects: [{ kind: 'blockScaledDamage', amount: 3 }],
    upgrade: { text: 'Deal damage equal to 4x your Block.', effects: [{ kind: 'blockScaledDamage', amount: 4 }] },
  },
  secondWind: {
    id: 'secondWind', name: 'Second Wind', cost: 1, type: 'skill', rarity: 'rare',
    text: 'Gain 6 Block. Draw 1. Exhaust.',
    exhaust: true,
    effects: [{ kind: 'block', amount: 6 }, { kind: 'draw', amount: 1 }],
    upgrade: { text: 'Gain 10 Block. Draw 2. Exhaust.', effects: [{ kind: 'block', amount: 10 }, { kind: 'draw', amount: 2 }] },
  },
  overload: {
    id: 'overload', name: 'Overload', cost: 0, type: 'skill', rarity: 'rare',
    text: 'Gain 2 Energy. Take 3 damage. Exhaust.',
    exhaust: true,
    effects: [{ kind: 'energy', amount: 2 }, { kind: 'selfDamage', amount: 3 }],
    upgrade: { text: 'Gain 3 Energy. Take 3 damage. Exhaust.', effects: [{ kind: 'energy', amount: 3 }, { kind: 'selfDamage', amount: 3 }] },
  },
}

export const STARTER_DECK = [
  'strike', 'strike', 'strike', 'strike',
  'guard', 'guard', 'guard', 'guard',
  'jab', 'expose',
]

export const REWARD_POOL = [
  'cleave', 'jab', 'brace', 'expose', 'sap',
  'flurry', 'siphon', 'focus', 'temper', 'bulwark',
  'execute', 'reckoning', 'secondWind', 'overload',
]

/* ---------------------------------------------------------------- enemies -- */
// Intents are a fixed cycle, so a careful player can read the pattern and plan
// two turns ahead. That's the whole game: the fight is information, not reflex.

export const ENEMIES: Record<string, EnemyDef> = {
  husk: {
    id: 'husk', name: 'Husk', hp: 32, tier: 'normal',
    pattern: [{ kind: 'attack', amount: 7 }, { kind: 'block', amount: 6 }],
  },
  cinder: {
    id: 'cinder', name: 'Cinder Wisp', hp: 26, tier: 'normal',
    pattern: [{ kind: 'attack', amount: 5 }, { kind: 'attack', amount: 5 }, { kind: 'buff', status: 'strength', amount: 2 }],
  },
  gnasher: {
    id: 'gnasher', name: 'Gnasher', hp: 40, tier: 'normal',
    pattern: [{ kind: 'attack', amount: 9 }, { kind: 'attack', amount: 4, times: 2 }],
  },
  weaver: {
    id: 'weaver', name: 'Bone Weaver', hp: 37, tier: 'normal',
    pattern: [{ kind: 'debuff', status: 'weak', amount: 2 }, { kind: 'attack', amount: 8 }, { kind: 'block', amount: 8 }],
  },
  lurker: {
    id: 'lurker', name: 'Deep Lurker', hp: 45, tier: 'normal',
    pattern: [{ kind: 'attack', amount: 6 }, { kind: 'debuff', status: 'vulnerable', amount: 2 }, { kind: 'attack', amount: 11 }],
  },
  warden: {
    id: 'warden', name: 'Warden', hp: 72, tier: 'elite',
    pattern: [
      { kind: 'attack', amount: 11 },
      { kind: 'block', amount: 10 },
      { kind: 'attack', amount: 6, times: 2 },
      { kind: 'buff', status: 'strength', amount: 3 },
    ],
  },
  chorus: {
    id: 'chorus', name: 'Hollow Chorus', hp: 66, tier: 'elite',
    pattern: [
      { kind: 'debuff', status: 'weak', amount: 2 },
      { kind: 'attack', amount: 14 },
      { kind: 'debuff', status: 'vulnerable', amount: 2 },
      { kind: 'attack', amount: 8, times: 2 },
    ],
  },
  spire: {
    id: 'spire', name: 'The Spire Heart', hp: 120, tier: 'boss',
    pattern: [
      { kind: 'attack', amount: 10 },
      { kind: 'buff', status: 'strength', amount: 3 },
      { kind: 'attack', amount: 7, times: 3 },
      { kind: 'block', amount: 14 },
      { kind: 'debuff', status: 'vulnerable', amount: 3 },
    ],
  },
}

export const NORMAL_ENEMIES = ['husk', 'cinder', 'gnasher', 'weaver', 'lurker']
export const ELITE_ENEMIES = ['warden', 'chorus']

/* ----------------------------------------------------------------- relics -- */

export const RELICS: Record<string, RelicDef> = {
  emberCore: {
    id: 'emberCore', name: 'Ember Core',
    text: 'Start each combat with 1 Strength.',
  },
  ironWeave: {
    id: 'ironWeave', name: 'Iron Weave',
    text: 'Start each combat with 6 Block.',
  },
  quickHand: {
    id: 'quickHand', name: 'Quick Hand',
    text: 'Draw 1 extra card each turn.',
  },
  bloodPact: {
    id: 'bloodPact', name: 'Blood Pact',
    text: 'Heal 4 after every victory.',
  },
  cracked: {
    id: 'cracked', name: 'Cracked Lens',
    text: 'The first card you play each turn costs 0.',
  },
  deepWell: {
    id: 'deepWell', name: 'Deep Well',
    text: '+1 max Energy.',
  },
}

export const RELIC_POOL = Object.keys(RELICS)
