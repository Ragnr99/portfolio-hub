/**
 * The Pals you actually own, remembered between visits.
 *
 * Every breeding answer on the site is drawn from the full 299-Pal table, which
 * is right when you're planning and wrong when you're standing at a breeding
 * pen. This narrows the question to what's in your box: which partners you can
 * really pair with, and what you could make tonight without catching anything.
 *
 * A module-level store rather than context, so the Breeder's modes, and any
 * page added later, all read the same box without threading a provider through
 * anything. Stored as species indices (`Pal.i`), because breeding cares about
 * species and not about how many of each you have.
 */

import { useSyncExternalStore } from 'react'

const KEY = 'palworld.box'
const EMPTY: ReadonlySet<number> = new Set()

let box: ReadonlySet<number> = EMPTY
let loaded = false
const listeners = new Set<() => void>()

/**
 * Read lazily rather than at import: this module gets pulled into the bundle
 * that the prerender step evaluates, where there is no localStorage.
 */
function current(): ReadonlySet<number> {
  if (!loaded) {
    loaded = true
    box = read()
  }
  return box
}

function read(): ReadonlySet<number> {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return EMPTY
    return new Set(parsed.filter((n): n is number => Number.isInteger(n)))
  } catch {
    return EMPTY  // private mode, disabled storage, or a corrupt value
  }
}

function commit(next: ReadonlySet<number>) {
  loaded = true
  box = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // Storage being unavailable shouldn't break the page; the box just won't
    // survive a reload.
  }
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => { listeners.delete(notify) }
}

/** Stable across renders, so they can be used in deps without wrapping. */
export const palBox = {
  toggle(i: number) {
    const next = new Set(current())
    if (!next.delete(i)) next.add(i)
    commit(next)
  },
  remove(i: number) {
    const next = new Set(current())
    next.delete(i)
    commit(next)
  },
  clear() {
    commit(EMPTY)
  },
  /** Replace the box wholesale. Only for accepting a shared link, and only
   *  ever behind a confirmation - it discards whatever was already saved. */
  replace(ids: Iterable<number>) {
    commit(new Set(ids))
  },
}

/** The current box. Re-renders on any change, from anywhere. */
export function usePalBox(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, current, () => EMPTY)
}
