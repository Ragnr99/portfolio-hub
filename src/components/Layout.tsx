import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Github, Linkedin, Search, ChevronRight } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { PRIMARY_NAV, activeNavPath, breadcrumbFor } from '../lib/nav'
import CommandPalette from './CommandPalette'

interface LayoutProps {
  children: React.ReactNode
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const active = activeNavPath(location.pathname)
  const crumbs = breadcrumbFor(location.pathname)

  // Router keeps the old scroll offset across navigations, so leaving the
  // Palpedia halfway down used to drop you into the middle of the next page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* Header: sticky, frosted */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
                <span className="text-white font-bold text-lg font-display">N</span>
              </div>
              <span className="hidden sm:block text-lg font-semibold font-display tracking-tight text-gray-900 dark:text-white">
                Nicholas Lubold
              </span>
            </Link>

            <nav className="hidden lg:flex space-x-1">
              {PRIMARY_NAV.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    active === path
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Search size={16} />
                <span className="hidden sm:block text-sm">Search</span>
                <kbd className="hidden md:block text-[10px] font-sans px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                  {isMac ? '⌘' : 'Ctrl '}K
                </kbd>
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {theme === 'light' ? (
                  <Moon size={20} className="text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun size={20} className="text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs: only once you're below the top level */}
        {crumbs.length > 0 && (
          <div className="border-t border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-1 text-sm overflow-x-auto">
              <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Home
              </Link>
              {crumbs.map((c, i) => (
                <span key={c.path} className="flex items-center gap-1 whitespace-nowrap">
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                  {i === crumbs.length - 1 ? (
                    <span className="font-medium text-gray-900 dark:text-white">{c.label}</span>
                  ) : (
                    <Link to={c.path} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Mobile / tablet nav: scrolls sideways rather than dropping items */}
      <nav className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {PRIMARY_NAV.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 py-2.5 px-5 ${
                active === path
                  ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon size={19} />
              <span className="text-[11px] whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Keyed on the path so each page cross-fades in instead of snapping */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div key={location.pathname} className="page-enter">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs font-display">N</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Nicholas Lubold · builds tools, games, and the occasional news reader
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Ragnr99"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com/in/nicholas-lubold"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          <p className="text-center sm:text-left text-xs text-gray-400 dark:text-gray-600 mt-4">
            © {new Date().getFullYear()} Nicholas Lubold · nicholaslubold.com · press{' '}
            <kbd className="px-1 py-0.5 rounded border border-gray-300 dark:border-gray-700 font-sans">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-1 py-0.5 rounded border border-gray-300 dark:border-gray-700 font-sans">K</kbd>{' '}
            to jump anywhere
          </p>
        </div>
      </footer>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
