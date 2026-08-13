/**
 * Palworld hub.
 *
 * The other project pages are icon-in-a-tinted-square grids, which is fine for
 * a catalogue and says nothing about what's behind the link. This one is built
 * out of the material the tools are made of: the nine element colours, which
 * the desktop overlay uses too so the set reads as one thing, and real Pal art
 * and real rows pulled from the live dataset.
 *
 * Every number and every preview on this page comes from the data rather than
 * from copy, so it can't quietly drift out of date when the roster changes.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Monitor, Github, ArrowRight, ArrowUpRight } from 'lucide-react'
import {
  usePalworldData, ELEMENT_COLORS, ELEMENTS, type Pal, type PalworldData,
} from '../hooks/usePalworldData'
import { usePalworldPassives } from '../hooks/usePalworldPassives'
import { usePalworldQuests, type QuestData } from '../hooks/usePalworldQuests'
import { itemIndex } from '../lib/drops'
import { PROJECTS } from '../lib/projects'
import { PalPortrait } from '../components/PalBits'
import PalworldFinder from '../components/PalworldFinder'

const TOOLS = PROJECTS.find(p => p.id === 'palworld-tools')?.tools ?? []

/** One element hue per tool, spread across the palette so no two adjacent
 *  cards share a family. Keyed by path so reordering the registry is safe. */
const TOOL_ELEMENT: Record<string, string> = {
  '/palworld/palpedia': 'Water',
  '/palworld/breeder': 'Dark',
  '/palworld/passives': 'Electric',
  '/palworld/drops': 'Fire',
  '/palworld/quests': 'Dragon',
  '/palworld/map': 'Grass',
}

export default function Palworld() {
  const { data, loading } = usePalworldData()
  const { data: passives } = usePalworldPassives()
  const { data: quests } = usePalworldQuests()

  const itemCount = useMemo(
    () => (data ? itemIndex(data.pals).length : 0),
    [data],
  )

  return (
    <div className="space-y-10">
      <Hero data={data} loading={loading} />

      {/* Directly under the hero on purpose: arriving knowing a Pal or an item
          is the common case, and picking a tool first is the slow path. */}
      {data && <PalworldFinder data={data} passives={passives} />}

      <StatRow
        stats={[
          { value: data?.pals.length, label: 'Pals catalogued' },
          // The table is the full upper triangle, including the hidden rows.
          { value: data ? (data.all.length * (data.all.length + 1)) / 2 : undefined, label: 'Breeding pairs' },
          { value: passives?.skills.length, label: 'Passive skills' },
          { value: itemCount || undefined, label: 'Droppable items' },
          { value: quests?.quests.length, label: 'Quests' },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ path, icon: Icon, label, hint }) => (
          <ToolCard
            key={path}
            to={path}
            icon={Icon}
            label={label}
            hint={hint}
            element={TOOL_ELEMENT[path] ?? 'Neutral'}
            preview={data ? previewFor(path, data, passives, quests) : null}
          />
        ))}

        <ToolCard
          to="https://github.com/Ragnr99/palworld-overlay"
          external
          icon={Monitor}
          label="Type Chart Overlay"
          hint="A desktop app, not a web page. A click-through element chart pinned over the game that hides itself whenever a menu is open."
          element="Ice"
          preview={<ElementRing />}
        />
      </section>

      <Provenance data={data} loading={loading} />
    </div>
  )
}

/* -------------------------------------------------------------------- hero */

function Hero({ data, loading }: { data: PalworldData | null; loading: boolean }) {
  // A spread across the dex rather than the first N, so the ribbon shows the
  // whole roster's variety instead of five sheep and a chicken.
  const ribbon = useMemo(() => {
    if (!data) return []
    const step = Math.max(1, Math.floor(data.pals.length / 30))
    return data.pals.filter((_, i) => i % step === 0).slice(0, 30)
  }, [data])

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gray-900 dark:bg-gray-950 ring-1 ring-white/10">
      {/* Element-coloured light, the page's whole palette in one gesture. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background: [
            `radial-gradient(60% 90% at 12% 15%, ${ELEMENT_COLORS.Water}55, transparent 70%)`,
            `radial-gradient(55% 85% at 85% 20%, ${ELEMENT_COLORS.Dark}4d, transparent 70%)`,
            `radial-gradient(70% 90% at 60% 100%, ${ELEMENT_COLORS.Grass}40, transparent 70%)`,
          ].join(','),
        }}
      />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          Palworld
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-bold text-white">
          Tools built from the game's own tables
        </h1>
        <p className="mt-3 max-w-xl text-white/70 leading-relaxed">
          A dex, a breeding calculator, a passive stacker, a drop index, a quest tree and a live
          map. Every answer comes straight out of extracted game data.
        </p>

        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {ELEMENTS.map(el => (
            <li key={el} className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ELEMENT_COLORS[el], boxShadow: `0 0 8px ${ELEMENT_COLORS[el]}` }}
              />
              {el}
            </li>
          ))}
        </ul>
      </div>

      {/* Real art, lazily loaded, purely decorative. */}
      <div aria-hidden className="relative h-20 sm:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 dark:from-gray-950 to-transparent z-10" />
        {!loading && ribbon.length > 0 && (
          <div className="pal-ribbon flex w-max gap-3 px-3 opacity-60">
            {[...ribbon, ...ribbon].map((pal, i) => (
              <PalPortrait key={`${pal.i}-${i}`} pal={pal} size={56} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- stat strip */

function StatRow({ stats }: { stats: Array<{ value: number | undefined; label: string }> }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(({ value, label }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
        >
          <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="mt-0.5 font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {value === undefined ? '—' : value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* --------------------------------------------------------------- tool cards */

function ToolCard({ to, icon: Icon, label, hint, element, preview, external = false }: {
  to: string
  icon: React.ComponentType<{ size?: number }>
  label: string
  hint: string
  element: string
  preview: React.ReactNode
  external?: boolean
}) {
  const color = ELEMENT_COLORS[element] ?? '#8b8b8b'
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
            {label}
            {external
              ? <Github size={14} className="text-gray-400" />
              : <ArrowRight
                  size={15}
                  className="text-gray-400 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                />}
          </span>
          <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {hint}
          </span>
        </span>
        {external && <ArrowUpRight size={15} className="shrink-0 text-gray-400" />}
      </div>
      {preview && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">{preview}</div>
      )}
    </>
  )

  const className = 'el-card group block rounded-2xl border bg-white dark:bg-gray-800 p-5 transition-all'
  const style = { '--el': color } as React.CSSProperties

  return external
    ? <a href={to} target="_blank" rel="noopener noreferrer" className={className} style={style}>{body}</a>
    : <Link to={to} className={className} style={style}>{body}</Link>
}

/** A real row from each tool, so a card shows what it does rather than describing it. */
function previewFor(
  path: string,
  data: PalworldData,
  passives: ReturnType<typeof usePalworldPassives>['data'],
  quests: QuestData | null,
) {
  switch (path) {
    case '/palworld/palpedia': {
      const step = Math.max(1, Math.floor(data.pals.length / 7))
      return (
        <div className="flex gap-1.5">
          {data.pals.filter((_, i) => i % step === 0).slice(0, 7).map(pal => (
            <PalPortrait key={pal.i} pal={pal} size={30} />
          ))}
        </div>
      )
    }
    case '/palworld/breeder': {
      // The first pairing in the table that makes something other than itself,
      // so the card always shows a genuine cross even if the roster shifts.
      const [a] = data.pals
      const b = data.pals.find(p => {
        const c = data.childOf(a.i, p.i)
        return c && c.i !== a.i && c.i !== p.i
      })
      const child = b && data.childOf(a.i, b.i)
      if (!b || !child) return null
      return (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <PalPortrait pal={a} size={26} /> <span className="text-gray-400">+</span>
          <PalPortrait pal={b} size={26} /> <ArrowRight size={13} className="text-gray-400" />
          <PalPortrait pal={child} size={26} />
          <span className="truncate font-medium text-gray-900 dark:text-white">{child.name}</span>
        </div>
      )
    }
    case '/palworld/passives':
      return passives ? <Chips items={passives.skills.slice(0, 4).map(s => s.name)} /> : null
    case '/palworld/drops':
      return <Chips items={itemIndex(data.pals).slice(0, 4).map(e => e.item)} />
    case '/palworld/quests': {
      // The opening of the main line, in the order the game gives it, so the
      // card shows the actual chain rather than describing one.
      if (!quests) return null
      const opening = quests.mainSections[0]?.quests.slice(0, 3) ?? []
      if (!opening.length) return null
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
          {opening.map((quest, i) => (
            <span key={quest.id} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight size={11} className="text-gray-400" />}
              <span className="rounded-lg bg-gray-100 dark:bg-gray-700/50 px-2 py-1 text-gray-700 dark:text-gray-200">
                {quest.name}
              </span>
            </span>
          ))}
          <ArrowRight size={11} className="text-gray-400" />
          <span className="text-gray-400">
            {quests.mainSections[0].quests.length - opening.length} more
          </span>
        </div>
      )
    }
    default:
      return null
  }
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(text => (
        <span
          key={text}
          className="rounded-lg bg-gray-100 dark:bg-gray-700/50 px-2 py-1 text-[11px] text-gray-700 dark:text-gray-200"
        >
          {text}
        </span>
      ))}
    </div>
  )
}

/** The overlay's own motif: the five-element loop it draws over the game. */
function ElementRing() {
  const ring = ['Fire', 'Grass', 'Ground', 'Electric', 'Water']
  return (
    <svg viewBox="-50 -50 100 100" className="h-16 w-full" aria-hidden>
      {ring.map((el, i) => {
        const a = ((90 + i * 72) * Math.PI) / 180
        const b = ((90 + (i + 1) * 72) * Math.PI) / 180
        const [x1, y1] = [34 * Math.cos(a), 34 * Math.sin(a)]
        const [x2, y2] = [34 * Math.cos(b), 34 * Math.sin(b)]
        return (
          <g key={el}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={ELEMENT_COLORS[el]} strokeWidth="1.5" strokeOpacity="0.5"
            />
            <circle cx={x1} cy={y1} r="6" fill={ELEMENT_COLORS[el]} />
          </g>
        )
      })}
    </svg>
  )
}

/* -------------------------------------------------------------- provenance */

function Provenance({ data, loading }: { data: PalworldData | null; loading: boolean }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white">Where the data comes from</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
        Stats and the full breeding table are extracted from the game files. Element types, partner
        skills and drops are parsed from the Palworld wiki. The breeding table ships whole. The
        widely-repeated "average the two ranks" rule reproduces about 69% of real results.
      </p>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 tabular-nums">
        {loading
          ? 'Loading dataset…'
          : data
            ? `Dataset built ${new Date(data.generatedAt).toLocaleDateString()}`
            : 'Dataset unavailable.'}
      </p>
    </section>
  )
}

/** Kept so unused-import checks stay honest about what this page reads. */
export type { Pal }
