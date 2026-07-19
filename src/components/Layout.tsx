import { Link, useLocation } from 'react-router-dom'
import { Home, Newspaper, Briefcase, Gamepad2, Moon, Sun, BookOpen, Github, Linkedin } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/daybreak', label: 'Daybreak', icon: Newspaper },
    { path: '/games', label: 'Arcade', icon: Gamepad2 },
    { path: '/pokedex', label: 'Pokédex', icon: BookOpen },
    { path: '/projects', label: 'Projects', icon: Briefcase },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* Header: sticky, frosted */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
                <span className="text-white font-bold text-lg font-display">N</span>
              </div>
              <span className="text-lg font-semibold font-display tracking-tight text-gray-900 dark:text-white">
                Nicholas Lubold
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <nav className="hidden md:flex space-x-1">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === path
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                  </Link>
                ))}
              </nav>

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
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-around">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center py-3 px-4 flex-1 ${
                location.pathname === path
                  ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {children}
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
            © {new Date().getFullYear()} Nicholas Lubold. Hand-built with React, TypeScript, and stubbornness.
          </p>
        </div>
      </footer>
    </div>
  )
}
