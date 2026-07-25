import { ExternalLink, Github, Map } from 'lucide-react'

// The interactive map is a self-contained Leaflet app, built from the
// palworld-map repo and hosted here under /public/palworld-app (deliberately a
// different path from this /palworld route, so a direct load or refresh doesn't
// hit the static map index instead of this page). It runs live inside the
// iframe so the demo is real, not a screenshot.
const MAP_URL = `${import.meta.env.BASE_URL}palworld-app/index.html`

export default function Palworld() {
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
              Live interactive map of the Palpagos Islands — ~13,400 markers, per-Pal spawns, search and filters.
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

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Toggle layers on the left, pick a Pal to see its day/night spawn points, search by name, or filter by base game
        vs DLC. Tip: use <span className="font-medium">Open full screen</span> for more room.
      </p>
    </div>
  )
}
