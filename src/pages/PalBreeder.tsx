import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Egg, Search, ArrowRight, Shuffle, Venus, Mars, Info, X, ChevronDown, Route, Sparkles, Link2, Check } from 'lucide-react'
import { usePalworldData, type Pal, type PalworldData } from '../hooks/usePalworldData'
import { usePalBox, palBox } from '../hooks/usePalBox'
import { encodeBox, decodeBox } from '../lib/boxCode'
import { planBreedingPath, type PathStep, type StepOption } from '../lib/breedingPath'
import { SmartLink } from '../lib/history'
import PalBoxPicker from '../components/PalBoxPicker'
import { ElementBadge, ElementStripe, RarityBadge, DexNumber, PalPortrait } from '../components/PalBits'

/**
 * Five questions you can ask the breeding table:
 *
 *   pair     these two -> what?          checking a specific cross
 *   partner  this one + everything else  what is this Pal good for?
 *   target   what makes this?            chasing something specific
 *   path     A -> ... -> B               moving passives onto another species
 *   box      everything I own -> what?   what can I make without catching more
 *
 * All five read the same precomputed 44,850-pair table, so they always agree.
 * The last two also read your box (see usePalBox), which narrows the answer
 * from "what is possible" to "what you can do tonight".
 */
type Mode = 'pair' | 'partner' | 'target' | 'path' | 'box'

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
  { id: 'pair', label: 'Check a pair', blurb: 'Pick two parents and see the child.' },
  { id: 'partner', label: 'One parent', blurb: 'Pick one parent and see every partner and what each pairing makes.' },
  { id: 'target', label: 'Find parents', blurb: 'Pick what you want and see every pair that produces it.' },
  { id: 'path', label: 'Shortest path', blurb: 'Fewest breeding steps from a Pal you have to a Pal you want, so its passives carry across.' },
  { id: 'box', label: 'My box', blurb: 'Tick off the Pals you own and see everything they can make between them.' },
]

export default function PalBreeder() {
  const { data, loading, error } = usePalworldData()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    params.get('box') ? 'box'
      : params.get('from') || params.get('to') ? 'path'
        : params.get('parent') ? 'partner'
          : params.get('target') ? 'target' : 'pair')
  /** A box from a ?box= link, held until it's accepted or waved off. */
  const [incoming, setIncoming] = useState<Set<number> | null>(null)
  const [parentA, setParentA] = useState<Pal | null>(null)
  const [parentB, setParentB] = useState<Pal | null>(null)
  const [single, setSingle] = useState<Pal | null>(null)
  const [target, setTarget] = useState<Pal | null>(null)
  const [carrier, setCarrier] = useState<Pal | null>(null)
  const [goal, setGoal] = useState<Pal | null>(null)

  // Deep links: ?target= from a Pal page, ?parent= from the one-parent view,
  // ?from=&to= for a whole passive-transfer route.
  useEffect(() => {
    if (!data) return
    const usable = (raw: string | null) => {
      if (raw === null) return null
      const pal = data.all[Number(raw)]
      return pal && !pal.hidden ? pal : null
    }
    const t = usable(params.get('target'))
    if (t) { setTarget(t); setMode('target') }
    const p = usable(params.get('parent'))
    if (p) { setSingle(p); setMode('partner') }

    const f = usable(params.get('from'))
    const g = usable(params.get('to'))
    if (f || g) {
      if (f) setCarrier(f)
      if (g) setGoal(g)
      setMode('path')
    }

    const code = params.get('box')
    if (code) {
      const shared = decodeBox(code, data.all.length)
      if (shared.size) { setIncoming(shared); setMode('box') }
    }
  }, [data, params])

  /** Accepting replaces the saved box; either way the code leaves the URL so a
   *  refresh doesn't ask again. */
  const resolveIncoming = (keep: boolean) => {
    if (keep && incoming) palBox.replace(incoming)
    setIncoming(null)
    const next = new URLSearchParams(params)
    next.delete('box')
    setParams(next, { replace: true })
  }

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

  // Both ends of a route live in the URL together, so a plan stays shareable.
  const setEnds = (next: { from: Pal | null; to: Pal | null }) => {
    setCarrier(next.from)
    setGoal(next.to)
    setParams(
      Object.fromEntries(
        (['from', 'to'] as const).flatMap(k => (next[k] ? [[k, String(next[k]!.i)]] : [])),
      ),
      { replace: true },
    )
  }
  const pickEnd = (key: 'from' | 'to') => (pal: Pal | null) =>
    setEnds({ from: carrier, to: goal, [key]: pal } as { from: Pal | null; to: Pal | null })

  return shell(
    mode === 'pair'
      ? <PairMode data={data} a={parentA} b={parentB} setA={setParentA} setB={setParentB} />
      : mode === 'partner'
        ? <PartnerMode data={data} pal={single} setPal={pick('parent', setSingle)} />
        : mode === 'target'
          ? <TargetMode data={data} target={target} setTarget={pick('target', setTarget)} />
          : mode === 'path'
            ? <PathMode
                data={data}
                from={carrier} to={goal}
                setFrom={pickEnd('from')} setTo={pickEnd('to')}
                onSwap={() => setEnds({ from: goal, to: carrier })}
              />
            : <BoxMode data={data} incoming={incoming} onIncoming={resolveIncoming} />,
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
  const [boxOnly, setBoxOnly] = useState(false)
  const box = usePalBox()

  // Every partner and what the cross makes. 288 rows, cheap to build.
  // Narrowed to the box when you want to know what you can pair *tonight*
  // rather than what the table allows.
  const rows = useMemo(() => {
    if (!pal) return []
    const pool = boxOnly ? data.pals.filter(p => box.has(p.i)) : data.pals
    return pool
      .map(partner => ({ partner, child: data.childOf(pal.i, partner.i) }))
      .filter((r): r is { partner: Pal; child: Pal } => r.child !== null)
  }, [data, pal, boxOnly, box])

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
              {boxOnly && <> · from your box</>}
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

          <Disclosure summary={boxOnly ? 'Limited to your box' : 'Limit to Pals you own'}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boxOnly}
                  onChange={e => setBoxOnly(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Only partners in my box
              </label>
              {boxOnly && box.size === 0 && (
                <Empty>Your box is empty, so nothing matches. Tick some Pals below.</Empty>
              )}
              <PalBoxPicker pals={data.pals} box={box} />
            </div>
          </Disclosure>

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

/* ----------------------------------------------------------------- box mode */

/**
 * "Here's my box, what can I make?"
 *
 * Same-species pairs are skipped, and that's provably lossless rather than a
 * simplification: every one of the 288 Pals breeds true with itself, all 288
 * checked, so a self-pair can never produce something you don't already have.
 *
 * Cost is one lookup per unordered pair. A 60-Pal box is 1,770 lookups into a
 * flat typed array, which is nothing; the whole roster would still only be the
 * 41,328 the reverse table already scans elsewhere on this page.
 */
function BoxMode({ data, incoming, onIncoming }: {
  data: PalworldData
  /** A box arriving from a ?box= link, pending accept or dismiss. */
  incoming: Set<number> | null
  onIncoming: (keep: boolean) => void
}) {
  const box = usePalBox()
  const [filter, setFilter] = useState('')
  const [newOnly, setNewOnly] = useState(false)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}/palworld/breeder?box=${encodeBox(box)}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy your box link', url)  // clipboard blocked, e.g. plain http
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const owned = useMemo(
    () => data.pals.filter(p => box.has(p.i)).sort((a, b) => a.dex - b.dex),
    [data, box],
  )

  const { results, pairCount } = useMemo(() => {
    const byChild = new Map<number, Array<[Pal, Pal]>>()
    let pairs = 0
    for (let i = 0; i < owned.length; i++) {
      for (let j = i + 1; j < owned.length; j++) {
        pairs++
        const child = data.childOf(owned[i].i, owned[j].i)
        if (!child) continue
        const list = byChild.get(child.i)
        if (list) list.push([owned[i], owned[j]])
        else byChild.set(child.i, [[owned[i], owned[j]]])
      }
    }
    // Things you can't already get first, since those are the reason to look.
    const out = [...byChild].map(([i, from]) => ({ child: data.all[i], from }))
    out.sort((a, b) =>
      Number(box.has(a.child.i)) - Number(box.has(b.child.i))
      || b.from.length - a.from.length
      || a.child.name.localeCompare(b.child.name))
    return { results: out, pairCount: pairs }
  }, [data, owned, box])

  const fresh = useMemo(
    () => results.filter(r => !box.has(r.child.i)).length,
    [results, box],
  )

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return results.filter(r =>
      (!newOnly || !box.has(r.child.i)) &&
      (!q || r.child.name.toLowerCase().includes(q) ||
        r.from.some(([a, b]) => a.name.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))))
  }, [results, filter, newOnly, box])

  return (
    <div className="space-y-5">
      {/* A shared box replaces yours, so it never lands without being asked. */}
      {incoming && (
        <Note tone="warn" title={`This link carries a box of ${incoming.size} ${incoming.size === 1 ? 'Pal' : 'Pals'}`}>
          Loading it replaces the {box.size} {box.size === 1 ? 'Pal' : 'Pals'} currently saved in
          this browser.{' '}
          <button
            onClick={() => onIncoming(true)}
            className="underline underline-offset-2 font-semibold hover:no-underline"
          >
            Load it
          </button>
          {' · '}
          <button
            onClick={() => onIncoming(false)}
            className="underline underline-offset-2 hover:no-underline"
          >
            Keep mine
          </button>
        </Note>
      )}

      <PalBoxPicker pals={data.pals} box={box} />

      {box.size > 0 && (
        <button onClick={share} className={GHOST_BTN}>
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? 'Link copied' : 'Copy a link to this box'}
        </button>
      )}

      {owned.length < 2 ? (
        <Empty>
          Tick at least two Pals and everything they can make between them shows up here.
        </Empty>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">{owned.length}</strong> Pals ·{' '}
              <strong className="text-gray-900 dark:text-white">{pairCount}</strong>{' '}
              {pairCount === 1 ? 'pairing' : 'pairings'} ·{' '}
              <strong className="text-gray-900 dark:text-white">{results.length}</strong> different
              results, <strong className="text-emerald-600 dark:text-emerald-400">{fresh}</strong> of
              them not already in your box.
            </p>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Pairing a Pal with another of its own species always breeds true, so those are left
              out. Every one of the 288 was checked, nothing is lost by skipping them.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <FilterBox value={filter} onChange={setFilter} placeholder="Filter by result or parent…" />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newOnly}
                onChange={e => setNewOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Only what I don't have
            </label>
          </div>

          <div className="space-y-2">
            {shown.map(({ child, from }) => (
              <article
                key={child.i}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
              >
                <ElementStripe elements={child.elements} />
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MiniPal pal={child} />
                    {!box.has(child.i) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Sparkles size={11} /> new to you
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {from.length} {from.length === 1 ? 'way' : 'ways'}
                    </span>
                  </div>
                  <Disclosure summary={`Show the ${from.length === 1 ? 'pairing' : 'pairings'}`}>
                    {/* The result repeats on every row even though the card is
                        already grouped by it: a row you're reading mid-list
                        should say what it makes without a look back up. */}
                    <div className="grid gap-2 xl:grid-cols-2">
                      {from.map(([a, b]) => (
                        <div
                          key={`${a.i}-${b.i}`}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-2"
                        >
                          <MiniPal pal={a} tiny />
                          <span className="shrink-0 text-gray-400 text-sm">+</span>
                          <MiniPal pal={b} tiny />
                          <ArrowRight size={14} className="shrink-0 text-gray-400" />
                          <MiniPal pal={child} tiny />
                        </div>
                      ))}
                    </div>
                  </Disclosure>
                </div>
              </article>
            ))}
          </div>

          {shown.length === 0 && (
            <Empty>
              {results.length === 0
                ? 'None of these Pals breed with each other.'
                : `Nothing matches${filter ? ` "${filter}"` : ''}.`}
            </Empty>
          )}
        </>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- path mode */

/**
 * "I have a perfect Lamball, I want those passives on a Jormuntide Ignis."
 *
 * The chain itself comes from planBreedingPath; everything here is about
 * picking your way through it. Each step offers every equally-short branch and
 * every partner that takes that branch, because the cheapest route on paper is
 * the wrong one if you already own the parents for another.
 */
/**
 * A chain this long reads as a bug, so past this many steps the page explains
 * where the length actually comes from instead of just printing a number.
 */
const LONG_CHAIN = 4

function PathMode({
  data, from, to, setFrom, setTo, onSwap,
}: {
  data: PalworldData
  from: Pal | null; to: Pal | null
  setFrom: (p: Pal | null) => void; setTo: (p: Pal | null) => void
  onSwap: () => void
}) {
  /** Species to breed into at step k, when the default route isn't wanted. */
  const [routePicks, setRoutePicks] = useState<number[]>([])
  /** Partner to use at step k. Defaults to the easiest one to obtain. */
  const [partnerPicks, setPartnerPicks] = useState<number[]>([])

  useEffect(() => { setRoutePicks([]); setPartnerPicks([]) }, [from, to])

  const plan = useMemo(
    () => (from && to ? planBreedingPath(data, from, to, routePicks) : null),
    [data, from, to, routePicks],
  )

  /**
   * Where a long chain's length comes from, worked out only when there is one
   * to explain. It's never a long climb - it's a narrow funnel: the low end of
   * the roster has very few ways in, so a handful of species bottleneck every
   * route. The trip back is usually far shorter, and usually what you wanted.
   */
  const why = useMemo(() => {
    if (!from || !to || plan?.kind !== 'ok' || plan.steps.length < LONG_CHAIN) return null
    const pairs = data.parentsOf(to.i)
    const back = planBreedingPath(data, to, from)
    return {
      pairs: pairs.length,
      needsItself: pairs.length > 0 && pairs.every(([a, b]) => a.i === to.i || b.i === to.i),
      reverse: back.kind === 'ok' && back.steps.length < plan.steps.length
        ? back.steps.length
        : null,
    }
  }, [data, from, to, plan])

  // Changing a step invalidates every later choice, so drop them.
  const chooseRoute = (step: number, child: number) => {
    setRoutePicks(prev => { const next = prev.slice(0, step); next[step] = child; return next })
    setPartnerPicks(prev => prev.slice(0, step))
  }
  const choosePartner = (step: number, partner: number) => {
    setPartnerPicks(prev => { const next = prev.slice(); next[step] = partner; return next })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <PalPicker label="I have the passives on…" pals={data.pals} value={from} onChange={setFrom} />
        <PalPicker label="I want them on…" pals={data.pals} value={to} onChange={setTo} />
      </div>

      {(from || to) && (
        <button onClick={onSwap} className={GHOST_BTN}>
          <Shuffle size={14} /> Swap direction
        </button>
      )}

      {(!from || !to) && (
        <Empty>Pick the Pal carrying the passives and the Pal you want them on.</Empty>
      )}

      {plan?.kind === 'same' && from && (
        <Note tone="info" title={`${from.name} is already what you want`}>
          Breed it with another {from.name} and the child keeps the passives. Two of the same species
          always breed true, so nothing else in the chain can go wrong.
        </Note>
      )}

      {plan?.kind === 'unreachable' && to && (
        <Note tone="warn" title={`Passives can't be bred into ${to.name}`}>
          {plan.reason === 'self-only' ? (
            <>
              {to.name} only comes from two {to.name}, so no other lineage ever reaches it. Nothing
              you breed from {from?.name} can turn into one. You'll have to catch them and breed
              those together, which limits you to the passives the wild ones happen to roll.
            </>
          ) : plan.reason === 'no-parents' ? (
            <>Nothing in the breeding table produces {to.name} at all. It's catch-only.</>
          ) : (
            <>No lineage runs from {from?.name} to {to.name}.</>
          )}
        </Note>
      )}

      {plan?.kind === 'ok' && from && to && (
        <>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">
                {plan.steps.length} {plan.steps.length === 1 ? 'step' : 'steps'}
              </strong>{' '}
              from {from.name} to {to.name}. That's the shortest any route gets.
            </p>
            <ChainStrip from={from} steps={plan.steps} />
          </div>

          {why && (
            <Note tone="info" title={`Why ${plan.steps.length} steps and not fewer`}>
              Only <strong>{why.pairs}</strong> parent {why.pairs === 1 ? 'pair' : 'pairs'} in the
              whole table {why.pairs === 1 ? 'produces' : 'produce'} {to.name}
              {why.needsItself && <>, and every one of them already needs a {to.name}</>}. That
              bottleneck is the whole reason for the length: it isn't a long climb, it's a narrow
              funnel that every route has to squeeze through. This is the shortest chain that
              exists, not just the shortest one found.
              {why.reverse !== null && (
                <>
                  {' '}Going the other way is far cheaper. {to.name} onto {from.name} takes{' '}
                  <strong>{why.reverse} {why.reverse === 1 ? 'step' : 'steps'}</strong>.{' '}
                  <button
                    onClick={onSwap}
                    className="underline underline-offset-2 font-medium hover:no-underline"
                  >
                    Swap direction
                  </button>
                </>
              )}
            </Note>
          )}

          {plan.steps.map((step, i) => (
            <StepCard
              key={`${i}-${step.from.i}`}
              data={data}
              index={i}
              total={plan.steps.length}
              step={step}
              partnerPick={partnerPicks[i]}
              onRoute={child => chooseRoute(i, child)}
              onPartner={partner => choosePartner(i, partner)}
            />
          ))}

          <Note tone="info" title="How the passives actually carry">
            The child draws its passives from the pool both parents bring, so the carrier has to be
            one of the two parents at every step. It's a roll each time, not a guarantee: hatch until
            you get a child holding the ones you want, then use that child for the next step. Give
            the partner clean or matching passives where you can, and remember each pair still needs
            one male and one female.
          </Note>
        </>
      )}
    </div>
  )
}

/** from → mid → mid → target, at a glance. */
function ChainStrip({ from, steps }: { from: Pal; steps: PathStep[] }) {
  const chain = [from, ...steps.map(s => s.chosen.child)]
  return (
    <ol className="flex items-center gap-1.5 flex-wrap">
      {chain.map((pal, i) => (
        <li key={`${i}-${pal.i}`} className="flex items-center gap-1.5">
          {i > 0 && <ArrowRight size={14} className="text-gray-400 shrink-0" />}
          <SmartLink
            to={`/palworld/pal/${pal.slug}`}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors ${
              i === chain.length - 1
                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <PalPortrait pal={pal} size={22} />
            <span className="text-xs font-medium text-gray-900 dark:text-white">{pal.name}</span>
          </SmartLink>
        </li>
      ))}
    </ol>
  )
}

function StepCard({
  data, index, total, step, partnerPick, onRoute, onPartner,
}: {
  data: PalworldData
  index: number
  total: number
  step: PathStep
  partnerPick: number | undefined
  onRoute: (child: number) => void
  onPartner: (partner: number) => void
}) {
  const { partners } = step.chosen
  const partner = partners.find(p => p.i === partnerPick) ?? partners[0]
  const others = step.options.filter(o => o.child.i !== step.chosen.child.i)

  // The single pair in the game where it matters which parent is the mother.
  const genderPair = data.genderPairs.find(g =>
    (g.a === step.from.i && g.b === partner.i) || (g.a === partner.i && g.b === step.from.i))

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <header className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          Step {index + 1} of {total}
        </span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Breed the {step.from.name} with a {partner.name}
          {index === total - 1 && <> — that's your {step.chosen.child.name}</>}
        </p>
      </header>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MiniPal pal={step.from} />
          <span className="text-gray-400">+</span>
          <MiniPal pal={partner} />
          <ArrowRight size={18} className="text-gray-400 shrink-0" />
          <MiniPal pal={step.chosen.child} />
        </div>

        {genderPair && (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <Info size={15} className="mt-0.5 shrink-0" />
            This is the one pair whose result depends on which parent is female:{' '}
            {data.all[genderPair.a].name} has to be the mother for {data.all[genderPair.child].name}.
          </p>
        )}

        {partners.length > 1 && (
          <Disclosure summary={`${partners.length} partners give the same result — pick one you own`}>
            <PalChoices
              pals={partners}
              selected={partner.i}
              onPick={onPartner}
              caption={p => <RarityBadge rarity={p.rarity} />}
            />
          </Disclosure>
        )}

        {others.length > 0 && (
          <Disclosure summary={`${others.length} other ${others.length === 1 ? 'route is' : 'routes are'} just as short`}>
            <PalChoices
              pals={others.map(o => o.child)}
              selected={step.chosen.child.i}
              onPick={onRoute}
              caption={(_, i) => <PartnerHint option={others[i]} />}
            />
          </Disclosure>
        )}
      </div>
    </article>
  )
}

function PartnerHint({ option }: { option: StepOption }) {
  const [first] = option.partners
  return (
    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
      via {first.name}
      {option.partners.length > 1 && ` +${option.partners.length - 1}`}
    </span>
  )
}

/** Wrapped grid of selectable Pals, used for both partner and route choices. */
function PalChoices({ pals, selected, onPick, caption }: {
  pals: Pal[]
  selected: number
  onPick: (i: number) => void
  caption: (pal: Pal, index: number) => React.ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {pals.map((pal, i) => (
        <button
          key={pal.i}
          onClick={() => onPick(pal.i)}
          aria-pressed={pal.i === selected}
          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 min-h-[44px] text-left transition-colors ${
            pal.i === selected
              ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <PalPortrait pal={pal} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-gray-900 dark:text-white truncate">
              {pal.name}
            </span>
            {caption(pal, i)}
          </span>
        </button>
      ))}
    </div>
  )
}

function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-1.5 cursor-pointer list-none text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 min-h-[36px]">
        <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

function Note({ tone, title, children }: {
  tone: 'info' | 'warn'; title: string; children: React.ReactNode
}) {
  const skin = tone === 'warn'
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
  return (
    <div className={`rounded-xl border p-4 text-sm ${skin}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        {tone === 'warn' ? <Info size={15} /> : <Route size={15} />}
        {title}
      </p>
      <p className="mt-1.5 leading-relaxed">{children}</p>
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
