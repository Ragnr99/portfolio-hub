import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { usePokemonIndex, prettyPokemonName, type PokemonEntry } from '../hooks/usePokemonIndex'
import { TYPE_COLORS } from '../utils/pokemonConstants'
import { SmartLink } from '../lib/history'
import BackLink from '../components/BackLink'
import { fetchEvolutions, toLearnset, type Evolution, type Learnset } from '../lib/pokeapi'

/**
 * A Pokémon's own page, mirroring PalPage.
 *
 * The local index supplies name, types and sprite, so the page paints
 * immediately and PokeAPI only fills in the rest. Unlike the Palworld pages
 * this one genuinely depends on a third party, so every network-fed section
 * degrades on its own: a failed evolution fetch doesn't take the stats with it.
 */

interface Detail {
  stats: Array<{ name: string; value: number }>
  abilities: string[]
  height: number
  weight: number
  artwork: string | null
  flavor: string | null
  learnset: Learnset
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed',
}

const STAT_COLORS: Record<string, string> = {
  hp: '#22c55e', attack: '#ef4444', defense: '#3b82f6',
  'special-attack': '#f97316', 'special-defense': '#14b8a6', speed: '#a855f7',
}

type MoveTab = 'levelUp' | 'machine' | 'egg' | 'tutor'
const MOVE_TABS: Array<{ id: MoveTab; label: string }> = [
  { id: 'levelUp', label: 'Level up' },
  { id: 'machine', label: 'TM / HM' },
  { id: 'egg', label: 'Egg' },
  { id: 'tutor', label: 'Tutor' },
]

export default function PokemonPage() {
  const { slug = '' } = useParams()
  const pokemon = usePokemonIndex()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [evolutions, setEvolutions] = useState<Evolution[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<MoveTab>('levelUp')

  const mon = useMemo(() => pokemon.find(p => p.name === slug) ?? null, [pokemon, slug])

  useEffect(() => {
    if (!mon) return
    let alive = true
    setDetail(null); setEvolutions(null); setFailed(false); setTab('levelUp')

    fetch(`https://pokeapi.co/api/v2/pokemon/${mon.id}`)
      .then(r => r.json())
      .then(full => {
        if (!alive) return
        setDetail({
          stats: (full.stats ?? []).map((s: { stat: { name: string }; base_stat: number }) => ({
            name: s.stat.name, value: s.base_stat,
          })),
          abilities: (full.abilities ?? []).map(
            (a: { ability: { name: string } }) => prettyPokemonName(a.ability.name)),
          height: (full.height ?? 0) / 10,
          weight: (full.weight ?? 0) / 10,
          artwork: full.sprites?.other?.['official-artwork']?.front_default ?? null,
          flavor: null,
          learnset: toLearnset(full.moves),
        })
      })
      .catch(() => { if (alive) setFailed(true) })

    // Separate request, separate failure: losing the chain shouldn't blank the page.
    fetchEvolutions(mon.id)
      .then(list => { if (alive) setEvolutions(list) })
      .catch(() => { if (alive) setEvolutions([]) })

    return () => { alive = false }
  }, [mon])

  if (!pokemon.length) return <Wrap><SkeletonCard /></Wrap>

  if (!mon) {
    return (
      <Wrap>
        <p className="text-gray-600 dark:text-gray-300">
          No Pokémon called "{slug}".{' '}
          <SmartLink to="/pokedex" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Back to the Pokédex
          </SmartLink>
        </p>
      </Wrap>
    )
  }

  const total = detail?.stats.reduce((t, s) => t + s.value, 0) ?? 0
  const neighbours = adjacent(pokemon, mon)
  const moves = detail?.learnset
  const activeMoves: Array<{ name: string; level?: number }> = moves
    ? tab === 'levelUp'
      ? moves.levelUp
      : moves[tab].map(name => ({ name }))
    : []

  return (
    <Wrap>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden rise-in">
        <div className="h-1 flex">
          {mon.types.map(t => (
            <div key={t} className="flex-1" style={{ backgroundColor: TYPE_COLORS[t] ?? '#888' }} />
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-7">
          <div className="flex items-start gap-5 flex-wrap">
            <img
              src={detail?.artwork ?? mon.sprite}
              alt={prettyPokemonName(mon.name)}
              width={128}
              height={128}
              className={`w-32 h-32 object-contain shrink-0 tactile-art ${detail?.artwork ? '' : '[image-rendering:pixelated]'}`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {prettyPokemonName(mon.name)}
                </h1>
                <span className="text-sm font-mono text-gray-400">
                  #{String(mon.id).padStart(3, '0')}
                </span>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {mon.types.map(t => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: TYPE_COLORS[t] ?? '#888' }}
                  >
                    {prettyPokemonName(t)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {failed && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Couldn't reach PokéAPI, so stats and moves are unavailable. Name, type and sprite come from this site's
              own index, which is why they still show.
            </p>
          )}

          {!detail && !failed && <StatSkeleton />}

          {detail && (
            <Section title="Base stats" trailing={
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total <strong className="text-gray-900 dark:text-white tabular-nums">{total}</strong>
              </span>
            }>
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.stats.map((s, k) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">{STAT_LABELS[s.name] ?? s.name}</span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{s.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full stat-fill"
                        style={{
                          width: `${Math.min(100, (s.value / 255) * 100)}%`,
                          backgroundColor: STAT_COLORS[s.name] ?? '#6b7280',
                          animationDelay: `${k * 55}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {detail && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Fact label="Height" value={`${detail.height.toFixed(1)} m`} />
              <Fact label="Weight" value={`${detail.weight.toFixed(1)} kg`} />
              <Fact label="Abilities" value={detail.abilities.join(', ') || '—'} />
            </div>
          )}

          {/* Evolutions */}
          <Section title="Evolution">
            {evolutions === null && <div className="h-20 rounded-lg skeleton" />}
            {evolutions?.length === 0 && (
              <p className="text-sm text-gray-400">This Pokémon doesn't evolve.</p>
            )}
            {evolutions && evolutions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {evolutions.map((evo, k) => (
                  <div key={`${evo.id}-${k}`} className="flex items-center gap-2">
                    {k > 0 && (
                      <div className="flex flex-col items-center px-1 text-gray-400">
                        <ChevronRight size={16} />
                        {evo.method && (
                          <span className="text-[10px] whitespace-nowrap max-w-[86px] truncate" title={evo.method}>
                            {evo.method}
                          </span>
                        )}
                      </div>
                    )}
                    <SmartLink
                      to={`/pokedex/${evo.name}`}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border tactile ${
                        evo.id === mon.id
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <img src={evo.sprite} alt="" width={48} height={48} className="[image-rendering:pixelated]" />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {prettyPokemonName(evo.name)}
                      </span>
                    </SmartLink>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Moves */}
          <Section title="Moves">
            {!moves && !failed && <div className="h-32 rounded-lg skeleton" />}
            {moves && (
              <>
                <div className="inline-flex flex-wrap rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-800 mb-3">
                  {MOVE_TABS.map(t => {
                    const count = t.id === 'levelUp' ? moves.levelUp.length : moves[t.id].length
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        disabled={count === 0}
                        className={`px-3 min-h-[36px] rounded-md text-sm font-medium transition-colors tactile-press disabled:opacity-40 ${
                          tab === t.id
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {t.label} <span className="tabular-nums opacity-60">{count}</span>
                      </button>
                    )
                  })}
                </div>

                {activeMoves.length === 0 ? (
                  <p className="text-sm text-gray-400">Nothing in this category.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {activeMoves.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-900 dark:text-white">{m.name}</span>
                        {m.level !== undefined && (
                          <span className="text-xs tabular-nums text-gray-400">
                            {m.level === 0 ? 'Evolve' : `Lv ${m.level}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Section>
        </div>
      </div>

      <div className="flex justify-between gap-3">
        {neighbours.prev ? <NeighbourLink mon={neighbours.prev} dir="prev" /> : <span />}
        {neighbours.next && <NeighbourLink mon={neighbours.next} dir="next" />}
      </div>
    </Wrap>
  )
}

function adjacent(list: PokemonEntry[], mon: PokemonEntry) {
  const ordered = [...list].sort((a, b) => a.id - b.id)
  const i = ordered.findIndex(p => p.id === mon.id)
  return { prev: i > 0 ? ordered[i - 1] : null, next: i < ordered.length - 1 ? ordered[i + 1] : null }
}

function NeighbourLink({ mon, dir }: { mon: PokemonEntry; dir: 'prev' | 'next' }) {
  return (
    <SmartLink
      to={`/pokedex/${mon.name}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 tactile ${
        dir === 'next' ? 'flex-row-reverse text-right ml-auto' : ''
      }`}
    >
      <img src={mon.sprite} alt="" width={32} height={32} className="shrink-0 [image-rendering:pixelated]" />
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
          {dir === 'prev' ? 'Previous' : 'Next'}
        </span>
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
          {prettyPokemonName(mon.name)}
        </span>
      </span>
    </SmartLink>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <BackLink fallback="/pokedex" fallbackLabel="All Pokémon" />
      {children}
    </div>
  )
}

function Section({ title, trailing, children }: {
  title: string; trailing?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rise-in">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{title}</h2>
        {trailing}
      </div>
      {children}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-semibold text-gray-900 dark:text-white truncate" title={value}>{value}</div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, k) => <div key={k} className="h-8 rounded-lg skeleton" />)}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 space-y-4">
      <div className="h-32 w-32 rounded-xl skeleton" />
      <div className="h-6 w-48 rounded skeleton" />
      <StatSkeleton />
    </div>
  )
}
