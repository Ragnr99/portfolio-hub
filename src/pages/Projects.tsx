import { ExternalLink, Github, Code, BarChart3, Newspaper } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  tags: string[]
  icon: React.ComponentType<{ size?: number; className?: string }>
  demoUrl?: string
  githubUrl?: string
  status: 'completed' | 'in-progress' | 'planned'
}

export default function Projects() {
  const projects: Project[] = [
    {
      id: 'stock-tracker',
      title: 'Stock Portfolio Tracker',
      description: 'Real-time stock market tracking with simulated trading capabilities',
      longDescription: 'A full-featured stock tracking application that allows users to monitor real-time market data, create watchlists, and simulate portfolio trades. Features interactive charts, portfolio analytics, and gain/loss tracking.',
      tags: ['React', 'TypeScript', 'Recharts', 'Financial APIs'],
      icon: BarChart3,
      demoUrl: '/stocks',
      status: 'completed',
    },
    {
      id: 'news-curator',
      title: 'News Curator Platform',
      description: 'Personalized news aggregation with category-based filtering',
      longDescription: 'A curated news platform that aggregates headlines from multiple sources, allowing users to filter by category and search for specific topics. Designed to provide a customized news reading experience similar to Ground News.',
      tags: ['React', 'News API', 'TailwindCSS', 'TypeScript'],
      icon: Newspaper,
      demoUrl: '/news',
      status: 'completed',
    },
    {
      id: 'ops-dashboard',
      title: 'Operational Analytics Dashboard',
      description: 'Data-driven management tool for retail/food service operations',
      longDescription: 'An executive-level analytics dashboard designed for retail and food service management. Tracks sales trends, labor metrics, inventory costs, and operational KPIs. Built to demonstrate data-driven decision making in operations management.',
      tags: ['React', 'Analytics', 'Data Visualization', 'Operations'],
      icon: Code,
      status: 'planned',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'planned':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in-progress':
        return 'In Progress'
      case 'planned':
        return 'Planned'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
        <p className="text-gray-600">
          A showcase of my coding projects, tools, and technical experiments
        </p>
      </div>

      {/* Project Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Projects</span>
            <Code className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Completed</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {projects.filter(p => p.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {projects.filter(p => p.status === 'in-progress').length}
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        {projects.map((project) => {
          const Icon = project.icon
          return (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {project.description}
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 leading-relaxed">
                    {project.longDescription}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ExternalLink size={18} />
                      View Demo
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                    >
                      <Github size={18} />
                      View Code
                    </a>
                  )}
                  {project.status === 'planned' && (
                    <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Articles Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technical Articles</h2>
        <p className="text-gray-600 mb-6">
          Coming soon: In-depth articles about operations management, data analytics, and software development.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Data-Driven Operations Management
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              How I used analytics to improve efficiency and reduce costs in retail food service
            </p>
            <span className="text-xs text-gray-500">Draft in progress</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Building Real-Time Dashboards with React
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              A technical guide to creating interactive data visualizations for business intelligence
            </p>
            <span className="text-xs text-gray-500">Planned</span>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Interested in Collaboration?</h2>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          I'm always excited to work on new projects, especially those involving data analytics,
          automation, or operational optimization.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="mailto:your.email@example.com"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Get in Touch
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors"
          >
            Connect on LinkedIn
          </a>
        </div>
      </div>
    </div>
  )
}
