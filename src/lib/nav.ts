/**
 * Navigation, derived from the project registry.
 *
 * The nav used to be a second list of projects, which meant it grew with every
 * project and duplicated the catalogue page. It is now purely structural:
 *
 *   Home    the landing page
 *   Work    the one catalogue of everything
 *   Search  reaches any page, tool or Pal directly
 *
 * Three items, fixed forever. A new project shows up in the catalogue and in
 * search without the nav changing at all.
 */

import { Home, Briefcase, type LucideIcon } from 'lucide-react'
import { PROJECTS } from './projects'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  hint: string
  keywords?: string[]
}

/** The whole top-level nav. Deliberately not a list of projects. */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: Home, hint: 'Start here' },
  {
    path: '/projects', label: 'Work', icon: Briefcase,
    hint: 'Everything I have built',
    keywords: ['projects', 'portfolio', 'all'],
  },
]

/**
 * Everything search can jump to: the two nav pages, every project, and every
 * tool inside a project. Built from the registry, so it can't fall behind.
 */
export const SEARCHABLE: NavItem[] = [
  ...NAV_ITEMS,
  ...PROJECTS.flatMap(p => {
    const entries: NavItem[] = []
    if (p.demoUrl) {
      entries.push({
        path: p.demoUrl,
        label: p.title,
        icon: p.icon,
        hint: p.description,
        keywords: p.keywords,
      })
    }
    for (const t of p.tools ?? []) {
      entries.push({
        path: t.path,
        label: t.label,
        icon: t.icon,
        hint: t.hint,
        // fold in the parent's terms so "palworld" finds the Palpedia
        keywords: [...(t.keywords ?? []), ...(p.keywords ?? []), p.title],
      })
    }
    return entries
  }),
]

/** Deduped by path, longest label wins ties, for breadcrumb lookups. */
const BY_PATH = new Map(SEARCHABLE.map(i => [i.path, i]))

/**
 * Which nav item owns the current URL. Everything below the top level lives
 * under Work, so a project page highlights Work rather than nothing.
 */
export function activeNavPath(pathname: string): string | null {
  if (pathname === '/') return '/'
  return '/projects'
}

/**
 * Trail from the root down to `pathname`: Work > Palworld Tools > Palpedia.
 * Gives deep pages a real way back up now that they have no top-level tab.
 */
export function breadcrumbFor(pathname: string): NavItem[] {
  if (pathname === '/' || pathname === '/projects') return []

  const trail: NavItem[] = [BY_PATH.get('/projects')!]
  const owner = PROJECTS.find(p => p.demoUrl && pathname.startsWith(p.demoUrl))
  if (owner?.demoUrl) {
    trail.push({
      path: owner.demoUrl, label: owner.title, icon: owner.icon, hint: owner.description,
    })
    const tool = owner.tools?.find(t => pathname === t.path)
    if (tool) {
      trail.push({ path: tool.path, label: tool.label, icon: tool.icon, hint: tool.hint })
    }
  }
  return trail
}
