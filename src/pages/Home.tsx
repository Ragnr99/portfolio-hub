import { Link } from 'react-router-dom'
import { TrendingUp, Newspaper, Briefcase, ArrowRight } from 'lucide-react'

export default function Home() {
  const features = [
    {
      title: 'Stock Tracker',
      description: 'Track real-time stock prices and manage a simulated portfolio with live market data.',
      icon: TrendingUp,
      path: '/stocks',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    {
      title: 'News Curator',
      description: 'Stay informed with curated news feeds from top sources across multiple categories.',
      icon: Newspaper,
      path: '/news',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    {
      title: 'Projects',
      description: 'Explore my coding projects, analytics dashboards, and technical articles.',
      icon: Briefcase,
      path: '/projects',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    },
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-block">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-5xl">N</span>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Welcome to My Portfolio
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Kitchen Manager at Sheetz transitioning to tech. Passionate about data analytics,
          automation, and building tools that solve real problems.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <a
            href="https://www.linkedin.com/in/nicholas-lubold"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/Ragnr99"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">About Me</h2>
        <div className="prose prose-lg text-gray-600 dark:text-gray-300">
          <p>
            CS degree from Penn State. Took a job at Sheetz after graduation and found I genuinely
            enjoy the management side of things. Still want to end up in tech eventually, just taking
            a different path to get there.
          </p>
          <p className="mt-4">
            This is stuff I work on outside of work. Analytics, automation, some web projects.
            Keeps me sharp.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Explore Tools & Projects</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                key={feature.path}
                to={feature.path}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow group"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:gap-2 transition-all">
                  <span>Explore</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Skills Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Technical Skills</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Development</h3>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Python', 'Node.js', 'TailwindCSS'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Operations & Analytics</h3>
            <div className="flex flex-wrap gap-2">
              {['Data Analysis', 'Excel/Sheets', 'P&L Management', 'Team Leadership', 'Process Optimization'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
