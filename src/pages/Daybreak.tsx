import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Sunrise } from 'lucide-react'

// The Daybreak news reader, embedded from its local web server.
// Start it with:  cd C:\Users\Nicholas\PycharmProjects\daily-news && py -3.10 webapi.py
const DAYBREAK_URL = 'http://127.0.0.1:8899/'

// The live embed only works where the Daybreak server runs (Nicholas's PC);
// public visitors get the showcase instead.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname)

export default function Daybreak() {
  const [status, setStatus] = useState<'checking' | 'up' | 'down' | 'remote'>(
    IS_LOCAL ? 'checking' : 'remote'
  )

  const check = useCallback(() => {
    if (!IS_LOCAL) return
    setStatus('checking')
    fetch(DAYBREAK_URL, { mode: 'no-cors' })
      .then(() => setStatus('up'))
      .catch(() => setStatus('down'))
  }, [])

  useEffect(() => {
    check()
  }, [check])

  if (status === 'remote') {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-6">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <Sunrise size={32} className="text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Daybreak</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          A calm, private desktop news reader. ~800 articles a day from ~45 sources across
          the political spectrum, every story color-coded by lean, full article text in-app,
          blindspot detection, and a weekly media-diet balance score. No ads, no account,
          no tracking — everything runs on-device.
        </p>
        <p className="text-gray-500 dark:text-gray-400">
          The live demo runs on my machine, so this page is just the pitch. The code is real though:
        </p>
        <a
          href="https://github.com/Ragnr99/daily-news"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
        >
          View Daybreak on GitHub
        </a>
      </div>
    )
  }

  if (status !== 'up') {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-6">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <Sunrise size={32} className="text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Daybreak</h1>
        {status === 'checking' ? (
          <p className="text-gray-600 dark:text-gray-300">Looking for the Daybreak server…</p>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-300">
              The Daybreak server isn't running. Start it, then hit retry:
            </p>
            <code className="block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-sm">
              cd C:\Users\Nicholas\PycharmProjects\daily-news && py -3.10 webapi.py
            </code>
            <button
              onClick={check}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <RefreshCw size={18} /> Retry
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <iframe
      src={DAYBREAK_URL}
      title="Daybreak news reader"
      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-[#F4F1EA]"
      style={{ height: 'calc(100vh - 9rem)' }}
    />
  )
}
