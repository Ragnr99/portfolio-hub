/**
 * Drops Dex: every Pal's drop table, side by side.
 *
 * Two ways in, because there are two questions. "By Pal" is a dense scroll for
 * comparing tables against each other. "By item" is the reverse lookup - who
 * drops Leather, and which of them gives the most per kill.
 *
 * Both views share one search box and one guaranteed-only filter, so switching
 * between them keeps your place in the question you're asking.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Search, X } from 'lucide-react'
import { usePalworldData, type Pal } from '../hooks/usePalworldData'
import { parseDrops, itemIndex, amountText, expectedYield, type Drop } from '../lib/drops'
import { SmartLink } from '../lib/history'
import { ElementBadge, ElementStripe, DexNumber, PalPortrait } from '../components/PalBits'

type View = 'pal' | 'item'

export default function PalDrops() {
  const { data, loading, error } = usePalworldData()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>(params.get('item') ? 'item' : 'pal')
  const [query, setQuery] = useState(params.get('item') ?? '')
  const [sureOnly, setSureOnly] = useState(false)

  const shell = (children: React.ReactNode) => (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
          <Package size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drops Dex</h1>
          <p className="text-gray-500 dark:text-gray-400">
            What every Pal gives up, with amounts and odds. Butchering included.
          </p>
        </div>
      </header>
      {children}
    </div>
  )

  if (loading) return shell(<p className="text-gray-500 dark:text-gray-400">Loading drop tables…</p>)
  if (error || !data) {
    return shell(<p className="text-red-600 dark:text-red-400">Couldn't load the dataset: {error}</p>)
  }

  const search = (next: string) => {
    setQuery(next)
    setParams(next && view === 'item' ? { item: next } : {}, { replace: true })
  }

  return shell(
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-800">
          {([['pal', 'By Pal'], ['item', 'By item']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-4 min-h-[40px] rounded-md text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={sureOnly}
            onChange={e => setSureOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Guaranteed drops only
        </label>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder={view === 'pal' ? 'Filter by Pal, item or element…' : 'Filter by item…'}
          className="w-full pl-9 pr-9 py-2 text-base sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {query && (
          <button
            onClick={() => search('')}
            aria-label="Clear filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <ButcherNote />

      {view === 'pal'
        ? <ByPal pals={data.pals} query={query} sureOnly={sureOnly} />
        : <ByItem pals={data.pals} query={query} sureOnly={sureOnly} onPickItem={search} />}
    </>,
  )
}

/* --------------------------------------------------------------- by the Pal */

function ByPal({ pals, query, sureOnly }: { pals: Pal[]; query: string; sureOnly: boolean }) {
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pals
      .map(pal => ({
        pal,
        drops: parseDrops(pal).filter(d => !sureOnly || d.chance === 100),
      }))
      .filter(r => r.drops.length > 0)
      .filter(r => !q
        || r.pal.name.toLowerCase().includes(q)
        || r.pal.elements.some(e => e.toLowerCase().includes(q))
        || r.drops.some(d => d.item.toLowerCase().includes(q)))
      .sort((a, b) => a.pal.dex - b.pal.dex)
  }, [pals, query, sureOnly])

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <strong className="text-gray-900 dark:text-white">{rows.length}</strong> Pals
        {sureOnly && <> with a guaranteed drop</>}
      </p>

      <div className="space-y-2">
        {rows.map(({ pal, drops }) => (
          <article
            key={pal.i}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <ElementStripe elements={pal.elements} />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
              <SmartLink
                to={`/palworld/pal/${pal.slug}`}
                className="flex items-center gap-2 sm:w-52 shrink-0 group"
              >
                <PalPortrait pal={pal} size={36} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:underline">
                    {pal.name}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <DexNumber pal={pal} />
                    {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
                  </span>
                </span>
              </SmartLink>
              <div className="flex flex-wrap gap-1.5">
                {drops.map((d, k) => <DropChip key={k} drop={d} />)}
              </div>
            </div>
          </article>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Nothing matches "{query}".</p>
      )}
    </>
  )
}

/* -------------------------------------------------------------- by the item */

function ByItem({ pals, query, sureOnly, onPickItem }: {
  pals: Pal[]; query: string; sureOnly: boolean; onPickItem: (item: string) => void
}) {
  const all = useMemo(() => itemIndex(pals), [pals])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .map(entry => ({
        ...entry,
        sources: entry.sources.filter(s => !sureOnly || s.drop.chance === 100),
      }))
      .filter(e => e.sources.length > 0 && (!q || e.item.toLowerCase().includes(q)))
  }, [all, query, sureOnly])

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <strong className="text-gray-900 dark:text-white">{rows.length}</strong> items, most
        widely dropped first
      </p>

      <div className="space-y-2">
        {rows.map(entry => (
          <article
            key={entry.item}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{entry.item}</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {entry.sources.length} {entry.sources.length === 1 ? 'Pal' : 'Pals'}
              </span>
            </div>
            {/* Best yield first, so the top row is the one worth farming. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.sources.map(({ pal, drop }) => (
                <SmartLink
                  key={pal.i}
                  to={`/palworld/pal/${pal.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 pl-1 pr-2 py-1 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <PalPortrait pal={pal} size={22} />
                  <span className="text-xs text-gray-900 dark:text-white">{pal.name}</span>
                  <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    {amountText(drop)}
                    {drop.chance !== null && drop.chance < 100 && ` · ${drop.chance}%`}
                  </span>
                </SmartLink>
              ))}
            </div>
          </article>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          No item matches "{query}".{' '}
          <button onClick={() => onPickItem('')} className="underline underline-offset-2">
            Clear
          </button>
        </p>
      )}
    </>
  )
}

/* ------------------------------------------------------------------- pieces */

/**
 * What butchering does, limited to what's actually supported.
 *
 * This used to assert that butchering re-rolls this exact table, on the wiki's
 * "lets them obtain their drops once again". That went too far. Nicholas
 * observed Mimog's Dog Coins dropping on defeat but not on butcher, and the
 * wiki then removed that very line from Mimog's drops - two independent hints
 * that the butcher pool is not simply a copy of this one.
 *
 * No source anywhere publishes a separate butcher table, so the honest move is
 * to keep the part that is documented (butchering is another shot at drops, and
 * it's the standard Alpha schematic re-roll) and drop the identity claim. If a
 * datamined butcher table ever surfaces, this is where the split would go.
 */
export function ButcherNote() {
  return (
    <p className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
      <strong className="text-gray-900 dark:text-white">Butchering is another shot at this list.</strong>{' '}
      A Meat Cleaver, or a Pal Disassembly Conveyor, pulls drops from a Pal you've already caught,
      which is how Alphas get re-rolled for schematics. Exact butcher odds aren't published, so
      treat the percentages here as the defeat and capture table.
    </p>
  )
}

/** Guaranteed drops read plainly; anything rarer wears its odds. */
export function DropChip({ drop }: { drop: Drop }) {
  const sure = drop.chance === null || drop.chance === 100
  return (
    <span
      title={drop.chance === null
        ? 'The wiki lists no amount or chance for this one'
        : `${amountText(drop)} per kill at ${drop.chance}%` +
          (expectedYield(drop) ? `, about ${expectedYield(drop).toFixed(2)} on average` : '')}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs border ${
        sure
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-700 dark:text-gray-200'
          : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
      }`}
    >
      <span className="font-mono font-semibold">{amountText(drop)}</span>
      {drop.item}
      {!sure && <span className="font-mono opacity-70">{drop.chance}%</span>}
    </span>
  )
}
