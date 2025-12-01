import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, Newspaper, Briefcase, Gamepad2, Globe, Moon, Sun, FolderOpen, Shapes } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/stocks', label: 'Stock Tracker', icon: TrendingUp },
    { path: '/news', label: 'News Curator', icon: Newspaper },
    { path: '/projects', label: 'Projects', icon: Briefcase },
    { path: '/games', label: 'Games', icon: Gamepad2 },
    { path: '/geometry', label: 'Geometry', icon: Shapes },
    { path: '/switch', label: 'Switch', icon: Gamepad2 },
    { path: '/browser', label: 'Browser', icon: Globe },
    { path: '/files', label: 'Files', icon: FolderOpen },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Nicholas Portfolio</span>
            </Link>

            <div className="flex items-center gap-4">
              <nav className="hidden md:flex space-x-1">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === path
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                  </Link>
                ))}
              </nav>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
      <nav className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-around">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center py-3 px-4 flex-1 ${
                location.pathname === path
                  ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} Nicholas. Built with React & TypeScript.
          </p>
        </div>
      </footer>
    </div>
  )
}
