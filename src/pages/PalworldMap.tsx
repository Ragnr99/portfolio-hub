
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, Github, Map } from 'lucide-react'

// The interactive map is a self-contained Leaflet app, built from the
// palworld-map repo and hosted here under /public/palworld-app (deliberately a
// different path from this /palworld/map route, so a direct load or refresh
// doesn't hit the static map index instead of this page). It runs live inside
// the iframe so the demo is real, not a screenshot.
const MAP_BASE = `${import.meta.env.BASE_URL}palworld-app/index.html`

export default function PalworldMap() {
  // ?pal= arrives from a Pal page's "Where to find" button and is handed
  // straight to the embedded app, which preselects that Pal's spawns.
  const [params] = useSearchParams()
  const pal = params.get('pal')
  const MAP_URL = pal ? `${MAP_BASE}?pal=${encodeURIComponent(pal)}` : MAP_BASE

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300">
            <Map size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Palworld Map</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Live interactive map — Palpagos and the World Tree, 13,842 markers, per-Pal spawns, search and filters.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-85 transition-opacity font-medium"
          >
            Open full screen <ExternalLink size={16} />
          </a>
          <a
            href="https://github.com/Ragnr99/palworld-map"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <Github size={16} /> Code
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-gray-900">
        <iframe
          src={MAP_URL}
          title="Palworld interactive map"
          className="w-full h-[78vh] block border-0"
          loading="lazy"
        />
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          Switch between Palpagos and the World Tree at the top left, toggle layers, pick a Pal to see its day/night
          spawn points, or filter by base game vs DLC. Tip: use{' '}
          <span className="font-medium">Open full screen</span> for more room.
        </p>
        <p>
          Both maps carry their own markers: 13,463 across 14 layers on Palpagos, and the World Tree's own 379
          across 13 — its 47 effigies, 38 chests, 80 Paloxite nodes and the rest. The tree is a separate
          coordinate space, not a corner of the island, so it gets its own transform.
        </p>
        <p>
          <span className="font-medium">Journal Notes</span> marks all 64 readable notes, 55 on Palpagos split into
          the ten diaries and journals they belong to and nine more inside the tree, and each one links to its text.
          Mark them collected as you read them.
        </p>
        <p>
          Map imagery and all marker data come from{' '}
          <a href="https://paldb.cc" target="_blank" rel="noopener noreferrer"
             className="underline hover:text-gray-900 dark:hover:text-white">paldb.cc</a>;
          the front end is mine. Pal art from the{' '}
          <a href="https://palworld.fandom.com" target="_blank" rel="noopener noreferrer"
             className="underline hover:text-gray-900 dark:hover:text-white">Palworld Wiki</a>.
          Unofficial fan project, not affiliated with Pocketpair.
        </p>
      </div>
    </div>
  )
}
