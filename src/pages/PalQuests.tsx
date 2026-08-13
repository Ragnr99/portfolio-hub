/**
 * Quest Tree: every quest in the game, and how they connect.
 *
 * Two halves. The rail is the whole game at a glance - the main story in the
 * order you meet it, then side missions shelved under whoever hands them out.
 * The page beside it is one quest in full: its briefing, its objectives as
 * numbered steps with coordinates, its rewards, and every quest it touches as
 * something you can click.
 *
 * The selected quest lives in the URL (`?q=slug`) rather than in state, which
 * buys three things for free: a quest is linkable, browser Back walks out of
 * whatever chain of "and then?" you followed, and the prerenderer can give each
 * quest its own page. Following a link pushes; searching replaces.
 *
 * What this page will not do is draw a branching graph, because the data is not
 * one - see usePalworldQuests. The main line is a chain and most side missions
 * have no recorded links at all, so the honest shapes are a reading order and a
 * questgiver shelf, with Nearby doing the reconnecting geography can justify.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScrollText, Search, X, MapPin, ChevronLeft, Gift, Sparkles } from 'lucide-react'
import {
  usePalworldQuests, searchQuests, relatedQuests, placeName, isMain,
  type Quest, type QuestData,
} from '../hooks/usePalworldQuests'

/** paldb prints this where it declines to spoil a step. */
const HIDDEN_STEP = '？？？'

export default function PalQuests() {
  const { data, loading, error } = usePalworldQuests()
  const [params, setParams] = useSearchParams()

  const query = params.get('search') ?? ''
  const slug = params.get('q') ?? ''
  const selected = data ? (data.bySlug.get(slug) ?? null) : null

  /** Follow a link: pushes, so Back returns to where you came from. */
  const open = (quest: Quest) => {
    const next = new URLSearchParams(params)
    next.set('q', quest.slug)
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Type in the box: replaces, so Back isn't one entry per keystroke. */
  const search = (term: string) => {
    const next = new URLSearchParams(params)
    if (term) next.set('search', term)
    else next.delete('search')
    setParams(next, { replace: true })
  }

  const clearSelection = () => {
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next)
  }

  const shell = (children: React.ReactNode) => (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
          <ScrollText size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quest Tree</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Every quest, in order, with walkthroughs and what each one leads to.
          </p>
        </div>
      </header>
      {children}
    </div>
  )

  if (loading) return shell(<p className="text-gray-500 dark:text-gray-400">Loading quests…</p>)
  if (error || !data) {
    return shell(<p className="text-red-600 dark:text-red-400">Couldn't load the quest data: {error}</p>)
  }

  return shell(
    <>
      <StatRow data={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* On mobile the rail and the page are the same column, so opening a
            quest replaces the list rather than pushing it off the fold. */}
        <div className={selected ? 'hidden lg:block' : ''}>
          <Rail
            data={data}
            query={query}
            onSearch={search}
            selected={selected}
            onOpen={open}
          />
        </div>

        <div className={selected ? '' : 'hidden lg:block'}>
          {selected
            ? <QuestPage data={data} quest={selected} onOpen={open} onBack={clearSelection} />
            : <Empty />}
        </div>
      </div>

      <Provenance data={data} />
    </>
  )
}

/* -------------------------------------------------------------- stat strip */

function StatRow({ data }: { data: QuestData }) {
  const located = useMemo(
    () => data.quests.filter(q => q.objectives.some(o => o.x !== undefined)).length,
    [data],
  )
  const steps = useMemo(
    () => data.quests.reduce((n, q) => n + q.objectives.length, 0),
    [data],
  )

  const stats = [
    { value: data.quests.length, label: 'Quests' },
    { value: data.main.length, label: 'Main missions' },
    { value: data.side.length, label: 'Side missions' },
    { value: steps, label: 'Objective steps' },
    { value: located, label: 'With coordinates' },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(({ value, label }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
        >
          <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="mt-0.5 font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* --------------------------------------------------------------------- rail */

function Rail({ data, query, onSearch, selected, onOpen }: {
  data: QuestData
  query: string
  onSearch: (term: string) => void
  selected: Quest | null
  onOpen: (quest: Quest) => void
}) {
  const hits = useMemo(() => (query ? searchQuests(data, query) : null), [data, query])

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search quests, steps, items…"
            className="w-full min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-9 pr-9 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => onSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* A tall, independently scrolling rail on desktop; the whole list on
          mobile, where the page scroll is the only one that makes sense. */}
      <div className="lg:max-h-[42rem] lg:overflow-y-auto p-2">
        {hits
          ? (hits.length
              ? <Section
                  label={`${hits.length} match${hits.length === 1 ? '' : 'es'}`}
                  quests={hits}
                  selected={selected}
                  onOpen={onOpen}
                  numbered={false}
                  showKind
                />
              : <p className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Nothing matches “{query}”.
                </p>)
          : (
            <>
              {data.mainSections.map(section => (
                <Section
                  key={section.label}
                  label={section.label}
                  quests={section.quests}
                  selected={selected}
                  onOpen={onOpen}
                  numbered
                />
              ))}
              {data.sideGroups.map(group => (
                <Section
                  key={group.label}
                  label={group.label}
                  quests={group.quests}
                  selected={selected}
                  onOpen={onOpen}
                  numbered={false}
                  collapsed
                />
              ))}
            </>
          )}
      </div>
    </div>
  )
}

function Section({ label, quests, selected, onOpen, numbered, collapsed = false, showKind = false }: {
  label: string
  quests: Quest[]
  selected: Quest | null
  onOpen: (quest: Quest) => void
  numbered: boolean
  collapsed?: boolean
  showKind?: boolean
}) {
  // Side-quest shelves start shut so the rail opens on the story rather than on
  // 59 side missions - unless the selected quest is inside one, in which case
  // hiding it would make the highlight invisible.
  const holdsSelected = !!selected && quests.some(q => q.id === selected.id)

  return (
    <details open={!collapsed || holdsSelected} className="group">
      <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/40">
        <span>{label}</span>
        <span className="tabular-nums text-gray-400">{quests.length}</span>
      </summary>
      <ul className="mb-2">
        {quests.map((quest, i) => {
          const active = selected?.id === quest.id
          return (
            <li key={quest.id}>
              <button
                onClick={() => onOpen(quest)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-baseline gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-100 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                {numbered && (
                  <span className="shrink-0 tabular-nums text-xs text-gray-400">{i + 1}.</span>
                )}
                <span className="min-w-0 flex-1">{quest.name}</span>
                {showKind && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
                    {isMain(quest) ? 'Main' : 'Side'}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/* --------------------------------------------------------------- quest page */

function Empty() {
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
      <div>
        <ScrollText size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Pick a quest to see its walkthrough and what it connects to.
        </p>
      </div>
    </div>
  )
}

function QuestPage({ data, quest, onOpen, onBack }: {
  data: QuestData
  quest: Quest
  onOpen: (quest: Quest) => void
  onBack: () => void
}) {
  const related = useMemo(() => relatedQuests(data, quest), [data, quest])
  const position = isMain(quest) && quest.inStory && quest.order !== undefined
    ? `Step ${quest.order + 1} of the main story`
    : null

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 sm:p-7">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:hidden"
      >
        <ChevronLeft size={16} /> All quests
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isMain(quest)
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
          }`}
        >
          {quest.kind || 'Quest'}
        </span>
        {position && (
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{position}</span>
        )}
      </div>

      <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
        {quest.name}
      </h2>
      <p className="mt-1 font-mono text-[11px] text-gray-400">{quest.id}</p>

      {quest.description && (
        <section className="mt-6">
          <Heading>Briefing</Heading>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            {quest.description}
          </p>
        </section>
      )}

      <Walkthrough quest={quest} />

      {quest.rewards.length > 0 && (
        <section className="mt-6">
          <Heading>Rewards</Heading>
          <ul className="mt-2 flex flex-wrap gap-2">
            {quest.rewards.map(reward => (
              <li
                key={reward}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-sm text-amber-900 dark:text-amber-200"
              >
                <Gift size={14} className="text-amber-500" />
                {reward}
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.map(group => (
        <section key={group.label} className="mt-6">
          <Heading>{group.label}</Heading>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.quests.map(other => (
              <button
                key={other.id}
                onClick={() => onOpen(other)}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:border-violet-500 dark:hover:bg-violet-900/30"
              >
                {other.name}
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  {isMain(other) ? 'Main' : 'Side'}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </h3>
  )
}

/**
 * The objectives, numbered.
 *
 * paldb emits one entry per quest block, so this order is the order the game
 * asks for them in - the numbering is real rather than invented. Steps that are
 * a map pin get the place name and the coordinates split apart, so a line reads
 * "do this, at here" instead of as a run of digits.
 */
function Walkthrough({ quest }: { quest: Quest }) {
  if (!quest.objectives.length) return null
  let step = 0

  return (
    <section className="mt-6">
      <Heading>Walkthrough</Heading>
      <ol className="mt-2 space-y-1.5">
        {quest.objectives.map((objective, i) => {
          if (objective.text === HIDDEN_STEP) {
            return (
              <li key={i} className="flex items-center gap-2 pl-7 text-sm italic text-gray-400">
                <Sparkles size={13} /> paldb withholds this step
              </li>
            )
          }
          step += 1
          const located = objective.x !== undefined
          return (
            <li key={i} className="flex gap-2.5 text-[15px]">
              <span className="mt-0.5 shrink-0 tabular-nums text-sm font-medium text-gray-400">
                {step}.
              </span>
              <span className="min-w-0 flex-1 text-gray-800 dark:text-gray-200">
                {located ? placeName(objective) : objective.text}
                {located && (
                  <>
                    {' '}
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.5 align-middle font-mono text-[11px] text-gray-600 dark:text-gray-300">
                      <MapPin size={11} className="text-gray-400" />
                      {objective.x}, {objective.y}
                    </span>{' '}
                    <span className="text-xs text-gray-400">
                      {objective.map?.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* -------------------------------------------------------------- provenance */

function Provenance({ data }: { data: QuestData }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white">Where the data comes from</h2>
      <div className="mt-2 max-w-3xl space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        <p>
          Extracted from{' '}
          <a
            href="https://paldb.cc/en/Mission"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            paldb's
          </a>{' '}
          datamine of the game's own <code className="font-mono text-xs">DT_PalQuestData</code>, and
          cross-checked against a real install: the game ships a text manifest of its 38&nbsp;GB pak
          listing 359 quest Blueprints, and the per-quest objective lists line up with them step for
          step.
        </p>
        <p>
          The main missions form one chain about 30 quests long, with two tutorial entry points that
          converge. Most side missions carry no links at all — what unlocks them lives in Blueprint
          graphs the datamine never reached. Those are shelved by questgiver, and{' '}
          <strong>Nearby</strong> reconnects them by map distance.
        </p>
        <p>
          Names in braces like <code className="font-mono text-xs">{'{KingWhale}'}</code> are the
          game's own substitution tokens, and the source ships them unresolved. The internal id is
          rarely the display name — that one is the Pal you know as Panthalus — so they appear here
          exactly as the game writes them.
        </p>
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 tabular-nums">
        Dataset built {new Date(data.generatedAt).toLocaleDateString()}
      </p>
    </section>
  )
}
