import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { usePokemonIndex, prettyPokemonName, type PokemonEntry } from '../hooks/usePokemonIndex'
import { TYPE_COLORS } from '../utils/pokemonConstants'
import { SmartLink } from '../lib/history'

/**
 * A Pokémon's own page, mirroring PalPage.
 *
 * The index gives us name, types and sprite immediately, so the page renders
 * straight away and the PokeAPI call only fills in the extra detail. That
 * matters because unlike the Palworld pages, this one depends on a third-party
 * API: if pokeapi.co is slow or down you still get a usable page rather than a
 * spinner forever.
 *
 * Deliberately lighter than the Pokédex's inline panel, which also streams in
 * every move and the full evolution chain.
 */

interface Detail {
  stats: Array<{ name: string; value: number }>
  abilities: string[]
  height: number
  weight: number
  artwork: string | null
  flavor: string | null
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const STAT_COLORS: Record<string, string> = {
  hp: '#22c55e',
  attack: '#ef4444',
  defense: '#3b82f6',
  'special-attack': '#f97316',
  'special-defense': '#14b8a6',
  speed: '#a855f7',
}

export default function PokemonPage() {
  const { slug = '' } = useParams()
  const pokemon = usePokemonIndex()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [failed, setFailed] = useState(false)

  const mon = useMemo(() => pokemon.find(p => p.name === slug) ?? null, [pokemon, slug])

  useEffect(() => {
    if (!mon) return
    let alive = true
    setDetail(null)
    setFailed(false)

    Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${mon.id}`).then(r => r.json()),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${mon.id}`).then(r => r.json()).catch(() => null),
    ])
      .then(([full, species]) => {
        if (!alive) return
        const entry = species?.flavor_text_entries?.find(
          (f: { language: { name: string } }) => f.language.name === 'en')
        setDetail({
          stats: (full.stats ?? []).map((s: { stat: { name: string }; base_stat: number }) => ({
            name: s.stat.name, value: s.base_stat,
          })),
          abilities: (full.abilities ?? []).map(
            (a: { ability: { name: string } }) => prettyPokemonName(a.ability.name)),
          height: (full.height ?? 0) / 10,
          weight: (full.weight ?? 0) / 10,
          artwork: full.sprites?.other?.['official-artwork']?.front_default ?? null,
          flavor: entry?.flavor_text?.replace(/[\n\f]/g, ' ') ?? null,
        })
      })
      .catch(() => { if (alive) setFailed(true) })

    return () => { alive = false }
  }, [mon])

  if (!pokemon.length) return <Wrap><p className="text-gray-500 dark:text-gray-400">Loading…</p></Wrap>

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

  return (
    <Wrap>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="h-1 flex">
          {mon.types.map(t => (
            <div key={t} className="flex-1" style={{ backgroundColor: TYPE_COLORS[t] ?? '#888' }} />
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-5 flex-wrap">
            <img
              src={detail?.artwork ?? mon.sprite}
              alt={prettyPokemonName(mon.name)}
              width={128}
              height={128}
              className={`w-32 h-32 object-contain shrink-0 ${detail?.artwork ? '' : '[image-rendering:pixelated]'}`}
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
              {detail?.flavor && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-prose">
                  {detail.flavor}
                </p>
              )}
            </div>
          </div>

          {failed && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Couldn't reach PokéAPI, so stats and abilities are unavailable. Name, type and sprite come from this
              site's own index, which is why they still show.
            </p>
          )}

          {detail && (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Base stats
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total <strong className="text-gray-900 dark:text-white tabular-nums">{total}</strong>
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.stats.map(s => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{STAT_LABELS[s.name] ?? s.name}</span>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{s.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (s.value / 255) * 100)}%`,
                            backgroundColor: STAT_COLORS[s.name] ?? '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Fact label="Height" value={`${detail.height.toFixed(1)} m`} />
                <Fact label="Weight" value={`${detail.weight.toFixed(1)} kg`} />
                <Fact label="Abilities" value={detail.abilities.join(', ') || '—'} />
              </div>
            </>
          )}

          {!detail && !failed && (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading stats from PokéAPI…</p>
          )}
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
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
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
      <SmartLink
        to="/pokedex"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft size={16} /> All Pokémon
      </SmartLink>
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
