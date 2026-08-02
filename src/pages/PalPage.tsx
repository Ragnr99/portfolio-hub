import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Egg } from 'lucide-react'
import {
  usePalworldData, WEAK_TO, STRONG_AGAINST, type Pal,
} from '../hooks/usePalworldData'
import {
  ElementBadge, ElementStripe, StatBar, WorkGrid, RarityBadge, DexNumber, PalPortrait,
} from '../components/PalBits'
import { SmartLink } from '../lib/history'
import BackLink from '../components/BackLink'

export default function PalPage() {
  const { slug = '' } = useParams()
  const { data, loading, error } = usePalworldData()

  const pal = useMemo(
    () => data?.pals.find(p => p.slug === slug) ?? null,
    [data, slug])

  const maxes = useMemo(() => {
    if (!data) return { hp: 1, attack: 1, defense: 1 }
    return {
      hp: Math.max(...data.pals.map(p => p.hp)),
      attack: Math.max(...data.pals.map(p => p.attack)),
      defense: Math.max(...data.pals.map(p => p.defense)),
    }
  }, [data])

  if (loading) return <Wrap><p className="text-gray-500 dark:text-gray-400">Loading…</p></Wrap>
  if (error || !data) {
    return <Wrap><p className="text-red-600 dark:text-red-400">Couldn't load the Pal dataset: {error}</p></Wrap>
  }
  if (!pal) {
    return (
      <Wrap>
        <p className="text-gray-600 dark:text-gray-300">
          No Pal called "{slug}".{' '}
          <SmartLink to="/palworld/palpedia" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Back to the Palpedia
          </SmartLink>
        </p>
      </Wrap>
    )
  }

  const weaknesses = [...new Set(pal.elements.map(e => WEAK_TO[e]).filter(Boolean))]
  const strengths = [...new Set(pal.elements.flatMap(e => STRONG_AGAINST[e] ?? []))]
  const neighbours = adjacent(data.pals, pal)

  return (
    <Wrap>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden rise-in">
        <ElementStripe elements={pal.elements} />
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="tactile-art"><PalPortrait pal={pal} size={112} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{pal.name}</h1>
                <DexNumber pal={pal} />
                <RarityBadge rarity={pal.rarity} />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {pal.elements.map(el => <ElementBadge key={el} element={el} />)}
              </div>
              <SmartLink
                to={`/palworld/breeder?target=${pal.i}`}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 text-sm font-medium tactile-press"
              >
                <Egg size={16} /> How do I breed {pal.name}?
              </SmartLink>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatBar label="HP" value={pal.hp} max={maxes.hp} color="#22c55e" />
            <StatBar label="Attack" value={pal.attack} max={maxes.attack} color="#ef4444" />
            <StatBar label="Defense" value={pal.defense} max={maxes.defense} color="#3b82f6" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact label="Size" value={pal.size} />
            <Fact label="Food" value={`${pal.food}/tick`} />
            <Fact label="Wild level" value={`${pal.wild[0]}–${pal.wild[1]}`} />
            <Fact label="Nocturnal" value={pal.nocturnal ? 'Yes' : 'No'} />
          </div>

          <Section title="Work suitability">
            <WorkGrid pal={pal} workKeys={data.workKeys} />
          </Section>

          <Section title="Type matchups">
            <div className="space-y-2">
              <Row label="Weak to" items={weaknesses} />
              <Row label="Strong vs" items={strengths} />
            </div>
          </Section>

          {pal.partnerSkill && (
            <Section title="Partner skill">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{pal.partnerSkill}</p>
              {pal.partnerDesc && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{pal.partnerDesc}</p>
              )}
            </Section>
          )}

          {pal.drops.length > 0 && (
            <Section title="Drops">
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {pal.drops.map((d, k) => <li key={k}>{d}</li>)}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {/* Straight to the next Pal without bouncing off the dex, which is exactly
          the loop the trail would otherwise pile up. */}
      <div className="flex justify-between gap-3">
        {neighbours.prev
          ? <NeighbourLink pal={neighbours.prev} dir="prev" />
          : <span />}
        {neighbours.next && <NeighbourLink pal={neighbours.next} dir="next" />}
      </div>
    </Wrap>
  )
}

function adjacent(pals: Pal[], pal: Pal) {
  const ordered = [...pals].sort((a, b) => a.dex - b.dex || Number(a.variant) - Number(b.variant))
  const i = ordered.findIndex(p => p.i === pal.i)
  return { prev: i > 0 ? ordered[i - 1] : null, next: i < ordered.length - 1 ? ordered[i + 1] : null }
}

function NeighbourLink({ pal, dir }: { pal: Pal; dir: 'prev' | 'next' }) {
  return (
    <SmartLink
      to={`/palworld/pal/${pal.slug}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 tactile ${
        dir === 'next' ? 'flex-row-reverse text-right ml-auto' : ''
      }`}
    >
      <PalPortrait pal={pal} size={32} />
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
          {dir === 'prev' ? 'Previous' : 'Next'}
        </span>
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{pal.name}</span>
      </span>
    </SmartLink>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <BackLink fallback="/palworld/palpedia" fallbackLabel="All Pals" />
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rise-in">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex gap-2 items-center flex-wrap text-sm">
      <span className="text-gray-500 dark:text-gray-400 w-20 shrink-0">{label}</span>
      {items.length
        ? items.map(x => <ElementBadge key={x} element={x} />)
        : <span className="text-gray-400">Nothing</span>}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}
