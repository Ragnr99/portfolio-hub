import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Swords } from 'lucide-react'
import { calculate, Generations, Pokemon, Move, Field, toID } from '@smogon/calc'

// A comprehensive Gen 9 damage calculator in the style of the Showdown calc.
// All mechanics come from the community-verified @smogon/calc engine; this
// page is the UI: set up both pokemon, the field, and read the numbers.

const gen = Generations.get(9)

const SPECIES: string[] = [...gen.species].map((s) => s.name).sort()
const MOVES: string[] = [...gen.moves].map((m) => m.name).filter((n) => n !== '(No Move)').sort()
const ITEMS: string[] = [...gen.items].map((i) => i.name).sort()
const ABILITIES: string[] = [...gen.abilities].map((a) => a.name).sort()

const NATURES = [
  'Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle',
  'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest',
  'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid',
]
const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'Healthy' }, { value: 'brn', label: 'Burned' },
  { value: 'par', label: 'Paralyzed' }, { value: 'psn', label: 'Poisoned' },
  { value: 'tox', label: 'Badly Poisoned' }, { value: 'slp', label: 'Asleep' },
  { value: 'frz', label: 'Frozen' },
]
const TERA_TYPES = ['', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting',
  'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark',
  'Steel', 'Fairy', 'Stellar']
const WEATHERS = ['', 'Sun', 'Rain', 'Sand', 'Snow', 'Harsh Sunshine', 'Heavy Rain', 'Strong Winds']
const TERRAINS = ['', 'Electric', 'Grassy', 'Misty', 'Psychic']
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
const STAT_LABELS: Record<string, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' }
const BOOST_KEYS = ['atk', 'def', 'spa', 'spd'] as const

// one-click fundamental builds: the spreads 90% of real sets are built from
const PRESETS: { label: string; nature: string; cat: 'physical' | 'special' | 'auto'; evs: Record<string, number> }[] = [
  { label: 'Phys. Sweeper', nature: 'Jolly', cat: 'physical', evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 } },
  { label: 'Spec. Sweeper', nature: 'Timid', cat: 'special', evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 } },
  { label: 'Bulky Phys.', nature: 'Adamant', cat: 'physical', evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 } },
  { label: 'Bulky Spec.', nature: 'Modest', cat: 'special', evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 } },
  { label: 'Phys. Wall', nature: 'Impish', cat: 'auto', evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 } },
  { label: 'Spec. Wall', nature: 'Calm', cat: 'auto', evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 } },
]

interface DexEntry {
  sprite: string
  types: string[]
  stats: { attack: number; spAttack: number }
  moves: { name: string; type: string; category: string; power: number | null }[]
}

// pick 4 moves fitting the preset: right category first, STAB before power
function pickMoves(entry: DexEntry | undefined, cat: 'physical' | 'special' | 'auto'): string[] | null {
  if (!entry || !entry.moves?.length) return null
  const want = cat === 'auto'
    ? (entry.stats.attack >= entry.stats.spAttack ? 'physical' : 'special')
    : cat
  const stab = (m: { type: string }) => (entry.types.includes(m.type) ? 1 : 0)
  const damaging = entry.moves.filter((m) => m.power)
  const ranked = [...damaging].sort((a, b) => stab(b) - stab(a) || (b.power || 0) - (a.power || 0))
  const chosen = [...ranked.filter((m) => m.category === want),
                  ...ranked.filter((m) => m.category !== want)].slice(0, 4)
  if (!chosen.length) return null
  // canonical display names from the calc's own dex ("solar-beam" -> "Solar Beam")
  const names = chosen.map((m) => gen.moves.get(toID(m.name))?.name || m.name)
  while (names.length < 4) names.push('')
  return names
}

interface SideState {
  species: string
  level: number
  nature: string
  item: string
  ability: string
  status: string
  teraType: string
  evs: Record<string, number>
  ivs: Record<string, number>
  boosts: Record<string, number>
  moves: string[]
  crits: boolean[]
  isReflect: boolean
  isLightScreen: boolean
  isAuroraVeil: boolean
  isHelpingHand: boolean
  isFriendGuard: boolean
}

const defaultSide = (species: string, moves: string[]): SideState => ({
  species,
  level: 100,
  nature: 'Serious',
  item: '',
  ability: '',
  status: '',
  teraType: '',
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0 },
  moves,
  crits: [false, false, false, false],
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,
  isHelpingHand: false,
  isFriendGuard: false,
})

interface CalcRow {
  move: string
  pct: string
  detail: string
  error: boolean
}

const normalizeName = (n: string) =>
  n.toLowerCase().replace(/[.'’:%]/g, '').replace(/ /g, '-')

export default function DamageCalc() {
  const [left, setLeft] = useState<SideState>(() =>
    defaultSide('Great Tusk', ['Headlong Rush', 'Ice Spinner', 'Close Combat', 'Knock Off']))
  const [right, setRight] = useState<SideState>(() =>
    defaultSide('Gholdengo', ['Make It Rain', 'Shadow Ball', 'Thunderbolt', 'Focus Blast']))
  const [gameType, setGameType] = useState<'Singles' | 'Doubles'>('Singles')
  const [weather, setWeather] = useState('')
  const [terrain, setTerrain] = useState('')
  const [sprites, setSprites] = useState<Record<string, DexEntry>>({})
  const [focused, setFocused] = useState<{ dir: 'left' | 'right'; i: number } | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pokemon-data.json`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, DexEntry> = {}
        data.forEach((p: any) => {
          map[p.name] = { sprite: p.sprite, types: p.types,
            stats: { attack: p.stats.attack, spAttack: p.stats.spAttack }, moves: p.moves || [] }
        })
        setSprites(map)
      })
      .catch(() => { /* sprites are decoration */ })
  }, [])

  const buildPokemon = (s: SideState) => {
    const specie = gen.species.get(toID(s.species))
    const ability = s.ability || (specie as any)?.abilities?.[0] || undefined
    return new Pokemon(gen, s.species, {
      level: s.level,
      nature: s.nature,
      item: s.item || undefined,
      ability,
      status: (s.status || undefined) as any,
      teraType: (s.teraType || undefined) as any,
      evs: s.evs as any,
      ivs: s.ivs as any,
      boosts: s.boosts as any,
    })
  }

  const buildField = (attacker: SideState, defender: SideState) =>
    new Field({
      gameType,
      weather: (weather || undefined) as any,
      terrain: (terrain || undefined) as any,
      attackerSide: { isHelpingHand: attacker.isHelpingHand, isFriendGuard: attacker.isFriendGuard,
        isReflect: attacker.isReflect, isLightScreen: attacker.isLightScreen, isAuroraVeil: attacker.isAuroraVeil },
      defenderSide: { isHelpingHand: defender.isHelpingHand, isFriendGuard: defender.isFriendGuard,
        isReflect: defender.isReflect, isLightScreen: defender.isLightScreen, isAuroraVeil: defender.isAuroraVeil },
    })

  const calcRows = (attacker: SideState, defender: SideState): CalcRow[] =>
    attacker.moves.map((moveName, i) => {
      if (!moveName.trim()) return { move: '', pct: '', detail: '', error: false }
      try {
        const result = calculate(
          gen,
          buildPokemon(attacker),
          buildPokemon(defender),
          new Move(gen, moveName, { isCrit: attacker.crits[i] }),
          buildField(attacker, defender),
        )
        const desc = result.fullDesc('%', false)
        const after = desc.includes(': ') ? desc.slice(desc.indexOf(': ') + 2) : desc
        const pctMatch = after.match(/\(([\d.]+ - [\d.]+%)\)/)
        return {
          move: moveName,
          pct: pctMatch ? pctMatch[1] : after.split(' -- ')[0],
          detail: desc,
          error: false,
        }
      } catch {
        return { move: moveName, pct: '—', detail: 'Not a valid calc (check the move name).', error: true }
      }
    })

  const leftRows = useMemo(() => calcRows(left, right),
    [left, right, gameType, weather, terrain])   // eslint-disable-line react-hooks/exhaustive-deps
  const rightRows = useMemo(() => calcRows(right, left),
    [left, right, gameType, weather, terrain])   // eslint-disable-line react-hooks/exhaustive-deps

  const focusedRow = focused
    ? (focused.dir === 'left' ? leftRows : rightRows)[focused.i]
    : leftRows.find((r) => r.move && !r.error) || rightRows.find((r) => r.move && !r.error)

  const swap = () => { setLeft(right); setRight(left) }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
            <Swords className="text-indigo-500" size={30} /> Damage Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Gen 9 · every ability, item, and field effect · math by the community-verified Smogon engine
          </p>
        </div>
        <button
          onClick={swap}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors font-medium"
        >
          <ArrowLeftRight size={16} /> Swap sides
        </button>
      </div>

      {/* result banner */}
      <div className="bg-gray-900 dark:bg-black rounded-2xl border border-gray-700 p-5">
        <p className="font-mono text-sm md:text-base text-emerald-300 leading-relaxed break-words">
          {focusedRow?.detail || 'Pick two pokemon and some moves to see the damage.'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PokemonPanel side={left} setSide={setLeft} title="Left side" sprites={sprites}
          rows={leftRows} onFocusRow={(i) => setFocused({ dir: 'left', i })}
          focusedIndex={focused?.dir === 'left' ? focused.i : -1} />
        <PokemonPanel side={right} setSide={setRight} title="Right side" sprites={sprites}
          rows={rightRows} onFocusRow={(i) => setFocused({ dir: 'right', i })}
          focusedIndex={focused?.dir === 'right' ? focused.i : -1} />
      </div>

      {/* field */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Field</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Format</span>
            <select value={gameType} onChange={(e) => setGameType(e.target.value as any)} className={selectCls}>
              <option>Singles</option>
              <option>Doubles</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Weather</span>
            <select value={weather} onChange={(e) => setWeather(e.target.value)} className={selectCls}>
              {WEATHERS.map((w) => <option key={w} value={w}>{w || 'None'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Terrain</span>
            <select value={terrain} onChange={(e) => setTerrain(e.target.value)} className={selectCls}>
              {TERRAINS.map((t) => <option key={t} value={t}>{t || 'None'}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* shared datalists */}
      <datalist id="dl-species">{SPECIES.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-moves">{MOVES.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-items">{ITEMS.map((i) => <option key={i} value={i} />)}</datalist>
      <datalist id="dl-abilities">{ABILITIES.map((a) => <option key={a} value={a} />)}</datalist>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Damage mechanics by <a className="underline hover:text-gray-600 dark:hover:text-gray-300" href="https://github.com/smogon/damage-calc" target="_blank" rel="noopener noreferrer">@smogon/calc</a> (MIT),
        the same engine behind the official Showdown calculator. UI hand-built for this site.
      </p>
    </div>
  )
}

const inputCls = 'mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
const selectCls = inputCls
const numCls = 'mt-1 w-full px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'

function PokemonPanel({ side, setSide, title, sprites, rows, onFocusRow, focusedIndex }: {
  side: SideState
  setSide: (s: SideState) => void
  title: string
  sprites: Record<string, DexEntry>
  rows: CalcRow[]
  onFocusRow: (i: number) => void
  focusedIndex: number
}) {
  const [showIvs, setShowIvs] = useState(false)
  const set = (patch: Partial<SideState>) => setSide({ ...side, ...patch })
  const evTotal = Object.values(side.evs).reduce((a, b) => a + b, 0)
  const dexEntry = sprites[normalizeName(side.species)]
  const sprite = dexEntry?.sprite

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white">{title}</h3>
        {sprite && <img src={sprite} alt="" className="w-14 h-14 image-render-pixel" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pokemon</span>
          <select value={side.species} onChange={(e) => set({ species: e.target.value, ability: '' })} className={selectCls}>
            {!SPECIES.includes(side.species) && <option value={side.species}>{side.species}</option>}
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Level</span>
          <input type="number" min={1} max={100} value={side.level}
            onChange={(e) => set({ level: Math.max(1, Math.min(100, +e.target.value || 100)) })} className={numCls} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tera</span>
          <select value={side.teraType} onChange={(e) => set({ teraType: e.target.value })} className={selectCls}>
            {TERA_TYPES.map((t) => <option key={t} value={t}>{t || 'Not Terastallized'}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Item</span>
          <input list="dl-items" value={side.item} onChange={(e) => set({ item: e.target.value })} className={inputCls} placeholder="None" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ability</span>
          <input list="dl-abilities" value={side.ability} onChange={(e) => set({ ability: e.target.value })} className={inputCls} placeholder="Default" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nature</span>
          <select value={side.nature} onChange={(e) => set({ nature: e.target.value })} className={selectCls}>
            {NATURES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</span>
          <select value={side.status} onChange={(e) => set({ status: e.target.value })} className={selectCls}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {/* preset builds */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              const moves = pickMoves(sprites[normalizeName(side.species)], p.cat)
              set({ nature: p.nature, evs: { ...p.evs }, ...(moves ? { moves } : {}) })
            }}
            title={`${p.nature} · ${Object.entries(p.evs).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${STAT_LABELS[k]}`).join(' / ')}`}
            className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            {p.label}
          </button>
        ))}
        <button onClick={() => set({ level: side.level === 50 ? 100 : 50 })}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
          Lv {side.level === 50 ? 100 : 50}
        </button>
      </div>

      {/* EVs */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">EVs</span>
          <span className={`text-xs ${evTotal > 510 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{evTotal} / 510</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {STAT_KEYS.map((k) => (
            <label key={k} className="block text-center">
              <span className="text-[10px] text-gray-400">{STAT_LABELS[k]}</span>
              <input type="number" min={0} max={252} step={4} value={side.evs[k]}
                onChange={(e) => set({ evs: { ...side.evs, [k]: Math.max(0, Math.min(252, +e.target.value || 0)) } })}
                className={numCls} />
            </label>
          ))}
        </div>
      </div>

      {/* boosts + IVs toggle */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Stat stages</span>
          <button onClick={() => setShowIvs(!showIvs)} className="text-xs text-indigo-500 hover:underline">
            {showIvs ? 'Hide IVs' : 'Edit IVs'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BOOST_KEYS.map((k) => (
            <label key={k} className="block text-center">
              <span className="text-[10px] text-gray-400">{STAT_LABELS[k]}</span>
              <select value={side.boosts[k]}
                onChange={(e) => set({ boosts: { ...side.boosts, [k]: +e.target.value } })}
                className={numCls}>
                {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map((b) => (
                  <option key={b} value={b}>{b > 0 ? `+${b}` : b}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {showIvs && (
          <div className="grid grid-cols-6 gap-2 mt-2">
            {STAT_KEYS.map((k) => (
              <label key={k} className="block text-center">
                <span className="text-[10px] text-gray-400">{STAT_LABELS[k]} IV</span>
                <input type="number" min={0} max={31} value={side.ivs[k]}
                  onChange={(e) => set({ ivs: { ...side.ivs, [k]: Math.max(0, Math.min(31, +e.target.value || 0)) } })}
                  className={numCls} />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* side conditions */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
        {([['isReflect', 'Reflect'], ['isLightScreen', 'Light Screen'], ['isAuroraVeil', 'Aurora Veil'],
           ['isHelpingHand', 'Helping Hand'], ['isFriendGuard', 'Friend Guard']] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={side[key]} onChange={(e) => set({ [key]: e.target.checked } as any)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            {label}
          </label>
        ))}
      </div>

      {/* moves + results */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Moves · this side attacks</span>
        {side.moves.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input list="dl-moves" value={m} placeholder={`Move ${i + 1}`}
              onChange={(e) => {
                const moves = [...side.moves]; moves[i] = e.target.value; set({ moves })
              }}
              className={`${inputCls} mt-0 flex-1`} />
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer" title="Critical hit">
              <input type="checkbox" checked={side.crits[i]}
                onChange={(e) => { const crits = [...side.crits]; crits[i] = e.target.checked; set({ crits }) }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              crit
            </label>
            <button
              onClick={() => onFocusRow(i)}
              disabled={!rows[i]?.move}
              className={`w-36 text-right px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                focusedIndex === i
                  ? 'bg-indigo-600 text-white'
                  : rows[i]?.error
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
              }`}
            >
              {rows[i]?.pct || '—'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
