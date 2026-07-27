import { Link } from 'react-router-dom'
import { Map, BookOpen, Egg, Monitor, Github, ArrowRight } from 'lucide-react'
import { usePalworldData } from '../hooks/usePalworldData'

const TOOLS = [
  {
    to: '/palworld/palpedia',
    icon: BookOpen,
    title: 'Palpedia',
    blurb: 'Every Pal with real stats, work suitability, partner skills and drops. Filter by element, sort by whatever you actually care about.',
    tint: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
  },
  {
    to: '/palworld/breeder',
    icon: Egg,
    title: 'Breeder',
    blurb: 'Pick two parents to see the child, or pick a target and get every pair that makes it. Straight from the game\'s own breeding table.',
    tint: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300',
  },
  {
    to: '/palworld/map',
    icon: Map,
    title: 'Interactive Map',
    blurb: 'The Palpagos Islands with ~13,400 markers: per-Pal day and night spawns, chests, dungeons, effigies and fast travel.',
    tint: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300',
  },
]

export default function Palworld() {
  const { data, loading } = usePalworldData()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-emerald-500 text-white">
          <Egg size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Palworld Tools</h1>
          <p className="text-gray-500 dark:text-gray-400">
            A small suite I keep adding to while I play. Data comes from the game's own tables, not from guesswork.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ to, icon: Icon, title, blurb, tint }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tint}`}>
              <Icon size={24} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              {title}
              <ArrowRight size={16} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{blurb}</p>
          </Link>
        ))}

        <a
          href="https://github.com/Ragnr99/palworld-overlay"
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-6 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
            <Monitor size={24} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            Type Chart Overlay <Github size={15} className="text-gray-400" />
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Desktop app, not a web page. A click-through element chart pinned over the game that hides itself whenever a
            menu is open.
          </p>
        </a>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white">Where the data comes from</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Stats and the full breeding table are extracted from the game files. Element types, partner skills and drops
          are parsed from the Palworld wiki. The breeding table ships whole rather than as a formula, because the
          widely-repeated "average the two ranks" rule only reproduces about 69% of real results.
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
          {loading
            ? 'Loading dataset…'
            : data
              ? `${data.pals.length} Pals · 44,850 breeding pairs · built ${new Date(data.generatedAt).toLocaleDateString()}`
              : 'Dataset unavailable.'}
        </p>
      </div>
    </div>
  )
}
