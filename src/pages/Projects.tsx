import { Link } from 'react-router-dom'
import { ArrowRight, Github } from 'lucide-react'
import { PROJECTS } from '../lib/projects'


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
