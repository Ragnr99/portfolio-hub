import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Search, X, Moon, Egg } from 'lucide-react'
import {
  usePalworldData, ELEMENTS, ELEMENT_COLORS, WEAK_TO, STRONG_AGAINST,
  WORK_LABELS, type Pal,
} from '../hooks/usePalworldData'
import {
  ElementBadge, ElementStripe, StatBar, WorkGrid, RarityBadge, DexNumber, PalPortrait,
} from '../components/PalBits'

// Palworld's stat model doesn't map onto a Pokedex 1:1, so these are the axes
// that actually matter in-game rather than a forced six-stat spread: three
// combat stats, then the base-building numbers (work suitability, food upkeep)
// that decide whether a Pal is worth keeping.
const SORTS = {
  dex: { label: 'Dex number', fn: (a: Pal, b: Pal) => a.dex - b.dex || Number(a.variant) - Number(b.variant) },
  name: { label: 'Name', fn: (a: Pal, b: Pal) => a.name.localeCompare(b.name) },
  hp: { label: 'HP', fn: (a: Pal, b: Pal) => b.hp - a.hp },
  attack: { label: 'Attack', fn: (a: Pal, b: Pal) => b.attack - a.attack },
  defense: { label: 'Defense', fn: (a: Pal, b: Pal) => b.defense - a.defense },
  rarity: { label: 'Rarity', fn: (a: Pal, b: Pal) => b.rarity - a.rarity },
  work: {
    label: 'Total work levels',
    fn: (a: Pal, b: Pal) => sum(b.work) - sum(a.work),
  },
  food: { label: 'Food upkeep', fn: (a: Pal, b: Pal) => b.food - a.food },
} as const

type SortKey = keyof typeof SORTS

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0)

export default function Palpedia() {
  const { data, loading, error } = usePalworldData()
  const [query, setQuery] = useState('')
  const [element, setElement] = useState<string | null>(null)
  const [work, setWork] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('dex')
  const [selected, setSelected] = useState<Pal | null>(null)
  const [params, setParams] = useSearchParams()

  // ?pal=<index> opens straight to a Pal, which is how the Ctrl+K palette jumps
  // here from anywhere on the site.
  useEffect(() => {
    if (!data) return
    const raw = params.get('pal')
    if (raw === null) return
    const pal = data.all[Number(raw)]
    if (pal && !pal.hidden) setSelected(pal)
  }, [data, params])

  const closeDetail = () => {
    setSelected(null)
    if (params.has('pal')) {
      params.delete('pal')
      setParams(params, { replace: true })
    }
  }

  const maxes = useMemo(() => {
    if (!data) return { hp: 1, attack: 1, defense: 1 }
    return {
      hp: Math.max(...data.pals.map(p => p.hp)),
      attack: Math.max(...data.pals.map(p => p.attack)),
      defense: Math.max(...data.pals.map(p => p.defense)),
    }
  }, [data])

  const shown = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const workIdx = work ? data.workKeys.indexOf(work) : -1
    return data.pals
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .filter(p => !element || p.elements.includes(element))
      .filter(p => workIdx < 0 || (p.work[workIdx] ?? 0) > 0)
      .sort(SORTS[sortKey].fn)
  }, [data, query, element, work, sortKey])

  if (loading) return <Shell><p className="text-gray-500 dark:text-gray-400">Loading Pals…</p></Shell>
  if (error || !data) {
    return <Shell><p className="text-red-600 dark:text-red-400">Couldn't load the Pal dataset: {error}</p></Shell>
  }

  return (
    <Shell>
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Pals…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={work ?? ''}
            onChange={e => setWork(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Any work</option>
            {data.workKeys.map(k => <option key={k} value={k}>{WORK_LABELS[k] ?? k}</option>)}
          </select>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>Sort: {s.label}</option>)}
          </select>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <FilterChip active={element === null} onClick={() => setElement(null)}>All</FilterChip>
          {ELEMENTS.map(el => (
            <button
              key={el}
              onClick={() => setElement(element === el ? null : el)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                element === el ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${ELEMENT_COLORS[el]}1f`,
                color: ELEMENT_COLORS[el],
                borderColor: `${ELEMENT_COLORS[el]}66`,
                // @ts-expect-error CSS custom property for the focus ring colour
                '--tw-ring-color': ELEMENT_COLORS[el],
              }}
            >
              {el}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shown.length} of {data.pals.length} Pals
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map(pal => (
          <button
            key={pal.i}
            onClick={() => setSelected(pal)}
            className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
          >
            <ElementStripe elements={pal.elements} />
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <PalPortrait pal={pal} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white leading-tight truncate">
                      {pal.name}
                    </span>
                    <DexNumber pal={pal} />
                  </div>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
                    {pal.nocturnal && <Moon size={12} className="text-indigo-400 mt-0.5" aria-label="Nocturnal" />}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                <span>HP {pal.hp}</span>
                <span>ATK {pal.attack}</span>
                <span>DEF {pal.defense}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">No Pals match those filters.</p>
      )}

      {selected && (
        <PalDetail pal={selected} workKeys={data.workKeys} maxes={maxes} onClose={closeDetail} />
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
          <BookOpen size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Palpedia</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Stats, work suitability, partner skills and drops for every Pal.
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function PalDetail({
  pal, workKeys, maxes, onClose,
}: {
  pal: Pal
  workKeys: string[]
  maxes: { hp: number; attack: number; defense: number }
  onClose: () => void
}) {
  const weaknesses = [...new Set(pal.elements.map(e => WEAK_TO[e]).filter(Boolean))]
  const strengths = [...new Set(pal.elements.flatMap(e => STRONG_AGAINST[e] ?? []))]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <ElementStripe elements={pal.elements} />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <PalPortrait pal={pal} size={88} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{pal.name}</h2>
                  <DexNumber pal={pal} />
                  <RarityBadge rarity={pal.rarity} />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {pal.elements.map(el => <ElementBadge key={el} element={el} />)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatBar label="HP" value={pal.hp} max={maxes.hp} color="#22c55e" />
            <StatBar label="Attack" value={pal.attack} max={maxes.attack} color="#ef4444" />
            <StatBar label="Defense" value={pal.defense} max={maxes.defense} color="#3b82f6" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Fact label="Size" value={pal.size} />
            <Fact label="Food" value={`${pal.food}/tick`} />
            <Fact label="Wild level" value={`${pal.wild[0]}–${pal.wild[1]}`} />
            <Fact label="Nocturnal" value={pal.nocturnal ? 'Yes' : 'No'} />
          </div>

          <Section title="Work suitability">
            <WorkGrid pal={pal} workKeys={workKeys} />
          </Section>

          <Section title="Type matchups">
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-gray-500 dark:text-gray-400 w-20">Weak to</span>
                {weaknesses.length
                  ? weaknesses.map(w => <ElementBadge key={w} element={w} />)
                  : <span className="text-gray-400">Nothing</span>}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-gray-500 dark:text-gray-400 w-20">Strong vs</span>
                {strengths.length
                  ? strengths.map(s => <ElementBadge key={s} element={s} />)
                  : <span className="text-gray-400">Nothing</span>}
              </div>
            </div>
          </Section>

          {pal.partnerSkill && (
            <Section title="Partner skill">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{pal.partnerSkill}</p>
              {pal.partnerDesc && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{pal.partnerDesc}</p>
              )}
            </Section>
          )}

          {pal.drops.length > 0 && (
            <Section title="Drops">
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {pal.drops.map((d, k) => <li key={k}>{d}</li>)}
              </ul>
            </Section>
          )}

          <Link
            to={`/palworld/breeder?target=${pal.i}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 transition-opacity text-sm font-medium"
          >
            <Egg size={16} /> How do I breed {pal.name}?
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}
