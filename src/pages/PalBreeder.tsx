import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Egg, Search, ArrowRight, Shuffle, Venus, Mars, Info } from 'lucide-react'
import { usePalworldData, type Pal, type PalworldData } from '../hooks/usePalworldData'
import { ElementBadge, ElementStripe, RarityBadge, DexNumber, PalPortrait } from '../components/PalBits'

type Mode = 'pair' | 'target'

export default function PalBreeder() {
  const { data, loading, error } = usePalworldData()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('target') ? 'target' : 'pair')
  const [parentA, setParentA] = useState<Pal | null>(null)
  const [parentB, setParentB] = useState<Pal | null>(null)
  const [target, setTarget] = useState<Pal | null>(null)

  // Deep link from the Palpedia's "How do I breed X?" button.
  useEffect(() => {
    if (!data) return
    const raw = params.get('target')
    if (raw === null) return
    const pal = data.all[Number(raw)]
    if (pal && !pal.hidden) {
      setTarget(pal)
      setMode('target')
    }
  }, [data, params])

  if (loading) return <Shell mode={mode} setMode={setMode}><p className="text-gray-500 dark:text-gray-400">Loading breeding table…</p></Shell>
  if (error || !data) {
    return <Shell mode={mode} setMode={setMode}><p className="text-red-600 dark:text-red-400">Couldn't load the dataset: {error}</p></Shell>
  }

  const pickTarget = (pal: Pal | null) => {
    setTarget(pal)
    if (pal) setParams({ target: String(pal.i) }, { replace: true })
    else setParams({}, { replace: true })
  }

  return (
    <Shell mode={mode} setMode={setMode}>
      {mode === 'pair'
        ? <PairMode data={data} a={parentA} b={parentB} setA={setParentA} setB={setParentB} />
        : <TargetMode data={data} target={target} setTarget={pickTarget} />}
    </Shell>
  )
}

/* ---------------------------------------------------------------- pair mode */

function PairMode({
  data, a, b, setA, setB,
}: {
  data: PalworldData
  a: Pal | null
  b: Pal | null
  setA: (p: Pal | null) => void
  setB: (p: Pal | null) => void
}) {
  const child = a && b ? data.childOf(a.i, b.i) : null

  // The one pair in the game whose result depends on which parent is female.
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

      <button
        onClick={randomise}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Shuffle size={14} /> Random pair
      </button>

      {a && b && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <MiniPal pal={a} />
            <span className="text-gray-400">+</span>
            <MiniPal pal={b} />
            <ArrowRight size={20} className="text-gray-400" />
            {child
              ? <MiniPal pal={child} big />
              : <span className="text-gray-400 italic">no result</span>}
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
              <div className="mt-2 flex gap-4 text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1"><Venus size={14} /> {data.all[genderPair.a].name} mother → {data.all[genderPair.child].name}</span>
                <span className="flex items-center gap-1"><Mars size={14} /> {data.all[genderPair.a].name} father → the other variant</span>
              </div>
            </div>
          )}
        </div>
      )}

      {(!a || !b) && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Pick two parents to see what they produce.</p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- target mode */

const PAGE = 60

function TargetMode({
  data, target, setTarget,
}: {
  data: PalworldData
  target: Pal | null
  setTarget: (p: Pal | null) => void
}) {
  const [limit, setLimit] = useState(PAGE)

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

  useEffect(() => { setLimit(PAGE) }, [target])

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <PalPicker label="I want to breed…" pals={data.pals} value={target} onChange={setTarget} />
      </div>

      {target && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pairs.length === 0
              ? <>Nothing breeds into <strong>{target.name}</strong>. Unique Pals like this one can only be caught, or bred from two of themselves.</>
              : <><strong className="text-gray-900 dark:text-white">{pairs.length}</strong> parent pairs produce {target.name}, easiest first.</>}
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.slice(0, limit).map(([p, q]) => (
              <div
                key={`${p.i}-${q.i}`}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5"
              >
                <MiniPal pal={p} tiny />
                <span className="text-gray-400 text-sm">+</span>
                <MiniPal pal={q} tiny />
              </div>
            ))}
          </div>

          {limit < pairs.length && (
            <button
              onClick={() => setLimit(l => l + PAGE * 4)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Show more ({pairs.length - limit} left)
            </button>
          )}
        </>
      )}

      {!target && <p className="text-gray-400 dark:text-gray-500 text-sm">Pick the Pal you're chasing.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------- pieces */

function Shell({ mode, setMode, children }: { mode: Mode; setMode: (m: Mode) => void; children: React.ReactNode }) {
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

      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-800">
        {([['pair', 'Two parents'], ['target', 'Find parents']] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {children}
    </div>
  )
}

function MiniPal({ pal, big = false, tiny = false }: { pal: Pal; big?: boolean; tiny?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 ${
      big ? 'min-w-[140px]' : tiny ? 'flex-1 min-w-0' : 'min-w-[120px]'
    }`}>
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
    </div>
  )
}

/** Searchable Pal combobox. 288 options is too many for a plain <select>. */
function PalPicker({
  label, pals, value, onChange,
}: {
  label: string
  pals: Pal[]
  value: Pal | null
  onChange: (p: Pal | null) => void
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
    const list = q ? pals.filter(p => p.name.toLowerCase().includes(q)) : pals
    return list.slice(0, 80)
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
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
          {matches.map(pal => (
            <li key={pal.i}>
              <button
                onClick={() => { onChange(pal); setOpen(false); setQuery('') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
