/**
 * Every destination on the site, in one place.
 *
 * The header, the mobile bar and the command palette all read from here. They
 * used to each carry their own list, which is how the nav ended up showing 2 of
 * 10 pages and the Projects grid ended up pointing at a route that had moved.
 */

import {
  Home, Briefcase, Newspaper, Gamepad2, Calculator, BookOpen, Egg, Map, Boxes,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Shown in the command palette under the title. */
  hint: string
  /** Extra search terms so "type chart" finds the Palpedia, etc. */
  keywords?: string[]
  /** Grouping for the palette, and which header item owns this route. */
  section?: string
  /** Show in the primary header nav. */
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: Home, hint: 'Start here', primary: true },
  {
    path: '/projects', label: 'Projects', icon: Briefcase, primary: true,
    hint: 'Everything I have built', keywords: ['work', 'portfolio'],
  },
  {
    path: '/palworld', label: 'Palworld', icon: Boxes, primary: true, section: 'Palworld',
    hint: 'Palpedia, breeding and the map', keywords: ['pal', 'game tools'],
  },
  {
    path: '/palworld/palpedia', label: 'Palpedia', icon: BookOpen, section: 'Palworld',
    hint: 'All 288 Pals, stats and work suitability',
    keywords: ['pal', 'dex', 'stats', 'element', 'type', 'work', 'partner skill'],
  },
  {
    path: '/palworld/breeder', label: 'Pal Breeder', icon: Egg, section: 'Palworld',
    hint: 'Parent pairs and breeding results',
    keywords: ['pal', 'breed', 'egg', 'combo', 'child', 'parents'],
  },
  {
    path: '/palworld/map', label: 'Palworld Map', icon: Map, section: 'Palworld',
    hint: 'Spawns, chests, dungeons and fast travel',
    keywords: ['pal', 'spawn', 'chest', 'dungeon', 'location'],
  },
  {
    path: '/daybreak', label: 'Daybreak', icon: Newspaper, primary: true,
    hint: 'News reader across the political spectrum',
    keywords: ['news', 'reader', 'bias', 'blindspot'],
  },
  {
    path: '/pokedex', label: 'Pokédex', icon: BookOpen, primary: true,
    hint: 'All 1,025 Pokémon', keywords: ['pokemon', 'dex', 'stats'],
  },
  {
    path: '/calc', label: 'Damage Calculator', icon: Calculator,
    hint: 'Pokémon battle damage maths', keywords: ['pokemon', 'damage', 'battle', 'smogon'],
  },
  {
    path: '/games', label: 'The Arcade', icon: Gamepad2, primary: true,
    hint: 'Snake, Tetris, Pac-Man and friends',
    keywords: ['game', 'arcade', 'snake', 'tetris', 'pacman', 'breakout', 'asteroids', 'flappy'],
  },
]

export const PRIMARY_NAV = NAV_ITEMS.filter(i => i.primary)

/**
 * Which nav item owns the current URL. Prefix-matched so /palworld/breeder
 * still highlights Palworld, with "/" special-cased so it doesn't match all.
 */
export function activeNavPath(pathname: string): string | null {
  const matches = NAV_ITEMS
    .filter(i => i.path === '/' ? pathname === '/' : pathname.startsWith(i.path))
    .sort((a, b) => b.path.length - a.path.length)
  return matches[0]?.path ?? null
}

/** Trail from the site root down to `pathname`, for breadcrumbs. */
export function breadcrumbFor(pathname: string): NavItem[] {
  if (pathname === '/') return []
  return NAV_ITEMS
    .filter(i => i.path !== '/' && pathname.startsWith(i.path))
    .sort((a, b) => a.path.length - b.path.length)
}
