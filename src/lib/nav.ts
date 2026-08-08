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
 * Strip the query and any trailing slash, so a url can be compared to a
 * registry path.
 *
 * Trailing slashes aren't ours to choose. Every route is prerendered to
 * `<path>/index.html`, so GitHub Pages 301s `/palworld/breeder` to
 * `/palworld/breeder/` - which means a *shared link* arrives with a slash that
 * in-app navigation never produces. Everything below matches paths exactly, so
 * without this a deep link silently loses its last breadcrumb while the same
 * page reached by clicking gets it right.
 */
function canonical(url: string): string {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return path || '/'
}

/**
 * Human name for a url, query string and all. Used by the "back" link on detail
 * pages so it can say where it's actually returning you to rather than guessing
 * at a parent: reaching a Pal from the Breeder should go back to the Breeder,
 * with your search still in it.
 */
export function labelFor(url: string): string | null {
  return BY_PATH.get(canonical(url))?.label ?? null
}

/**
 * Which nav item owns the current URL. Everything below the top level lives
 * under Work, so a project page highlights Work rather than nothing.
 */
export function activeNavPath(pathname: string): string | null {
  if (canonical(pathname) === '/') return '/'
  return '/projects'
}

/**
 * Trail from the root down to `pathname`: Work > Palworld Tools > Palpedia.
 * Gives deep pages a real way back up now that they have no top-level tab.
 */
export function breadcrumbFor(pathname: string): NavItem[] {
  const here = canonical(pathname)
  if (here === '/' || here === '/projects') return []

  const trail: NavItem[] = [BY_PATH.get('/projects')!]
  // Longest demoUrl first, so a project nested under another's prefix can't be
  // claimed by the shorter one. Segment-aware, so /palworldly never matches.
  const owner = [...PROJECTS]
    .filter(p => p.demoUrl && (here === p.demoUrl || here.startsWith(`${p.demoUrl}/`)))
    .sort((a, b) => b.demoUrl!.length - a.demoUrl!.length)[0]
  if (owner?.demoUrl) {
    trail.push({
      path: owner.demoUrl, label: owner.title, icon: owner.icon, hint: owner.description,
    })
    // /palworld/pal/:slug is a leaf of the Palpedia rather than a tool of its own
    const tool = owner.tools?.find(t => here === t.path)
      ?? (here.startsWith('/palworld/pal/')
          ? owner.tools?.find(t => t.path.endsWith('/palpedia'))
          : undefined)
    if (tool) {
      trail.push({ path: tool.path, label: tool.label, icon: tool.icon, hint: tool.hint })
    }
  }
  return trail
}
