/**
 * Ctrl/Cmd+K palette: jump anywhere without clicking through hub pages.
 *
 * Searches site pages and all 288 Pals in one box, so "anubis" goes straight to
 * that dex entry instead of Home -> Palworld -> Palpedia -> scroll -> click.
 *
 * Only mounted while open, which is what keeps the 266KB Pal dataset from being
 * fetched on pages that never need it. The hook caches at module level, so on a
 * Palworld page the list is already warm.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X } from 'lucide-react'
import { NAV_ITEMS, type NavItem } from '../lib/nav'
import { usePalworldData, ELEMENT_COLORS, palImageSlug, type Pal } from '../hooks/usePalworldData'

type Row =
  | { kind: 'page'; item: NavItem; score: number }
  | { kind: 'pal'; pal: Pal; score: number }

const MAX_PALS = 8

/** Higher is better. Prefix beats word-start beats anything-substring. */
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  if (!needle) return 1
  if (h === needle) return 100
  if (h.startsWith(needle)) return 80
  if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(h)) return 60
  if (h.includes(needle)) return 40
  return 0
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data } = usePalworldData()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()

    const pages: Row[] = NAV_ITEMS
      .map(item => {
        const best = Math.max(
          score(item.label, q),
          ...(item.keywords ?? []).map(k => score(k, q) * 0.7),
          score(item.hint, q) * 0.5,
        )
        return { kind: 'page' as const, item, score: best }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)

    if (!q || !data) return pages

    const pals: Row[] = data.pals
      .map(pal => ({ kind: 'pal' as const, pal, score: score(pal.name, q) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score || a.pal.dex - b.pal.dex)
      .slice(0, MAX_PALS)

    return [...pages, ...pals]
  }, [query, data])

  useEffect(() => { setCursor(0) }, [query])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const go = (row: Row) => {
    onClose()
    if (row.kind === 'page') navigate(row.item.path)
    else navigate(`/palworld/palpedia?pal=${row.pal.i}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && rows[cursor]) { e.preventDefault(); go(rows[cursor]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  const firstPalIndex = rows.findIndex(r => r.kind === 'pal')

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-stretch sm:items-start justify-center sm:pt-[12vh] sm:px-4"
      onMouseDown={onClose}
      role="presentation"
    >
      {/* Full-screen sheet on a phone, centred dialog from sm up. Uses dvh so
          the mobile browser's collapsing address bar doesn't clip the list. */}
      <div
        className="flex flex-col w-full h-[100dvh] sm:h-auto sm:max-w-xl sm:rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden sm:border border-gray-200 dark:border-gray-700"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search pages and Pals"
      >
        <div
          className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700 shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and Pals…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            /* 16px minimum, or iOS Safari zooms the whole page on focus */
            className="flex-1 py-4 bg-transparent text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <ul ref={listRef} className="flex-1 sm:flex-none sm:max-h-[52vh] overflow-y-auto py-2 overscroll-contain">
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              Nothing matches "{query}".
            </li>
          )}

          {rows.map((row, idx) => {
            const active = idx === cursor
            return (
              <li key={row.kind === 'page' ? row.item.path : `pal-${row.pal.i}`}>
                {idx === firstPalIndex && firstPalIndex > 0 && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Pals
                  </div>
                )}
                <button
                  data-active={active}
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => go(row)}
                  className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] sm:min-h-0 sm:py-2.5 text-left transition-colors ${
                    active ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''
                  }`}
                >
                  {row.kind === 'page' ? (
                    <>
                      <row.item.icon size={18} className="shrink-0 text-gray-400" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                          {row.item.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          {row.item.hint}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <img
                        src={`${import.meta.env.BASE_URL}pal-images/${palImageSlug(row.pal.internal)}.webp`}
                        alt=""
                        width={26}
                        height={26}
                        loading="lazy"
                        className="shrink-0 rounded"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                          {row.pal.name}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          #{String(row.pal.dex).padStart(3, '0')} · {row.pal.elements.join(' / ')}
                        </span>
                      </span>
                      <span className="flex gap-1 shrink-0">
                        {row.pal.elements.map(el => (
                          <span key={el} className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ELEMENT_COLORS[el] ?? '#888' }} />
                        ))}
                      </span>
                    </>
                  )}
                  {active && <CornerDownLeft size={14} className="hidden sm:block shrink-0 text-indigo-400" />}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Keyboard hints only make sense where there's a keyboard. */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-400 shrink-0"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <span className="hidden sm:flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> navigate</span>
          <span className="hidden sm:flex items-center gap-1"><CornerDownLeft size={11} /> open</span>
          <span className="sm:ml-auto">{rows.length} result{rows.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}
