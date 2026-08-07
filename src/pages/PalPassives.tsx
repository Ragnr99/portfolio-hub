import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, Search, X, Plus, Info, Link2, Check } from 'lucide-react'
import {
  usePalworldPassives, combine, statMeta, formatStat, rankStyle,
  STAT_GROUPS, type Passive, type StatGroup,
} from '../hooks/usePalworldPassives'

/**
 * The Passive Dex.
 *
 * Two halves that share one dataset. The catalogue is the reference: all 115
 * passives a Pal can hold in 1.0, with the game's own wording kept verbatim
 * underneath our parse of it, so you can see we didn't invent a number.
 *
 * The bench on top is the point of the page. Four is the game's cap, and the
 * interesting question is never what one passive does, it's what four do
 * together: Legend and Demon God are +20% and +30% Attack, and what you
 * actually want to know is that the pair is +50%.
 */

const MAX_SLOTS = 4

/** Loadouts live in the URL so a build can be linked. */
const BUILD_PARAM = 'build'

type Sign = 'all' | 'positive' | 'negative'

export default function PalPassives() {
  const { data, loading, error } = usePalworldPassives()
  const [params, setParams] = useSearchParams()

  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<StatGroup | null>(null)
  const [sign, setSign] = useState<Sign>('all')
  const [inheritableOnly, setInheritableOnly] = useState(false)
  const [copied, setCopied] = useState(false)

  // Read the deep link once the dataset is around to validate names against.
  useEffect(() => {
    if (!data) return
    const raw = params.get(BUILD_PARAM)
    if (!raw) return
    const valid = raw.split('.').filter(n => data.byInternal.has(n)).slice(0, MAX_SLOTS)
    setPicked(prev => (prev.length ? prev : valid))
  }, [data, params])

  const skills = useMemo(
    () => (data ? picked.map(n => data.byInternal.get(n)).filter(Boolean) as Passive[] : []),
    [data, picked],
  )

  const totals = useMemo(() => combine(skills), [skills])

  const setLoadout = (next: string[]) => {
    setPicked(next)
    setCopied(false)
    // replace: true, so building a set doesn't bury the back button in history.
    setParams(next.length ? { [BUILD_PARAM]: next.join('.') } : {}, { replace: true })
  }

  const toggle = (skill: Passive) => {
    if (picked.includes(skill.internal)) {
      setLoadout(picked.filter(n => n !== skill.internal))
    } else if (picked.length < MAX_SLOTS) {
      setLoadout([...picked, skill.internal])
    }
  }

  const shown = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.skills.filter(s => {
      if (q && !s.name.toLowerCase().includes(q) && !s.lines.join(' ').toLowerCase().includes(q)) return false
      if (group && !s.effects.some(e => statMeta(e.stat).group === group)) return false
      if (sign === 'positive' && s.rank < 0) return false
      if (sign === 'negative' && s.rank > 0) return false
      if (inheritableOnly && !s.inheritable) return false
      return true
    })
  }, [data, query, group, sign, inheritableOnly])

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
      () => {},
    )
  }

  if (loading) return <Shell><p className="text-gray-500 dark:text-gray-400">Loading passive skills…</p></Shell>
  if (error || !data) {
    return <Shell><p className="text-red-600 dark:text-red-400">Couldn't load the passive dataset: {error}</p></Shell>
  }

  return (
    <Shell>
      {/* ------------------------------------------------------------ bench */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Loadout <span className="text-gray-400 dark:text-gray-500 font-normal tabular-nums">{picked.length}/{MAX_SLOTS}</span>
          </h2>
          <div className="flex items-center gap-2">
            {picked.length > 0 && (
              <>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {copied ? <Check size={13} /> : <Link2 size={13} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  onClick={() => setLoadout([])}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: MAX_SLOTS }, (_, i) => {
              const skill = skills[i]
              if (!skill) {
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 min-h-[74px] flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500"
                  >
                    <Plus size={14} /> Empty slot
                  </div>
                )
              }
              const tier = rankStyle(skill.rank)
              return (
                <div
                  key={skill.internal}
                  className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-3 min-h-[74px] relative"
                >
                  <button
                    onClick={() => toggle(skill)}
                    aria-label={`Remove ${skill.name}`}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="pr-5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{skill.name}</span>
                    <div className="mt-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tier.className}`}>{tier.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {skills.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pick up to four passives below and every buff and debuff they add up to will appear here.
            </p>
          ) : (
            <Totals totals={totals} />
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- filters */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search names and effects…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={sign}
            onChange={e => setSign(e.target.value as Sign)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Every tier</option>
            <option value="positive">Beneficial only</option>
            <option value="negative">Drawbacks only</option>
          </select>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={inheritableOnly}
              onChange={e => setInheritableOnly(e.target.checked)}
              className="accent-indigo-500"
            />
            Breedable only
          </label>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Chip active={group === null} onClick={() => setGroup(null)}>All effects</Chip>
          {STAT_GROUPS.map(g => (
            <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>{g}</Chip>
          ))}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shown.length} of {data.skills.length} passive skills
          {picked.length >= MAX_SLOTS && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">Loadout full — remove one to swap.</span>
          )}
        </p>
      </div>

      {/* ------------------------------------------------------------- grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(skill => (
          <SkillCard
            key={skill.internal}
            skill={skill}
            selected={picked.includes(skill.internal)}
            full={picked.length >= MAX_SLOTS}
            onToggle={() => toggle(skill)}
          />
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">No passives match those filters.</p>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white">How the maths works</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Palworld's passive bonuses are additive percentages against a Pal's base stat rather than multipliers
          against each other, so Legend and Demon God together are +50% Attack, not +56%. Every total on this page is
          a plain sum for that reason.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The 115 skills, their tiers and their descriptions come out of the game's own DataTables. The numbers are
          parsed from those descriptions by a build script that refuses to run if it meets a line it doesn't
          recognise, so a patch that rewords an effect breaks the build instead of quietly dropping a stat.
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
          Version {data.gameVersion} · {data.skills.length} passives · built{' '}
          {new Date(data.generatedAt).toLocaleDateString()}
        </p>
      </div>
    </Shell>
  )
}

/* --------------------------------------------------------------- totals */

function Totals({ totals }: { totals: ReturnType<typeof combine> }) {
  return (
    <div className="space-y-4">
      {totals.redundancies.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 px-4 py-3">
          <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-200">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              {totals.redundancies.map(r => (
                <p key={r.redundant}>
                  <strong>{r.redundant}</strong> adds nothing that <strong>{r.coveredBy}</strong> isn't already
                  doing better. That slot is free.
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {totals.groups.map(({ group, stats }) => (
          <div key={group} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {group}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {stats.map(s => (
                <div key={s.stat} className="px-3 py-2 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
                      {s.label}
                      {statMeta(s.stat).hint && (
                        <span title={statMeta(s.stat).hint} className="ml-1 text-gray-400 cursor-help">*</span>
                      )}
                    </div>
                    {/* Only worth showing the breakdown once more than one skill feeds a stat. */}
                    {s.from.length > 1 && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {s.from.map(f => `${f.name}${f.value === undefined ? '' : ` ${f.value > 0 ? '+' : ''}${f.value}`}`).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${valueClass(s.value)}`}>
                    {s.flag ? 'Yes' : formatStat(s.stat, s.value ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {totals.cancelled.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cancels out to nothing:{' '}
          {totals.cancelled.map(s => `${s.label} (${s.from.map(f => `${f.name} ${f.value! > 0 ? '+' : ''}${f.value}`).join(', ')})`).join('; ')}
        </p>
      )}
    </div>
  )
}

/** Positive is normalized to "good" at build time, so colour can key off sign. */
function valueClass(value?: number) {
  if (value === undefined) return 'text-indigo-600 dark:text-indigo-300'
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400'
}

/* ----------------------------------------------------------------- card */

function SkillCard({
  skill, selected, full, onToggle,
}: {
  skill: Passive
  selected: boolean
  full: boolean
  onToggle: () => void
}) {
  const tier = rankStyle(skill.rank)
  const disabled = full && !selected

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={`text-left rounded-xl border p-3.5 transition-all ${
        selected
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-400'
          : disabled
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-45 cursor-not-allowed'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 tactile'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-900 dark:text-white leading-tight">{skill.name}</span>
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${tier.className}`}>{tier.label}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {skill.effects.map((e, i) => (
          <span
            key={`${e.stat}-${i}`}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
              e.flag
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : (e.value ?? 0) > 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {statMeta(e.stat).label}
            {!e.flag && <span className="tabular-nums font-bold">{formatStat(e.stat, e.value ?? 0)}</span>}
          </span>
        ))}
      </div>

      {/* The game's own words, kept so the parse above can be checked against them. */}
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        {skill.lines.join(' ')}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400 dark:text-gray-500">
        {skill.inheritable
          ? <span>{skill.inheritWeight < 100 ? 'Rare breeding roll' : 'Breedable'}</span>
          : <span>Not breedable</span>}
        {skill.hasSurgeryItem && <span>Has a passive fruit</span>}
        {skill.notes.map(n => <span key={n}>{n}</span>)}
      </div>
    </button>
  )
}

/* ---------------------------------------------------------------- shell */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300">
          <Sparkles size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Passive Dex</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Every passive skill in 1.0, and what any four of them add up to.
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
