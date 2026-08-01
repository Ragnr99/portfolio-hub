import { useMemo, useState } from 'react'
import { RotateCcw, Heart, Zap, Shield, Swords, Sparkles, Flame, ChevronRight } from 'lucide-react'
import { submitScore, getHighScore } from '../utils/highscores'
import {
  newRun, enter, available, playCard, endTurn, takeReward, restHeal, restUpgrade,
  nextIntent, costOf, cardDef, cardText, relicDef,
  type Game, type Card, type Intent, type Statuses, type MapNode,
} from './deckfall/engine'
import { CARDS } from './deckfall/content'

/**
 * Deckfall - a deck-building roguelike for the arcade.
 *
 * The other six cabinets are reflex games; this one is the opposite. Enemy
 * intents are a fixed, visible cycle, so every fight is solvable if you read it
 * and plan two turns ahead. All the rules live in deckfall/engine.ts as pure
 * functions and all the content in deckfall/content.ts as data, so this file
 * only dispatches and draws.
 */

const PIXEL = { fontFamily: '"Press Start 2P", monospace' }
const GLOW = '#f472b6'

const TYPE_COLOR: Record<string, string> = {
  attack: '#f87171', skill: '#60a5fa', power: '#c084fc',
}

const NODE_ICON: Record<string, typeof Swords> = {
  fight: Swords, elite: Flame, rest: Heart, boss: Sparkles,
}

export default function DeckfallGame() {
  const [game, setGame] = useState<Game>(() => newRun())
  const [best, setBest] = useState(() => getHighScore('deckfall'))
  const [inspect, setInspect] = useState<Card | null>(null)

  const open = useMemo(() => available(game), [game])

  const finish = (g: Game) => {
    if ((g.phase.kind === 'dead' || g.phase.kind === 'won') && g.score > 0) {
      submitScore('deckfall', g.score)
      setBest(Math.max(best, g.score))
    }
    setGame(g)
  }

  const restart = () => { setGame(newRun()); setInspect(null) }

  /* ------------------------------------------------------------- screens -- */

  if (game.phase.kind === 'menu') {
    return (
      <Frame best={best}>
        <div className="text-center py-10 space-y-6">
          <h2 style={{ ...PIXEL, color: GLOW, textShadow: `0 0 18px ${GLOW}88` }} className="text-2xl">
            DECKFALL
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            A deck-building roguelike. Every enemy telegraphs its next move on a fixed cycle, so
            there is always a right answer. Climb five tiers, build a deck, kill the Spire Heart.
          </p>
          <button onClick={() => setGame({ ...game, phase: { kind: 'map' } })}
            style={{ ...PIXEL, background: GLOW }}
            className="px-6 py-4 rounded-lg text-[11px] text-gray-900 hover:opacity-85 transition-opacity">
            BEGIN RUN
          </button>
        </div>
      </Frame>
    )
  }

  if (game.phase.kind === 'dead' || game.phase.kind === 'won') {
    const won = game.phase.kind === 'won'
    return (
      <Frame best={best}>
        <div className="text-center py-12 space-y-5">
          <h2 style={{ ...PIXEL, color: won ? '#4ade80' : '#f87171' }} className="text-xl">
            {won ? 'SPIRE HEART SLAIN' : 'YOU DIED'}
          </h2>
          <p style={PIXEL} className="text-gray-300 text-sm">SCORE {game.score}</p>
          <p className="text-gray-500 text-xs">
            {game.run.cleared} fights cleared · deck of {game.run.deck.length}
          </p>
          <button onClick={restart} style={PIXEL}
            className="px-5 py-3 rounded-lg text-[10px] bg-gray-800 text-gray-200 border border-gray-700 hover:border-gray-500">
            <RotateCcw size={12} className="inline mr-2" />RUN AGAIN
          </button>
        </div>
      </Frame>
    )
  }

  if (game.phase.kind === 'reward') {
    const { cards, relic } = game.phase
    return (
      <Frame best={best} run={game}>
        <div className="py-6 space-y-5">
          <h3 style={PIXEL} className="text-[11px] text-gray-300 text-center">VICTORY — TAKE A CARD</h3>
          {relic && (
            <div className="mx-auto max-w-sm rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-center">
              <p style={PIXEL} className="text-[9px] text-amber-300">{relicDef(relic).name}</p>
              <p className="text-xs text-amber-200/80 mt-1">{relicDef(relic).text}</p>
            </div>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
            {cards.map((id) => (
              <CardFace key={id} card={{ uid: -1, id, upgraded: false }}
                onClick={() => setGame(takeReward(game, id))} />
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => setGame(takeReward(game, null))}
              className="text-xs text-gray-500 hover:text-gray-300 underline">skip</button>
          </div>
        </div>
      </Frame>
    )
  }

  if (game.phase.kind === 'rest') {
    const upgradable = game.run.deck.filter((c) => !c.upgraded && CARDS[c.id].upgrade)
    return (
      <Frame best={best} run={game}>
        <div className="py-6 space-y-5">
          <h3 style={PIXEL} className="text-[11px] text-gray-300 text-center">CAMPFIRE</h3>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setGame(restHeal(game))} style={PIXEL}
              className="px-4 py-3 rounded-lg text-[9px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25">
              REST — HEAL 30%
            </button>
          </div>
          {upgradable.length > 0 && (
            <>
              <p style={PIXEL} className="text-[9px] text-gray-500 text-center">OR UPGRADE A CARD</p>
              <div className="flex gap-2 justify-center flex-wrap max-h-72 overflow-y-auto">
                {upgradable.map((c) => (
                  <CardFace key={c.uid} card={c} small onClick={() => setGame(restUpgrade(game, c.uid))} />
                ))}
              </div>
            </>
          )}
        </div>
      </Frame>
    )
  }

  if (game.phase.kind === 'map') {
    return (
      <Frame best={best} run={game}>
        <div className="py-4">
          <h3 style={PIXEL} className="text-[10px] text-gray-400 text-center mb-5">CHOOSE YOUR PATH</h3>
          <MapView map={game.run.map} at={game.run.at} open={open}
            onPick={(id) => setGame(enter(game, id))} />
        </div>
      </Frame>
    )
  }

  /* -------------------------------------------------------------- combat -- */

  const c = game.combat!
  const e = c.enemy
  const intent = nextIntent(e)

  return (
    <Frame best={best} run={game}>
      <div className="space-y-4 py-2">
        {/* Enemy */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p style={PIXEL} className="text-[11px] text-red-300">{e.def.name}</p>
              <StatusRow s={e.statuses} />
            </div>
            <IntentBadge intent={intent} />
          </div>
          <Bar value={e.hp} max={e.maxHp} color="#ef4444" />
          <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
            <span>{e.hp}/{e.maxHp}</span>
            {e.block > 0 && <span className="text-sky-300"><Shield size={10} className="inline" /> {e.block}</span>}
          </div>
        </div>

        {/* Player bar */}
        <div className="flex items-center gap-4 flex-wrap text-[10px]" style={PIXEL}>
          <span className="text-emerald-300"><Heart size={12} className="inline mr-1" />{game.run.hp}/{game.run.maxHp}</span>
          <span className="text-sky-300"><Shield size={12} className="inline mr-1" />{c.block}</span>
          <span className="text-amber-300"><Zap size={12} className="inline mr-1" />{c.energy}/{c.maxEnergy}</span>
          <span className="text-gray-500">draw {c.draw.length} · disc {c.discard.length}</span>
          <StatusRow s={c.statuses} />
        </div>

        {/* Hand */}
        <div className="flex gap-2 flex-wrap justify-center min-h-[150px]">
          {c.hand.map((card) => {
            const cost = costOf(game, card)
            return (
              <CardFace key={card.uid} card={card} cost={cost}
                dimmed={cost > c.energy}
                onClick={() => cost <= c.energy && finish(playCard(game, card.uid))}
                onInspect={() => setInspect(card)} />
            )
          })}
          {c.hand.length === 0 && <p className="text-gray-600 text-xs self-center">hand empty — end your turn</p>}
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={() => finish(endTurn(game))} style={PIXEL}
            className="px-5 py-3 rounded-lg text-[10px] bg-gray-800 text-gray-200 border border-gray-700 hover:border-pink-400 hover:text-white transition-colors">
            END TURN <ChevronRight size={12} className="inline" />
          </button>
        </div>

        <div className="text-[10px] text-gray-600 max-h-16 overflow-hidden leading-relaxed">
          {c.log.slice(0, 3).map((l, i) => <div key={i} style={{ opacity: 1 - i * 0.3 }}>{l}</div>)}
        </div>
      </div>

      {inspect && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setInspect(null)}>
          <div onClick={(ev) => ev.stopPropagation()}><CardFace card={inspect} big /></div>
        </div>
      )}
    </Frame>
  )
}

/* ------------------------------------------------------------------ bits -- */

function Frame({ children, best, run }: { children: React.ReactNode; best: number; run?: Game }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0b1020] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 text-[9px] text-gray-500" style={PIXEL}>
        <span>BEST {best}</span>
        {run && <span>FLOOR {run.run.floor} · SCORE {run.score}</span>}
      </div>
      {run && run.run.relics.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {run.run.relics.map((id) => (
            <span key={id} title={relicDef(id).text}
              className="px-2 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {relicDef(id).name}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 rounded bg-gray-800 overflow-hidden mt-2">
      <div className="h-full rounded transition-all duration-300"
        style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

function StatusRow({ s }: { s: Statuses }) {
  const items = [
    s.strength > 0 && ['STR', s.strength, '#fbbf24'],
    s.vulnerable > 0 && ['VULN', s.vulnerable, '#f87171'],
    s.weak > 0 && ['WEAK', s.weak, '#a78bfa'],
    s.regenBlock > 0 && ['BLK/T', s.regenBlock, '#38bdf8'],
  ].filter(Boolean) as [string, number, string][]
  if (!items.length) return null
  return (
    <span className="flex gap-1.5 flex-wrap mt-1">
      {items.map(([label, n, col]) => (
        <span key={label} className="px-1.5 py-0.5 rounded text-[9px]"
          style={{ background: `${col}22`, color: col }}>{label} {n}</span>
      ))}
    </span>
  )
}

function IntentBadge({ intent }: { intent: Intent }) {
  const map: Record<string, [string, string]> = {
    attack: ['#f87171', 'ATTACK'], block: ['#38bdf8', 'BLOCK'],
    buff: ['#fbbf24', 'BUFF'], debuff: ['#a78bfa', 'DEBUFF'],
  }
  const [col, label] = map[intent.kind]
  const detail = intent.kind === 'attack'
    ? `${intent.amount}${intent.times && intent.times > 1 ? ` x${intent.times}` : ''}`
    : intent.kind === 'block' ? `${intent.amount}`
      : `${intent.status} ${intent.amount}`
  return (
    <span className="px-2.5 py-1.5 rounded-lg text-[9px] border" style={{ ...PIXEL, color: col, borderColor: `${col}55`, background: `${col}18` }}>
      {label} {detail}
    </span>
  )
}

function CardFace({ card, cost, onClick, onInspect, dimmed, small, big }: {
  card: Card; cost?: number; onClick?: () => void; onInspect?: () => void
  dimmed?: boolean; small?: boolean; big?: boolean
}) {
  const def = cardDef(card)
  const col = TYPE_COLOR[def.type]
  const w = big ? 'w-56' : small ? 'w-24' : 'w-32'
  const h = big ? 'min-h-[18rem]' : small ? 'min-h-[7rem]' : 'min-h-[9.5rem]'
  return (
    <button
      onClick={onClick}
      onContextMenu={(ev) => { if (onInspect) { ev.preventDefault(); onInspect() } }}
      disabled={dimmed}
      className={`${w} ${h} shrink-0 rounded-lg border p-2 text-left transition-all ${
        dimmed ? 'opacity-40' : 'hover:-translate-y-1.5 hover:shadow-lg'
      }`}
      style={{ borderColor: `${col}66`, background: `linear-gradient(160deg, ${col}18, #0b1020)` }}
    >
      <div className="flex justify-between items-start gap-1">
        <span style={PIXEL} className={`${big ? 'text-[11px]' : small ? 'text-[7px]' : 'text-[8px]'} leading-tight`}
          >{def.name}{card.upgraded ? '+' : ''}</span>
        {cost !== undefined && (
          <span style={PIXEL} className="text-[9px] shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            {cost}
          </span>
        )}
      </div>
      <p className={`mt-2 ${big ? 'text-sm' : small ? 'text-[9px]' : 'text-[10px]'} text-gray-300 leading-snug`}>
        {cardText(card)}
      </p>
      <p className={`mt-2 ${small ? 'text-[7px]' : 'text-[8px]'} uppercase tracking-wide`} style={{ color: col }}>
        {def.type}
      </p>
    </button>
  )
}

function MapView({ map, at, open, onPick }: {
  map: MapNode[]; at: number | null; open: number[]; onPick: (id: number) => void
}) {
  const tiers = map.reduce<MapNode[][]>((acc, n) => {
    (acc[n.tier] ||= []).push(n)
    return acc
  }, [])
  return (
    <div className="flex flex-col-reverse gap-4">
      {tiers.map((row, t) => (
        <div key={t} className="flex gap-3 justify-center">
          {row.map((n) => {
            const Icon = NODE_ICON[n.kind]
            const isOpen = open.includes(n.id)
            const isHere = at === n.id
            const col = n.kind === 'boss' ? '#f472b6' : n.kind === 'elite' ? '#fb923c'
              : n.kind === 'rest' ? '#4ade80' : '#94a3b8'
            return (
              <button key={n.id} disabled={!isOpen} onClick={() => onPick(n.id)}
                className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  isOpen ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-30 cursor-default'
                } ${isHere ? 'ring-2' : ''}`}
                style={{
                  borderColor: `${col}66`, background: `${col}14`, color: col,
                  boxShadow: isOpen ? `0 0 14px ${col}44` : undefined,
                }}>
                <Icon size={18} />
                <span style={PIXEL} className="text-[6px]">{n.kind.toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
