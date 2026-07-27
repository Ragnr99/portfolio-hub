import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Egg, Search, ArrowRight, Shuffle, Venus, Mars, Info, X } from 'lucide-react'
import { usePalworldData, type Pal, type PalworldData } from '../hooks/usePalworldData'
import { SmartLink } from '../lib/history'
import { ElementBadge, ElementStripe, RarityBadge, DexNumber, PalPortrait } from '../components/PalBits'

/**
 * Three questions you can ask the breeding table:
 *
 *   pair     these two -> what?          checking a specific cross
 *   partner  this one + everything else  what is this Pal good for?
 *   target   what makes this?            chasing something specific
 *
 * All three read the same precomputed 44,850-pair table, so they always agree.
 */
type Mode = 'pair' | 'partner' | 'target'

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  { id: 'pair', label: 'Check a pair', blurb: 'Pick two parents and see the child.' },
  { id: 'partner', label: 'One parent', blurb: 'Pick one parent and see every partner and what each pairing makes.' },
  { id: 'target', label: 'Find parents', blurb: 'Pick what you want and see every pair that produces it.' },
]

export default function PalBreeder() {
  const { data, loading, error } = usePalworldData()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    params.get('parent') ? 'partner' : params.get('target') ? 'target' : 'pair')
  const [parentA, setParentA] = useState<Pal | null>(null)
  const [parentB, setParentB] = useState<Pal | null>(null)
  const [single, setSingle] = useState<Pal | null>(null)
  const [target, setTarget] = useState<Pal | null>(null)

  // Deep links: ?target= from a Pal page, ?parent= from the one-parent view.
  useEffect(() => {
    if (!data) return
    const t = params.get('target')
    if (t !== null) {
      const pal = data.all[Number(t)]
      if (pal && !pal.hidden) { setTarget(pal); setMode('target') }
    }
    const p = params.get('parent')
    if (p !== null) {
      const pal = data.all[Number(p)]
      if (pal && !pal.hidden) { setSingle(pal); setMode('partner') }
    }
  }, [data, params])

  const shell = (children: React.ReactNode) => (
    <Shell mode={mode} setMode={setMode}>{children}</Shell>
  )
  if (loading) return shell(<p className="text-gray-500 dark:text-gray-400">Loading breeding table…</p>)
  if (error || !data) {
    return shell(<p className="text-red-600 dark:text-red-400">Couldn't load the dataset: {error}</p>)
  }

  const pick = (key: 'target' | 'parent', setter: (p: Pal | null) => void) => (pal: Pal | null) => {
    setter(pal)
    setParams(pal ? { [key]: String(pal.i) } : {}, { replace: true })
  }

  return shell(
    mode === 'pair'
      ? <PairMode data={data} a={parentA} b={parentB} setA={setParentA} setB={setParentB} />
      : mode === 'partner'
        ? <PartnerMode data={data} pal={single} setPal={pick('parent', setSingle)} />
        : <TargetMode data={data} target={target} setTarget={pick('target', setTarget)} />,
  )
}

/* ---------------------------------------------------------------- pair mode */

function PairMode({
  data, a, b, setA, setB,
}: {
  data: PalworldData
  a: Pal | null; b: Pal | null
  setA: (p: Pal | null) => void; setB: (p: Pal | null) => void
}) {
  const child = a && b ? data.childOf(a.i, b.i) : null

  const genderPair = useMemo(() => {
    if (!a || !b) return null
    return data.genderPairs.find(g =>
      (g.a === a.i && g.b === b.i) || (g.a === b.i && g.b === a.i)) ?? null
  }, [data, a, b])

  const randomise = () => {
    const pool = data.pals
    setA(pool[Math.floor(Math.random() * pool.length)])
    setB(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <PalPicker label="Parent 1" pals={data.pals} value={a} onChange={setA} />
        <PalPicker label="Parent 2" pals={data.pals} value={b} onChange={setB} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={randomise} className={GHOST_BTN}>
          <Shuffle size={14} /> Random pair
        </button>
        {a && b && (
          <button onClick={() => { setA(b); setB(a) }} className={GHOST_BTN}>Swap</button>
        )}
      </div>

      {a && b ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <MiniPal pal={a} />
            <span className="text-gray-400">+</span>
            <MiniPal pal={b} />
            <ArrowRight size={20} className="text-gray-400" />
            {child ? <MiniPal pal={child} big /> : <span className="text-gray-400 italic">no result</span>}
          </div>

          {a.i === b.i && (
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Two of the same Pal always breed true.
            </p>
          )}

          {genderPair && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
                <Info size={15} /> This pair depends on which parent is female
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                It's the only pair in the game that does. Swap which one is the mother and you get the other result.
              </p>
              <div className="mt-2 flex gap-4 flex-wrap text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1">
                  <Venus size={14} /> {data.all[genderPair.a].name} mother → {data.all[genderPair.child].name}
                </span>
                <span className="flex items-center gap-1">
                  <Mars size={14} /> {data.all[genderPair.a].name} father → the other variant
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Empty>Pick two parents to see what they produce.</Empty>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- partner mode */

function PartnerMode({
  data, pal, setPal,
}: {
  data: PalworldData
  pal: Pal | null
  setPal: (p: Pal | null) => void
}) {
  const [filter, setFilter] = useState('')
  const [groupByChild, setGroupByChild] = useState(true)

  // Every partner and what the cross makes. 288 rows, cheap to build.
  const rows = useMemo(() => {
    if (!pal) return []
    return data.pals
      .map(partner => ({ partner, child: data.childOf(pal.i, partner.i) }))
      .filter((r): r is { partner: Pal; child: Pal } => r.child !== null)
  }, [data, pal])

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const hit = q
      ? rows.filter(r => r.partner.name.toLowerCase().includes(q) || r.child.name.toLowerCase().includes(q))
      : rows
    return [...hit].sort((x, y) =>
      groupByChild
        ? x.child.name.localeCompare(y.child.name) || x.partner.name.localeCompare(y.partner.name)
        : x.partner.dex - y.partner.dex)
  }, [rows, filter, groupByChild])

  const distinctChildren = useMemo(() => new Set(rows.map(r => r.child.i)).size, [rows])

  useEffect(() => { setFilter('') }, [pal])

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <PalPicker label="Breed this Pal with…" pals={data.pals} value={pal} onChange={setPal} />
      </div>

      {!pal && <Empty>Pick one parent to see everything it can make.</Empty>}

      {pal && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">{rows.length}</strong> partners ·{' '}
              <strong className="text-gray-900 dark:text-white">{distinctChildren}</strong> different results
              {filter && <> · showing {shown.length}</>}
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByChild}
                onChange={e => setGroupByChild(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Group by result
            </label>
          </div>

          <FilterBox value={filter} onChange={setFilter} placeholder="Filter by partner or result…" />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(({ partner, child }) => (
              <div
                key={partner.i}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5"
              >
                <MiniPal pal={partner} tiny />
                <ArrowRight size={14} className="shrink-0 text-gray-400" />
                <MiniPal pal={child} tiny />
              </div>
            ))}
          </div>

          {shown.length === 0 && <Empty>Nothing matches "{filter}".</Empty>}
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- target mode */

function TargetMode({
  data, target, setTarget,
}: {
  data: PalworldData
  target: Pal | null
  setTarget: (p: Pal | null) => void
}) {
  const [filter, setFilter] = useState('')

  const pairs = useMemo(() => {
    if (!target) return []
    // Easiest first: cheap, common parents beat legendary ones you'd have to
    // catch first. Same-species pairs float to the very top when they work.
    return data.parentsOf(target.i).sort((p, q) => {
      const self = (x: [Pal, Pal]) => (x[0].i === target.i && x[1].i === target.i ? 0 : 1)
      return self(p) - self(q)
        || (p[0].rarity + p[1].rarity) - (q[0].rarity + q[1].rarity)
        || p[0].name.localeCompare(q[0].name)
    })
  }, [data, target])

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return pairs
    return pairs.filter(([a, b]) =>
      a.name.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
  }, [pairs, filter])

  useEffect(() => { setFilter('') }, [target])

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <PalPicker label="I want to breed…" pals={data.pals} value={target} onChange={setTarget} />
      </div>

      {!target && <Empty>Pick the Pal you're chasing.</Empty>}

      {target && pairs.length === 0 && (
        <Empty>
          Nothing breeds into <strong>{target.name}</strong>. Unique Pals like this one can only be caught, or bred
          from two of themselves.
        </Empty>
      )}

      {target && pairs.length > 0 && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All <strong className="text-gray-900 dark:text-white">{pairs.length}</strong> parent pairs that produce{' '}
            {target.name}, easiest first
            {filter && <> · showing {shown.length}</>}.
          </p>

          {/* Every pair renders, no "show more". A few Pals have over a
              thousand, which is what the filter is for. */}
          <FilterBox value={filter} onChange={setFilter} placeholder="Filter by parent name…" />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(([p, q]) => (
              <div
                key={`${p.i}-${q.i}`}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5"
              >
                <MiniPal pal={p} tiny />
                <span className="shrink-0 text-gray-400 text-sm">+</span>
                <MiniPal pal={q} tiny />
              </div>
            ))}
          </div>

          {shown.length === 0 && <Empty>No parent pair matches "{filter}".</Empty>}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- pieces */

const GHOST_BTN = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 dark:text-gray-500 text-sm">{children}</p>
}

function FilterBox({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-base sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear filter"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

function Shell({ mode, setMode, children }: {
  mode: Mode; setMode: (m: Mode) => void; children: React.ReactNode
}) {
  const current = MODES.find(m => m.id === mode)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300">
          <Egg size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pal Breeder</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Every one of the 44,850 parent combinations, straight from the game's breeding table.
          </p>
        </div>
      </div>

      <div>
        <div className="inline-flex flex-wrap rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-800">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 min-h-[40px] rounded-md text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {current && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{current.blurb}</p>}
      </div>

      {children}
    </div>
  )
}

function MiniPal({ pal, big = false, tiny = false }: { pal: Pal; big?: boolean; tiny?: boolean }) {
  return (
    <SmartLink
      to={`/palworld/pal/${pal.slug}`}
      className={`block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
        big ? 'min-w-[140px]' : tiny ? 'flex-1 min-w-0' : 'min-w-[120px]'
      }`}
    >
      <ElementStripe elements={pal.elements} />
      <div className={`flex items-center gap-2 ${tiny ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <PalPortrait pal={pal} size={tiny ? 28 : big ? 56 : 40} />
        <div className="min-w-0">
          <div className={`font-semibold text-gray-900 dark:text-white truncate ${big ? 'text-lg' : tiny ? 'text-xs' : 'text-sm'}`}>
            {pal.name}
          </div>
          {!tiny && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <DexNumber pal={pal} />
              {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
              {big && <RarityBadge rarity={pal.rarity} />}
            </div>
          )}
        </div>
      </div>
    </SmartLink>
  )
}

/** Searchable Pal combobox. 288 options is too many for a plain <select>. */
function PalPicker({ label, pals, value, onChange }: {
  label: string; pals: Pal[]; value: Pal | null; onChange: (p: Pal | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (q ? pals.filter(p => p.name.toLowerCase().includes(q)) : pals).slice(0, 80)
  }, [pals, query])

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={open ? query : value?.name ?? ''}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder="Search Pals…"
          className="w-full pl-9 pr-3 py-2 text-base sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
          {matches.map(pal => (
            <li key={pal.i}>
              <button
                onClick={() => { onChange(pal); setOpen(false); setQuery('') }}
                className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <PalPortrait pal={pal} size={26} />
                <DexNumber pal={pal} />
                <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">{pal.name}</span>
                {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-400">No Pals match "{query}".</li>
          )}
        </ul>
      )}
    </div>
  )
}
