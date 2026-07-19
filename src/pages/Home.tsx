import { Link } from 'react-router-dom'
import { Newspaper, Gamepad2, Briefcase, ArrowRight, Github, Linkedin } from 'lucide-react'

const FEATURED = [
  {
    title: 'Daybreak',
    description: 'A calm news reader that shows every story\'s political lean, tracks your media diet, and follows the markets.',
    icon: Newspaper,
    path: '/daybreak',
    accent: 'from-orange-500 via-amber-400 to-rose-500',
    tint: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300',
  },
  {
    title: 'The Arcade',
    description: 'Tetris, Breakout, Flappy, and three more classics, hand-built on raw canvas with zero libraries.',
    icon: Gamepad2,
    path: '/games',
    accent: 'from-fuchsia-500 via-purple-500 to-cyan-400',
    tint: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300',
  },
  {
    title: 'All Projects',
    description: 'The full list: what each thing is, how it\'s built, and where the code lives.',
    icon: Briefcase,
    path: '/projects',
    accent: 'from-indigo-500 via-sky-400 to-cyan-400',
    tint: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
  },
]

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl px-6 py-24 md:py-32 text-center">
        {/* ambient gradient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-400/30 dark:bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-cyan-400/30 dark:bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-fuchsia-400/20 dark:bg-fuchsia-600/10 blur-3xl" />

        <div className="relative max-w-3xl mx-auto space-y-7">
          <p className="font-display text-sm tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-400 animate-fade-up">
            Nicholas Lubold
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white animate-fade-up">
            I build things{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
              that actually ship.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-fade-up-slow">
            Manager at Sheetz with a serious interest in tech. Passionate about data analytics,
            automation, and building tools that solve real problems.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2 animate-fade-up-slow">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
            >
              See my work <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/Ragnr99"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-white dark:hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
            >
              <Github size={18} /> GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/nicholas-lubold"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-white dark:hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
            >
              <Linkedin size={18} /> LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto w-full">
        <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Start here
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10">
          The stuff worth clicking, up front.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURED.map((f) => {
            const Icon = f.icon
            return (
              <Link
                key={f.path}
                to={f.path}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`h-1.5 bg-gradient-to-r ${f.accent}`} />
                <div className="p-7">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.tint} group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">
                    {f.description}
                  </p>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                    Explore <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Skills */}
      <section className="max-w-6xl mx-auto w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-10">
        <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-8">
          What I work with
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 dark:text-gray-500 mb-4">Development</h3>
            <div className="flex flex-wrap gap-2">
              {['Python', 'TypeScript', 'React', 'Node.js', 'TailwindCSS', 'SQLite', 'Git'].map((skill) => (
                <span key={skill} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 dark:text-gray-500 mb-4">Operations & Analytics</h3>
            <div className="flex flex-wrap gap-2">
              {['Data Analysis', 'Excel/Sheets', 'P&L Management', 'Team Leadership', 'Process Optimization'].map((skill) => (
                <span key={skill} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section - intentionally empty for now; content TBD */}
    </div>
  )
}
