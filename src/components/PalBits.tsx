/** Small shared pieces for the Palworld pages. */

import { useState } from 'react'
import { ELEMENT_COLORS, WORK_LABELS, palImageSlug, type Pal } from '../hooks/usePalworldData'

/**
 * Pal portrait, falling back to an element-tinted monogram.
 *
 * Sources are 128px WebP (~5KB each, 1.6MB for the roster) rather than the
 * wiki's 512px PNGs, which would have been 19MB. Everything renders at 64px or
 * under, so 128 still has 2x headroom.
 */
export function PalPortrait({ pal, size = 48 }: { pal: Pal; size?: number }) {
  const [failed, setFailed] = useState(false)
  const color = ELEMENT_COLORS[pal.elements[0]] ?? '#8b8b8b'
  const box = { width: size, height: size }

  if (failed) {
    return (
      <div
        style={{ ...box, backgroundColor: `${color}24`, color }}
        className="shrink-0 rounded-lg flex items-center justify-center font-bold select-none"
        aria-label={pal.name}
      >
        <span style={{ fontSize: size * 0.36 }}>{pal.name.slice(0, 2)}</span>
      </div>
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}pal-images/${palImageSlug(pal.internal)}.webp`}
      alt={pal.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ ...box, backgroundColor: `${color}14` }}
      className="shrink-0 rounded-lg object-cover"
    />
  )
}

export function ElementBadge({ element, compact = false }: { element: string; compact?: boolean }) {
  const c = ELEMENT_COLORS[element] ?? '#8b8b8b'
  return (
    <span
      title={element}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{ backgroundColor: `${c}1f`, color: c, borderColor: `${c}66` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
      {!compact && element}
    </span>
  )
}

/** Two-tone stripe of a Pal's elements, used as a card accent. */
export function ElementStripe({ elements }: { elements: string[] }) {
  const colors = elements.length ? elements.map(e => ELEMENT_COLORS[e] ?? '#8b8b8b') : ['#8b8b8b']
  const background = colors.length === 1
    ? colors[0]
    : `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`
  return <div className="h-1 w-full" style={{ background }} />
}

export function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full stat-fill"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/** The 12 work suitabilities, showing only the ones a Pal actually has. */
export function WorkGrid({ pal, workKeys }: { pal: Pal; workKeys: string[] }) {
  const has = workKeys
    .map((k, idx) => ({ key: k, level: pal.work[idx] ?? 0 }))
    .filter(w => w.level > 0)
    .sort((a, b) => b.level - a.level)

  if (!has.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No work suitabilities.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {has.map(({ key, level }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
        >
          {WORK_LABELS[key] ?? key}
          <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{level}</span>
        </span>
      ))}
    </div>
  )
}

export const RARITY_TIERS: Array<{ min: number; label: string; className: string }> = [
  { min: 10, label: 'Legendary', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { min: 8, label: 'Epic', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { min: 5, label: 'Rare', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { min: 1, label: 'Uncommon', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { min: 0, label: 'Common', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
]

export function rarityTier(rarity: number) {
  return RARITY_TIERS.find(t => rarity >= t.min) ?? RARITY_TIERS[RARITY_TIERS.length - 1]
}

export function RarityBadge({ rarity }: { rarity: number }) {
  const tier = rarityTier(rarity)
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tier.className}`}>
      {tier.label}
    </span>
  )
}

/** "#042" — variants share their base Pal's number, so mark them. */
export function DexNumber({ pal }: { pal: Pal }) {
  return (
    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
      #{String(pal.dex).padStart(3, '0')}{pal.variant && <span className="text-indigo-400">B</span>}
    </span>
  )
}
