/**
 * The single registry of everything on this site.
 *
 * Home, the Projects catalogue, the Palworld hub, the breadcrumbs and the
 * search palette all read from here. They each used to carry their own copy of
 * this list, which is how the nav ended up advertising 2 of 10 pages, the
 * Projects grid ended up pointing at a route that had moved, and the same six
 * projects ended up typed out in four different files.
 *
 * Adding a project means adding one entry here. Nothing else needs touching:
 * it shows up in the catalogue, in search, and in breadcrumbs automatically.
 */

import {
  Newspaper, Gamepad2, Swords, BookOpen, Map, Code, Egg, Network,
  type LucideIcon,
} from 'lucide-react'

/** A page that lives inside a project, e.g. the Palpedia inside Palworld Tools. */
export interface ProjectTool {
  path: string
  label: string
  icon: LucideIcon
  hint: string
  keywords?: string[]
}

export interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  tags: string[]
  icon: LucideIcon
  accent: string          // tailwind gradient for the banner
  iconTint: string
  demoUrl?: string        // in-app route
  demoLabel?: string
  githubUrl?: string
  status: 'Beta' | 'In Development'
  /** Surfaced on the home page. */
  featured?: boolean
  /** Sub-pages, which the project's own hub renders and search indexes. */
  tools?: ProjectTool[]
  /** Extra search terms. */
  keywords?: string[]
}

export const PROJECTS: Project[] = [
  {
    id: 'daybreak',
    tools: [
      {
        path: '/daybreak/clustering', label: 'Finding blindspots without AI', icon: Network,
        hint: 'How Daybreak groups 1,500 headlines into stories in 22 milliseconds',
        keywords: ['clustering', 'tf-idf', 'union find', 'algorithm', 'write-up', 'how it works'],
      },
    ],
    keywords: ['news','reader','bias','blindspot','rss','spectrum'],
    featured: true,
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
    id: 'damage-calc',
    keywords: ['pokemon','damage','battle','smogon','calculator'],
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
    keywords: ['pokemon','dex','stats','moves','evolution','pokedex'],
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
    id: 'palworld-tools',
    tools: [
      {
        path: '/palworld/palpedia', label: 'Palpedia', icon: BookOpen,
        hint: 'All 288 Pals, stats and work suitability',
        keywords: ['dex', 'stats', 'element', 'type', 'work', 'partner skill', 'drops'],
      },
      {
        path: '/palworld/breeder', label: 'Pal Breeder', icon: Egg,
        hint: 'Parent pairs and breeding results',
        keywords: ['breed', 'egg', 'combo', 'child', 'parents'],
      },
      {
        path: '/palworld/map', label: 'Interactive Map', icon: Map,
        hint: 'Spawns, chests, dungeons and fast travel',
        keywords: ['spawn', 'chest', 'dungeon', 'location', 'effigy'],
      },
    ],
    keywords: ['pal','palworld','breeding','dex','map','spawn'],
    featured: true,
    title: 'Palworld Tools',
    description: 'A Palpedia, a breeding calculator, and an interactive map',
    longDescription:
      'Three tools over the game\'s own data. The Palpedia covers all 288 Pals with combat stats, work suitability, partner skills, drops and type matchups. The breeder works both directions: two parents to a child, or a target Pal to every parent pair that makes it. It ships the game\'s entire 44,850-pair breeding table rather than a formula, because the widely repeated "average the two CombiRanks" rule only reproduces about 69% of real results. The map is a Leaflet build of the Palpagos Islands with ~13,400 markers across 13 toggleable layers, per-Pal day/night spawn clouds, and a coordinate transform reverse-engineered from the game files. There is also a desktop overlay that pins the element chart over the game and hides itself whenever a menu is open.',
    tags: ['React', 'TypeScript', 'Leaflet', 'Datamining', 'Python'],
    icon: Map,
    accent: 'from-green-500 via-lime-400 to-emerald-500',
    iconTint: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300',
    demoUrl: '/palworld',
    demoLabel: 'Open the tools',
    githubUrl: 'https://github.com/Ragnr99/palworld-map',
    status: 'Beta',
  },
  {
    id: 'portfolio-hub',
    keywords: ['site','website','react','portfolio','source'],
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
  },  {
    id: 'arcade',
    keywords: ['game','snake','tetris','pacman','breakout','asteroids','flappy'],
    featured: true,
    title: 'The Arcade',
    description: 'Seven games: six arcade classics and a deck-building roguelike',
    longDescription:
      'Seven games on one cabinet. Six are arcade classics in TypeScript on raw HTML5 canvas, with real game-loop architecture, collision, and local high scores: Tetris, Breakout, Flappy, Asteroids, Snake and Pac-Man. The seventh is Deckfall, a deck-building roguelike, and the opposite kind of game: a branching five-tier map, 16 cards with upgrades, relics, status effects, and enemies whose next move is always telegraphed on a fixed cycle, so every fight is solvable rather than reflexive. Its rules are a pure engine with no rendering in it, which meant the balance could be tested headlessly: 9,000 simulated runs, zero crashes or soft-locks, tuned until random play wins ~15% and competent play wins ~50%.',
    tags: ['TypeScript', 'HTML5 Canvas', 'Game Loops', 'Roguelike', 'Simulation-tested'],
    icon: Gamepad2,
    accent: 'from-fuchsia-500 via-purple-500 to-cyan-400',
    iconTint: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300',
    demoUrl: '/games',
    demoLabel: 'Enter the Arcade',
    githubUrl: 'https://github.com/Ragnr99/portfolio-hub',
    status: 'Beta',
  },
]
