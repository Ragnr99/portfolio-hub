import { Link } from 'react-router-dom'
import { ArrowRight, Github, Code, Newspaper, Gamepad2, Swords, BookOpen, Map } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  tags: string[]
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: string          // tailwind gradient for the banner
  iconTint: string
  demoUrl?: string        // in-app route
  demoLabel?: string
  githubUrl?: string
  status: 'Beta' | 'In Development'
}

const PROJECTS: Project[] = [
  {
    id: 'daybreak',
    title: 'Daybreak',
    description: 'A spectrum-aware news reader with media-diet tracking and live markets',
    longDescription:
      'A calm, private desktop news reader that pulls ~800 articles a day from ~45 sources across the political spectrum, color-codes every story by lean, and extracts full article text for in-app reading. Detects blindspots, groups the same story across left/center/right, scores your weekly reading balance, and tracks markets with interactive charts. Pure-text clustering on-device: no AI, no accounts, no tracking. Ships as a standalone Windows app with a 57-test suite behind it.',
    tags: ['Python', 'Story Clustering', 'RSS', 'Data Visualization', 'PyInstaller'],
    icon: Newspaper,
    accent: 'from-orange-500 via-amber-400 to-rose-500',
    iconTint: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300',
    demoUrl: '/daybreak',
    demoLabel: 'Try Daybreak',
    githubUrl: 'https://github.com/Ragnr99/daily-news',
    status: 'Beta',
  },
  {
    id: 'arcade',
    title: 'The Arcade',
    description: 'Six retro games on HTML5 Canvas with real game loops',
    longDescription:
      'Tetris, Breakout, Flappy, Asteroids, Snake, and Pac-Man, all running in TypeScript on raw HTML5 canvas. Real game-loop architecture (fixed-step updates over requestAnimationFrame), particle effects, 7-bag randomizers, wall kicks, and local high scores. No game engine involved.',
    tags: ['TypeScript', 'HTML5 Canvas', 'Game Loops', 'Zero Dependencies'],
    icon: Gamepad2,
    accent: 'from-fuchsia-500 via-purple-500 to-cyan-400',
    iconTint: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300',
    demoUrl: '/games',
    demoLabel: 'Enter the Arcade',
    githubUrl: 'https://github.com/Ragnr99/portfolio-hub',
    status: 'Beta',
  },
  {
    id: 'damage-calc',
    title: 'Damage Calculator',
    description: 'A comprehensive Gen 9 Pokémon damage calculator',
    longDescription:
      'Full competitive damage calculation: every ability, item, nature, EV spread, stat stage, weather, terrain, screen, Tera type, and crit, for all 1,400+ species and 900+ moves. Mechanics run on the MIT-licensed engine behind the official Showdown calculator, verified byte-identical against reference calcs, wrapped in a custom interface with instant recalculation as you tweak a set.',
    tags: ['TypeScript', 'React', '@smogon/calc', 'Competitive Pokémon'],
    icon: Swords,
    accent: 'from-emerald-500 via-teal-400 to-cyan-500',
    iconTint: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300',
    demoUrl: '/calc',
    demoLabel: 'Run a calc',
    githubUrl: 'https://github.com/Ragnr99/portfolio-hub',
    status: 'Beta',
  },
  {
    id: 'pokedex',
    title: 'Pokédex',
    description: 'A searchable Pokédex for every species',
    longDescription:
      'Every species loaded from a bundled data file for an instant grid, searched and filtered on the client. Open any Pokémon for its stats, typing, and full move list, with move details fetched and cached from PokéAPI on demand so the grid stays fast.',
    tags: ['React', 'TypeScript', 'PokéAPI', 'Data Caching'],
    icon: BookOpen,
    accent: 'from-red-500 via-rose-400 to-orange-500',
    iconTint: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
    demoUrl: '/pokedex',
    demoLabel: 'Open the Pokédex',
    githubUrl: 'https://github.com/Ragnr99/portfolio-hub',
    status: 'Beta',
  },
  {
    id: 'palworld-map',
    title: 'Palworld Map',
    description: 'An interactive map of the Palworld islands',
    longDescription:
      'A browser map of the Palworld islands built on Leaflet, with a data-driven layer system for Pal spawns, alphas, bosses, fast travel, chests, eggs, dungeons, ore, and more. Marker clustering keeps dense layers fast, popups carry per-marker detail, and a live readout converts the game\'s raw world coordinates as you move the mouse. The map engine and layers are in place; real marker data is being wired in now.',
    tags: ['JavaScript', 'Leaflet', 'Vite', 'Interactive Map'],
    icon: Map,
    accent: 'from-green-500 via-lime-400 to-emerald-500',
    iconTint: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300',
    githubUrl: 'https://github.com/Ragnr99/palworld-map',
    status: 'In Development',
  },
  {
    id: 'portfolio-hub',
    title: 'This Website',
    description: 'The site you are on right now',
    longDescription:
      'Single-page portfolio built with React, TypeScript, Vite, and TailwindCSS. Dark mode, the arcade, a full Pokédex, the damage calculator, and a screenshot showcase of the Daybreak reader. Deployed to GitHub Pages on a custom domain with a one-command build-and-ship script.',
    tags: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'GitHub Pages'],
    icon: Code,
    accent: 'from-blue-500 via-sky-400 to-indigo-500',
    iconTint: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
    githubUrl: 'https://github.com/Ragnr99/portfolio-hub',
    status: 'In Development',
  },
]

export default function Projects() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Projects</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Real projects in active development. Most of them you can try live right here.
        </p>
      </div>

      <div className="space-y-8">
        {PROJECTS.map((project) => {
          const Icon = project.icon
          return (
            <div
              key={project.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
                         overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
            >
              {/* accent banner */}
              <div className={`h-2 bg-gradient-to-r ${project.accent}`} />

              <div className="p-8">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${project.iconTint}`}>
                      <Icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400">{project.description}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                      project.status === 'Beta'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  {project.longDescription}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 flex-wrap">
                  {project.demoUrl && (
                    <Link
                      to={project.demoUrl}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900
                                 rounded-lg hover:opacity-85 transition-opacity font-medium"
                    >
                      {project.demoLabel || 'View Demo'} <ArrowRight size={16} />
                    </Link>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600
                                 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors font-medium"
                    >
                      <Github size={16} /> View Code
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400 mb-4">More on the way. Watch this space.</p>
        <a
          href="https://github.com/Ragnr99"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          <Github size={18} /> github.com/Ragnr99
        </a>
      </div>
    </div>
  )
}
