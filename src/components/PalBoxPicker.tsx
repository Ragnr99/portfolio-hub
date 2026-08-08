/** Multi-select over the whole roster, for building up the Pals you own. */

import { useMemo, useState } from 'react'
import { Search, X, Check, Trash2 } from 'lucide-react'
import type { Pal } from '../hooks/usePalworldData'
import { palBox } from '../hooks/usePalBox'
import { ElementBadge, PalPortrait } from './PalBits'

export default function PalBoxPicker({ pals, box }: {
  pals: Pal[]
  box: ReadonlySet<number>
}) {
  const [query, setQuery] = useState('')

  const owned = useMemo(
    () => pals.filter(p => box.has(p.i)).sort((a, b) => a.dex - b.dex),
    [pals, box],
  )

  // The whole roster stays listed, filtered only by the search. Scrolling a
  // fixed-height list beats paging when you're ticking off a box of 40 Pals.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pals
    return pals.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.elements.some(e => e.toLowerCase().includes(q)))
  }, [pals, query])

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Your box
          <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
            {owned.length} {owned.length === 1 ? 'Pal' : 'Pals'}
          </span>
        </p>
        {owned.length > 0 && (
          <button
            onClick={() => palBox.clear()}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {owned.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {owned.map(pal => (
              <button
                key={pal.i}
                onClick={() => palBox.remove(pal.i)}
                title={`Remove ${pal.name}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 pl-1 pr-2 py-0.5 text-xs text-indigo-800 dark:text-indigo-200 hover:border-red-400 dark:hover:border-red-500"
              >
                <PalPortrait pal={pal} size={18} />
                {pal.name}
                <X size={12} className="opacity-60" />
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or element to add…"
            className="w-full pl-9 pr-9 py-2 text-base sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="grid gap-1 p-1 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map(pal => {
              const has = box.has(pal.i)
              return (
                <button
                  key={pal.i}
                  onClick={() => palBox.toggle(pal.i)}
                  aria-pressed={has}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 min-h-[40px] text-left transition-colors ${
                    has
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span
                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      has
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {has && <Check size={12} strokeWidth={3} />}
                  </span>
                  <PalPortrait pal={pal} size={24} />
                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate flex-1">
                    {pal.name}
                  </span>
                  {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
                </button>
              )
            })}
          </div>
          {matches.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400">No Pals match "{query}".</p>
          )}
        </div>
      </div>
    </div>
  )
}
