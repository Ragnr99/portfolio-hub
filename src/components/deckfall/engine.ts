/**
 * Deckfall engine: all the rules, no rendering.
 *
 * Kept pure and separate from the component so the whole game is testable by
 * calling functions, and so a card is data rather than a special case. Every
 * state transition returns a new state; the component only dispatches and draws.
 */

import {
  CARDS, ENEMIES, RELICS, STARTER_DECK, REWARD_POOL, RELIC_POOL,
  NORMAL_ENEMIES, ELITE_ENEMIES,
} from './content'

/* ------------------------------------------------------------------ types -- */

export type StatusKey = 'vulnerable' | 'weak' | 'strength' | 'regenBlock'
export type CardType = 'attack' | 'skill' | 'power'
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare'

export type Effect =
  | { kind: 'damage'; amount: number; times?: number }
  | { kind: 'selfDamage'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'draw'; amount: number }
  | { kind: 'energy'; amount: number }
  | { kind: 'applyEnemy'; status: StatusKey; amount: number }
  | { kind: 'applySelf'; status: StatusKey; amount: number }
  | { kind: 'execute'; amount: number }
  | { kind: 'blockScaledDamage'; amount: number }

export interface CardDef {
  id: string
  name: string
  cost: number
  type: CardType
  rarity: Rarity
  text: string
  effects: Effect[]
  exhaust?: boolean
  upgrade?: { text: string; effects: Effect[] }
}

export type Intent =
  | { kind: 'attack'; amount: number; times?: number }
  | { kind: 'block'; amount: number }
  | { kind: 'buff'; status: StatusKey; amount: number }
  | { kind: 'debuff'; status: StatusKey; amount: number }

export interface EnemyDef {
  id: string
  name: string
  hp: number
  tier: 'normal' | 'elite' | 'boss'
  pattern: Intent[]
}

export interface RelicDef { id: string; name: string; text: string }

/** A card instance in a run: which definition, and whether it's upgraded. */
export interface Card { uid: number; id: string; upgraded: boolean }

export interface Statuses {
  vulnerable: number
  weak: number
  strength: number
  regenBlock: number
}

export interface Enemy {
  def: EnemyDef
  hp: number
  maxHp: number
  block: number
  statuses: Statuses
  turn: number
}

export type NodeKind = 'fight' | 'elite' | 'rest' | 'boss'
export interface MapNode { id: number; kind: NodeKind; tier: number; next: number[] }

export interface Run {
  seedState: number
  hp: number
  maxHp: number
  gold: number
  deck: Card[]
  relics: string[]
  map: MapNode[]
  at: number | null
  cleared: number
  floor: number
}

export interface Combat {
  enemy: Enemy
  hand: Card[]
  draw: Card[]
  discard: Card[]
  exhausted: Card[]
  energy: number
  maxEnergy: number
  block: number
  statuses: Statuses
  playedThisTurn: number
  turn: number
  log: string[]
}

export type Phase =
  | { kind: 'menu' }
  | { kind: 'map' }
  | { kind: 'combat' }
  | { kind: 'reward'; cards: string[]; relic?: string }
  | { kind: 'rest' }
  | { kind: 'dead' }
  | { kind: 'won' }

export interface Game {
  run: Run
  combat: Combat | null
  phase: Phase
  score: number
}

/* -------------------------------------------------------------------- rng -- */
// Seeded so a run is reproducible and the map can be generated deterministically.

export function rng(state: number) {
  let s = state >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]

function sample<T>(r: () => number, xs: T[], n: number): T[] {
  const pool = [...xs]
  const out: T[] = []
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(r() * pool.length), 1))
  return out
}

function shuffle<T>(r: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* -------------------------------------------------------------------- map -- */

const TIERS: NodeKind[][] = [
  ['fight', 'fight', 'fight'],
  ['fight', 'rest', 'elite'],
  ['fight', 'elite', 'fight'],
  ['rest', 'fight', 'rest'],
  ['boss'],
]

/** A small branching ladder: pick one node per tier, each linking to the next. */
export function buildMap(r: () => number): MapNode[] {
  const nodes: MapNode[] = []
  let id = 0
  const byTier: number[][] = []

  TIERS.forEach((kinds, tier) => {
    const row: number[] = []
    const order = tier === TIERS.length - 1 ? kinds : shuffle(r, kinds)
    order.forEach((kind) => {
      nodes.push({ id, kind, tier, next: [] })
      row.push(id)
      id++
    })
    byTier.push(row)
  })

  for (let t = 0; t < byTier.length - 1; t++) {
    for (const from of byTier[t]) {
      // each node opens onto two of the next tier, so choices actually branch
      const opts = byTier[t + 1]
      nodes[from].next = opts.length <= 2 ? [...opts] : sample(r, opts, 2).sort((a, b) => a - b)
    }
  }
  return nodes
}

/* ------------------------------------------------------------------- init -- */

let uid = 1
const mk = (id: string, upgraded = false): Card => ({ uid: uid++, id, upgraded })

export function newRun(seed = Date.now()): Game {
  const r = rng(seed)
  return {
    run: {
      seedState: seed,
      hp: 60, maxHp: 60, gold: 0,
      deck: STARTER_DECK.map((id) => mk(id)),
      relics: [],
      map: buildMap(r),
      at: null,
      cleared: 0,
      floor: 0,
    },
    combat: null,
    phase: { kind: 'menu' },
    score: 0,
  }
}

const zeroStatus = (): Statuses => ({ vulnerable: 0, weak: 0, strength: 0, regenBlock: 0 })

export const cardDef = (c: Card): CardDef => CARDS[c.id]
export const cardText = (c: Card) =>
  c.upgraded && CARDS[c.id].upgrade ? CARDS[c.id].upgrade!.text : CARDS[c.id].text
export const cardEffects = (c: Card): Effect[] =>
  c.upgraded && CARDS[c.id].upgrade ? CARDS[c.id].upgrade!.effects : CARDS[c.id].effects

/* ----------------------------------------------------------------- combat -- */

export function startCombat(g: Game, enemyId: string): Game {
  const def = ENEMIES[enemyId]
  const r = rng(g.run.seedState + g.run.cleared * 7919)
  const has = (id: string) => g.run.relics.includes(id)

  const statuses = zeroStatus()
  if (has('emberCore')) statuses.strength += 1

  const combat: Combat = {
    enemy: { def, hp: def.hp, maxHp: def.hp, block: 0, statuses: zeroStatus(), turn: 0 },
    hand: [],
    draw: shuffle(r, g.run.deck),
    discard: [],
    exhausted: [],
    energy: 0,
    maxEnergy: has('deepWell') ? 4 : 3,
    block: has('ironWeave') ? 6 : 0,
    statuses,
    playedThisTurn: 0,
    turn: 0,
    log: [`${def.name} appears.`],
  }
  return beginTurn({ ...g, combat, phase: { kind: 'combat' } })
}

const handSize = (g: Game) => 5 + (g.run.relics.includes('quickHand') ? 1 : 0)

function drawCards(c: Combat, n: number): Combat {
  let { hand, draw, discard } = c
  hand = [...hand]; draw = [...draw]; discard = [...discard]
  for (let i = 0; i < n; i++) {
    if (!draw.length) {
      if (!discard.length) break            // genuinely out of cards
      draw = shuffle(rng(discard.length * 31 + hand.length * 7 + i), discard)
      discard = []
    }
    if (hand.length >= 10) break            // hand cap
    hand.push(draw.shift()!)
  }
  return { ...c, hand, draw, discard }
}

export function beginTurn(g: Game): Game {
  if (!g.combat) return g
  let c = g.combat
  const s = { ...c.statuses }
  // Block doesn't carry over; regenBlock is applied fresh so it's a floor.
  const block = s.regenBlock
  c = { ...c, block, energy: c.maxEnergy, playedThisTurn: 0, turn: c.turn + 1, statuses: s }
  c = drawCards(c, handSize(g))
  return { ...g, combat: c }
}

function scaleDamage(base: number, attackerStr: number, attackerWeak: number, targetVuln: number) {
  let d = base + attackerStr
  if (attackerWeak > 0) d = Math.floor(d * 0.75)
  if (targetVuln > 0) d = Math.floor(d * 1.5)
  return Math.max(0, d)
}

function damageEnemy(c: Combat, raw: number): Combat {
  const e = { ...c.enemy }
  let dmg = raw
  const absorbed = Math.min(e.block, dmg)
  e.block -= absorbed
  dmg -= absorbed
  e.hp = Math.max(0, e.hp - dmg)
  return { ...c, enemy: e }
}

/** Apply one card effect. Returns combat + any HP change to the run. */
function applyEffect(c: Combat, eff: Effect): { c: Combat; hp: number } {
  let hp = 0
  const str = c.statuses.strength
  const weak = c.statuses.weak
  const vuln = c.enemy.statuses.vulnerable

  switch (eff.kind) {
    case 'damage': {
      for (let i = 0; i < (eff.times ?? 1); i++) {
        c = damageEnemy(c, scaleDamage(eff.amount, str, weak, c.enemy.statuses.vulnerable))
      }
      break
    }
    case 'execute': {
      const half = c.enemy.hp <= c.enemy.maxHp / 2
      c = damageEnemy(c, scaleDamage(eff.amount * (half ? 2 : 1), str, weak, vuln))
      break
    }
    case 'blockScaledDamage': {
      c = damageEnemy(c, scaleDamage(c.block * eff.amount, str, weak, vuln))
      break
    }
    case 'block':
      c = { ...c, block: c.block + eff.amount + Math.max(0, str) }
      break
    case 'selfDamage':
      hp -= eff.amount
      break
    case 'heal':
      hp += eff.amount
      break
    case 'draw':
      c = drawCards(c, eff.amount)
      break
    case 'energy':
      c = { ...c, energy: c.energy + eff.amount }
      break
    case 'applyEnemy': {
      const st = { ...c.enemy.statuses }
      st[eff.status] += eff.amount
      c = { ...c, enemy: { ...c.enemy, statuses: st } }
      break
    }
    case 'applySelf': {
      const st = { ...c.statuses }
      st[eff.status] += eff.amount
      c = { ...c, statuses: st }
      break
    }
  }
  return { c, hp }
}

export function costOf(g: Game, card: Card): number {
  const base = CARDS[card.id].cost
  if (g.run.relics.includes('cracked') && g.combat && g.combat.playedThisTurn === 0) return 0
  return base
}

export function playCard(g: Game, uidToPlay: number): Game {
  if (!g.combat || g.phase.kind !== 'combat') return g
  const c0 = g.combat
  const idx = c0.hand.findIndex((x) => x.uid === uidToPlay)
  if (idx < 0) return g
  const card = c0.hand[idx]
  const cost = costOf(g, card)
  if (cost > c0.energy) return g

  let c: Combat = {
    ...c0,
    hand: c0.hand.filter((_, i) => i !== idx),
    energy: c0.energy - cost,
    playedThisTurn: c0.playedThisTurn + 1,
  }
  let hpDelta = 0
  for (const eff of cardEffects(card)) {
    const res = applyEffect(c, eff)
    c = res.c
    hpDelta += res.hp
  }

  const def = CARDS[card.id]
  c = def.exhaust
    ? { ...c, exhausted: [...c.exhausted, card] }
    : { ...c, discard: [...c.discard, card] }
  c = { ...c, log: [`You play ${def.name}.`, ...c.log].slice(0, 40) }

  const run = { ...g.run, hp: Math.max(0, Math.min(g.run.maxHp, g.run.hp + hpDelta)) }
  const next: Game = { ...g, combat: c, run }

  if (c.enemy.hp <= 0) return winCombat(next)
  if (run.hp <= 0) return { ...next, phase: { kind: 'dead' } }
  return next
}

/** Resolve the enemy's telegraphed intent, then start the player's next turn. */
export function endTurn(g: Game): Game {
  if (!g.combat) return g
  let c = g.combat
  const e = c.enemy
  const intent = e.def.pattern[e.turn % e.def.pattern.length]
  let hpDelta = 0
  let block = c.block
  const st = { ...c.statuses }
  const est = { ...e.statuses }
  const ehp = e.hp
  let eblock = e.block

  const lines: string[] = []
  switch (intent.kind) {
    case 'attack': {
      for (let i = 0; i < (intent.times ?? 1); i++) {
        const dmg = scaleDamage(intent.amount, est.strength, est.weak, st.vulnerable)
        const absorbed = Math.min(block, dmg)
        block -= absorbed
        hpDelta -= dmg - absorbed
      }
      lines.push(`${e.def.name} attacks.`)
      break
    }
    case 'block':
      eblock += intent.amount
      lines.push(`${e.def.name} braces.`)
      break
    case 'buff':
      est[intent.status] += intent.amount
      lines.push(`${e.def.name} grows stronger.`)
      break
    case 'debuff':
      st[intent.status] += intent.amount
      lines.push(`${e.def.name} weakens you.`)
      break
  }

  // Statuses tick down at end of round.
  st.vulnerable = Math.max(0, st.vulnerable - 1)
  st.weak = Math.max(0, st.weak - 1)
  est.vulnerable = Math.max(0, est.vulnerable - 1)
  est.weak = Math.max(0, est.weak - 1)

  c = {
    ...c,
    block,
    statuses: st,
    discard: [...c.discard, ...c.hand],
    hand: [],
    enemy: { ...e, hp: ehp, block: eblock, statuses: est, turn: e.turn + 1 },
    log: [...lines, ...c.log].slice(0, 40),
  }

  const run = { ...g.run, hp: Math.max(0, g.run.hp + hpDelta) }
  if (run.hp <= 0) return { ...g, combat: c, run, phase: { kind: 'dead' } }
  return beginTurn({ ...g, combat: c, run })
}

export function nextIntent(e: Enemy): Intent {
  return e.def.pattern[e.turn % e.def.pattern.length]
}

/* ---------------------------------------------------------------- rewards -- */

function winCombat(g: Game): Game {
  const tier = g.combat!.enemy.def.tier
  const r = rng(g.run.seedState + g.run.cleared * 104729 + 13)
  const run = { ...g.run, cleared: g.run.cleared + 1 }
  if (run.relics.includes('bloodPact')) run.hp = Math.min(run.maxHp, run.hp + 4)

  const score = g.score + (tier === 'boss' ? 300 : tier === 'elite' ? 120 : 50) + run.hp
  if (tier === 'boss') return { ...g, run, combat: null, score, phase: { kind: 'won' } }

  const owned = new Set(run.relics)
  const relicOpts = RELIC_POOL.filter((x) => !owned.has(x))
  return {
    ...g,
    run,
    combat: null,
    score,
    phase: {
      kind: 'reward',
      cards: sample(r, REWARD_POOL, 3),
      relic: tier === 'elite' && relicOpts.length ? pick(r, relicOpts) : undefined,
    },
  }
}

export function takeReward(g: Game, cardId: string | null): Game {
  if (g.phase.kind !== 'reward') return g
  const run = { ...g.run, deck: cardId ? [...g.run.deck, mk(cardId)] : g.run.deck }
  if (g.phase.relic) run.relics = [...run.relics, g.phase.relic]
  return { ...g, run, phase: { kind: 'map' } }
}

export function restHeal(g: Game): Game {
  const run = { ...g.run, hp: Math.min(g.run.maxHp, g.run.hp + Math.ceil(g.run.maxHp * 0.3)) }
  return { ...g, run, phase: { kind: 'map' } }
}

export function restUpgrade(g: Game, uidToUpgrade: number): Game {
  const deck = g.run.deck.map((c) =>
    c.uid === uidToUpgrade && CARDS[c.id].upgrade ? { ...c, upgraded: true } : c)
  return { ...g, run: { ...g.run, deck }, phase: { kind: 'map' } }
}

/* ------------------------------------------------------------------- flow -- */

export function enter(g: Game, nodeId: number): Game {
  const node = g.run.map.find((n) => n.id === nodeId)
  if (!node) return g
  const run = { ...g.run, at: nodeId, floor: node.tier + 1 }
  const r = rng(g.run.seedState + nodeId * 7717)
  const next: Game = { ...g, run }

  if (node.kind === 'rest') return { ...next, phase: { kind: 'rest' } }
  const id = node.kind === 'boss' ? 'spire'
    : node.kind === 'elite' ? pick(r, ELITE_ENEMIES)
      : pick(r, NORMAL_ENEMIES)
  return startCombat(next, id)
}

/** Nodes reachable right now: the whole first tier, else whatever `at` links to. */
export function available(g: Game): number[] {
  const { map, at } = g.run
  if (at === null) return map.filter((n) => n.tier === 0).map((n) => n.id)
  const here = map.find((n) => n.id === at)
  return here ? here.next : []
}

export const relicDef = (id: string): RelicDef => RELICS[id]
