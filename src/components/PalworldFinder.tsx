/**
 * One box that answers "where is this thing".
 *
 * The hub used to ask which tool you wanted, which is backwards: you arrive
 * knowing a Pal, an item or a passive, and the tool is an implementation detail
 * you shouldn't have to reason about. Nobody should need to know whether
 * Chikipi's Poultry lives in the Palpedia or the Drops Dex.
 *
 * So this indexes everything the suite knows - 288 Pals, every droppable item,
 * every passive, and the tools themselves - and answers with *actions*. Typing
 * "Leather" doesn't offer you a page, it offers "77 Pals drop this" and takes
 * you to the list. Typing a Pal offers its page, what breeds into it, and what
 * it breeds with.
 *
 * No new network cost: the hub already holds the dataset and the passive list,
 * and the item index is derived from drops that are already in memory.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, CornerDownLeft } from 'lucide-react'
import { type Pal, type PalworldData, ELEMENT_COLORS } from '../hooks/usePalworldData'
import type { PassiveData, Passive } from '../hooks/usePalworldPassives'
import { itemIndex, type ItemEntry } from '../lib/drops'
import { PROJECTS } from '../lib/projects'
import { PalPortrait, ElementBadge } from './PalBits'

const TOOLS = PROJECTS.find(p => p.id === 'palworld-tools')?.tools ?? []

/** Things worth typing, shown before you've typed. Teaches what's searchable. */
const EXAMPLES = ['Anubis', 'Leather', 'Legend', 'Ancient Civilization Parts', 'breeding']

type Hit =
  | { kind: 'pal'; score: number; pal: Pal }
  | { kind: 'item'; score: number; entry: ItemEntry }
  | { kind: 'passive'; score: number; passive: Passive }
  | { kind: 'tool'; score: number; tool: (typeof TOOLS)[number] }

/** Exact beats prefix beats substring. 0 means no match at all. */
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  if (h === needle) return 3
  if (h.startsWith(needle)) return 2
  return h.includes(needle) ? 1 : 0
}

export default function PalworldFinder({ data, passives }: {
  data: PalworldData
  passives: PassiveData | null
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const items = useMemo(() => itemIndex(data.pals), [data])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as Hit[]

    const out: Hit[] = []
    for (const pal of data.pals) {
      const s = Math.max(score(pal.name, q), ...pal.elements.map(e => score(e, q) && 1))
      if (s) out.push({ kind: 'pal', score: s, pal })
    }
    for (const entry of items) {
      const s = score(entry.item, q)
      if (s) out.push({ kind: 'item', score: s, entry })
    }
    for (const passive of passives?.skills ?? []) {
      const s = Math.max(score(passive.name, q), passive.lines.some(l => l.toLowerCase().includes(q)) ? 1 : 0)
      if (s) out.push({ kind: 'passive', score: s, passive })
    }
    for (const tool of TOOLS) {
      const s = Math.max(
        score(tool.label, q),
        tool.hint.toLowerCase().includes(q) ? 1 : 0,
        (tool.keywords ?? []).some(k => k.toLowerCase().includes(q)) ? 1 : 0,
      )
      if (s) out.push({ kind: 'tool', score: s, tool })
    }
    return out.sort((a, b) => b.score - a.score)
  }, [query, data, items, passives])

  const groups = useMemo(() => ({
    pal: hits.filter(h => h.kind === 'pal').slice(0, 6),
    item: hits.filter(h => h.kind === 'item').slice(0, 5),
    passive: hits.filter(h => h.kind === 'passive').slice(0, 4),
    tool: hits.filter(h => h.kind === 'tool').slice(0, 3),
  }), [hits])

  const first = groups.tool[0] ?? groups.pal[0] ?? groups.item[0] ?? groups.passive[0]

  const hrefFor = (hit: Hit): string => {
    switch (hit.kind) {
      case 'pal': return `/palworld/pal/${hit.pal.slug}`
      case 'item': return `/palworld/drops?item=${encodeURIComponent(hit.entry.item)}`
      case 'passive': return `/palworld/passives?build=${encodeURIComponent(hit.passive.internal)}`
      case 'tool': return hit.tool.path
    }
  }

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && first) { e.preventDefault(); navigate(hrefFor(first)) }
            if (e.key === 'Escape') setQuery('')
          }}
          placeholder="Search a Pal, an item, a passive…"
          aria-label="Search everything Palworld"
          className="w-full pl-11 pr-10 py-3.5 text-base rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!query && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Try</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {ex}
            </button>
          ))}
          <span className="ml-auto hidden sm:flex items-center gap-1">
            or press
            <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
            anywhere
          </span>
        </div>
      )}

      {query && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
          {hits.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
              Nothing matches "{query}". Pals, drop items, passives and the tools themselves are
              all searchable.
            </p>
          )}

          <Group label="Pals" rows={groups.pal}>
            {hit => hit.kind === 'pal' && (
              <PalRow key={hit.pal.i} pal={hit.pal} />
            )}
          </Group>

          <Group label="Items" rows={groups.item}>
            {hit => hit.kind === 'item' && (
              <Row
                key={hit.entry.item}
                to={hrefFor(hit)}
                title={hit.entry.item}
                sub={`${hit.entry.sources.length} ${hit.entry.sources.length === 1 ? 'Pal drops' : 'Pals drop'} this`}
                art={
                  <span className="flex -space-x-2">
                    {hit.entry.sources.slice(0, 3).map(s => (
                      <PalPortrait key={s.pal.i} pal={s.pal} size={22} />
                    ))}
                  </span>
                }
              />
            )}
          </Group>

          <Group label="Passives" rows={groups.passive}>
            {hit => hit.kind === 'passive' && (
              <Row
                key={hit.passive.internal}
                to={hrefFor(hit)}
                title={hit.passive.name}
                sub={hit.passive.lines[0] ?? 'Open in the stacker'}
              />
            )}
          </Group>

          <Group label="Tools" rows={groups.tool}>
            {hit => hit.kind === 'tool' && (
              <Row key={hit.tool.path} to={hit.tool.path} title={hit.tool.label} sub={hit.tool.hint} />
            )}
          </Group>
        </div>
      )}
    </section>
  )
}

function Group({ label, rows, children }: {
  label: string
  rows: Hit[]
  children: (hit: Hit) => React.ReactNode
}) {
  if (!rows.length) return null
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {rows.map(children)}
    </div>
  )
}

function Row({ to, title, sub, art }: {
  to: string; title: string; sub: string; art?: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group"
    >
      {art}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</span>
      </span>
      <CornerDownLeft
        size={14}
        className="shrink-0 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  )
}

/** A Pal gets its page plus the two breeding questions, because "where is it"
 *  is almost always followed by one of them. */
function PalRow({ pal }: { pal: Pal }) {
  const navigate = useNavigate()
  const actions = [
    { label: 'What makes it', to: `/palworld/breeder?target=${pal.i}` },
    { label: 'Pair it up', to: `/palworld/breeder?parent=${pal.i}` },
  ]
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <button
        onClick={() => navigate(`/palworld/pal/${pal.slug}`)}
        className="flex items-center gap-3 min-w-0 flex-1 text-left group"
      >
        <PalPortrait pal={pal} size={30} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:underline">
              {pal.name}
            </span>
            {pal.elements.map(el => <ElementBadge key={el} element={el} compact />)}
          </span>
          <span
            className="block text-xs truncate"
            style={{ color: ELEMENT_COLORS[pal.elements[0]] ?? undefined }}
          >
            #{String(pal.dex).padStart(3, '0')}
          </span>
        </span>
      </button>
      <span className="hidden sm:flex shrink-0 gap-1">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className="rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
          >
            {a.label}
          </button>
        ))}
      </span>
    </div>
  )
}
