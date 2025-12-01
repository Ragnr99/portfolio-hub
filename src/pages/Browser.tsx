import { useState, useEffect } from 'react'
import { Globe, AlertCircle, Server, Zap, Play } from 'lucide-react'

export default function Browser() {
  const [url, setUrl] = useState('https://example.com')
  const [currentUrl, setCurrentUrl] = useState('https://example.com')
  const [useProxy, setUseProxy] = useState(false)
  const [embedMode, setEmbedMode] = useState<'iframe' | 'youtube' | 'reddit' | 'tiktok' | 'twitter' | null>(null)
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    checkProxyStatus()
  }, [])

  const checkProxyStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/proxy?url=https://example.com')
      setProxyStatus(response.ok ? 'online' : 'offline')
    } catch {
      setProxyStatus('offline')
    }
  }

  const detectEmbedType = (inputUrl: string): 'youtube' | 'reddit' | 'tiktok' | 'twitter' | 'iframe' => {
    // YouTube detection
    if (inputUrl.includes('youtube.com/watch') || inputUrl.includes('youtu.be/')) {
      return 'youtube'
    }
    // Reddit detection
    if (inputUrl.includes('reddit.com/r/')) {
      return 'reddit'
    }
    // TikTok detection
    if (inputUrl.includes('tiktok.com')) {
      return 'tiktok'
    }
    // Twitter detection
    if (inputUrl.includes('twitter.com') || inputUrl.includes('x.com')) {
      return 'twitter'
    }
    return 'iframe'
  }

  const getYouTubeEmbedUrl = (inputUrl: string): string => {
    // Extract video ID from various YouTube URL formats
    let videoId = ''

    if (inputUrl.includes('youtu.be/')) {
      videoId = inputUrl.split('youtu.be/')[1].split('?')[0]
    } else if (inputUrl.includes('youtube.com/watch')) {
      const urlParams = new URL(inputUrl).searchParams
      videoId = urlParams.get('v') || ''
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=0`
  }

  const getRedditEmbedUrl = (inputUrl: string): string => {
    // Convert reddit.com to old.reddit.com for better embedding
    return inputUrl.replace('www.reddit.com', 'old.reddit.com').replace('reddit.com', 'old.reddit.com')
  }

  const getTikTokEmbedUrl = (inputUrl: string): string => {
    // TikTok video ID extraction
    const videoId = inputUrl.split('/video/')[1]?.split('?')[0]
    if (videoId) {
      return `https://www.tiktok.com/embed/v2/${videoId}`
    }
    return inputUrl
  }

  const getTwitterEmbedUrl = (inputUrl: string): string => {
    // Twitter uses oembed API - we'll use nitter as alternative
    return inputUrl.replace('twitter.com', 'nitter.net').replace('x.com', 'nitter.net')
  }

  const handleLoad = () => {
    const embedType = detectEmbedType(url)
    setEmbedMode(embedType)

    switch (embedType) {
      case 'youtube':
        setCurrentUrl(getYouTubeEmbedUrl(url))
        break
      case 'reddit':
        if (useProxy && proxyStatus === 'online') {
          setCurrentUrl(`http://localhost:3001/proxy?url=${encodeURIComponent(getRedditEmbedUrl(url))}`)
        } else {
          setCurrentUrl(getRedditEmbedUrl(url))
        }
        break
      case 'tiktok':
        setCurrentUrl(getTikTokEmbedUrl(url))
        break
      case 'twitter':
        if (useProxy && proxyStatus === 'online') {
          setCurrentUrl(`http://localhost:3001/proxy?url=${encodeURIComponent(getTwitterEmbedUrl(url))}`)
        } else {
          setCurrentUrl(getTwitterEmbedUrl(url))
        }
        break
      default:
        if (useProxy && proxyStatus === 'online') {
          setCurrentUrl(`http://localhost:3001/proxy?url=${encodeURIComponent(url)}`)
        } else {
          setCurrentUrl(url)
        }
    }
  }

  const getSandboxAttributes = () => {
    if (embedMode === 'youtube' || embedMode === 'tiktok') {
      return "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
    }
    return "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Globe className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Universal Browser</h1>
            <p className="text-gray-600 dark:text-gray-300">YouTube, Reddit, TikTok, and any website</p>
          </div>
        </div>

        {/* Proxy Status Indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
          proxyStatus === 'online'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : proxyStatus === 'offline'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <Server size={18} className={
            proxyStatus === 'online'
              ? 'text-green-600 dark:text-green-400'
              : proxyStatus === 'offline'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          } />
          <span className={`text-sm font-medium ${
            proxyStatus === 'online'
              ? 'text-green-700 dark:text-green-300'
              : proxyStatus === 'offline'
              ? 'text-red-700 dark:text-red-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            Proxy: {proxyStatus === 'online' ? 'Online' : proxyStatus === 'offline' ? 'Offline' : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Proxy Server Offline Warning */}
      {proxyStatus === 'offline' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">Proxy Server Offline</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              For best results with blocked sites, start the proxy server:
            </p>
            <code className="block bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 px-3 py-2 rounded text-sm font-mono">
              npm run proxy
            </code>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              Run this in a new terminal while keeping the dev server running.
            </p>
          </div>
        </div>
      )}

      {/* URL Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter URL:
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or any URL"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoad()
            }}
          />
          <button
            onClick={handleLoad}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Play size={18} />
            Load
          </button>
        </div>

        {/* Proxy Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              disabled={proxyStatus !== 'online' || embedMode === 'youtube'}
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Zap size={16} className="text-blue-600 dark:text-blue-400" />
              Use Proxy (For non-video sites)
            </span>
          </label>

          {embedMode && (
            <span className="text-xs px-3 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {embedMode === 'youtube' && '🎥 YouTube Embed'}
              {embedMode === 'reddit' && '🔴 Reddit'}
              {embedMode === 'tiktok' && '🎵 TikTok Embed'}
              {embedMode === 'twitter' && '🐦 Nitter (Twitter)'}
              {embedMode === 'iframe' && '🌐 Standard'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">Quick Links:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
              setTimeout(handleLoad, 100)
            }}
            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
          >
            🎥 YouTube
          </button>
          <button
            onClick={() => {
              setUrl('https://old.reddit.com/r/videos')
              setTimeout(handleLoad, 100)
            }}
            className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 text-sm font-medium transition-colors"
          >
            🔴 Reddit
          </button>
          <button
            onClick={() => {
              setUrl('https://en.wikipedia.org')
              setTimeout(handleLoad, 100)
            }}
            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium transition-colors"
          >
            📚 Wikipedia
          </button>
          <button
            onClick={() => {
              setUrl('https://github.com/trending')
              setTimeout(handleLoad, 100)
            }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
          >
            💻 GitHub
          </button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <span className="truncate flex-1">{url}</span>
          {useProxy && proxyStatus === 'online' && embedMode === 'iframe' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded font-medium">
              Via Proxy
            </span>
          )}
        </div>
        <iframe
          key={currentUrl}
          src={currentUrl}
          className="w-full h-[700px] border-0 bg-white dark:bg-gray-900"
          title="Browser Frame"
          sandbox={getSandboxAttributes()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">How It Works:</h3>

        <div className="space-y-4 text-blue-800 dark:text-blue-200">
          <div>
            <h4 className="font-medium mb-2">🎥 Video Sites (Auto-detected):</h4>
            <ul className="space-y-1 ml-4 text-sm">
              <li>✅ <strong>YouTube</strong> - Uses official YouTube embed player</li>
              <li>✅ <strong>TikTok</strong> - Uses TikTok embed API</li>
              <li>✅ <strong>Vimeo</strong> - Direct embedding supported</li>
              <li>✅ <strong>Twitch</strong> - Direct embedding supported</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">🌐 Other Sites:</h4>
            <ul className="space-y-1 ml-4 text-sm">
              <li>✅ <strong>Reddit</strong> - Uses old.reddit.com + proxy for best results</li>
              <li>✅ <strong>Twitter</strong> - Uses Nitter (privacy-friendly Twitter frontend)</li>
              <li>✅ <strong>Most websites</strong> - Enable proxy mode for blocked sites</li>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-sm text-blue-700 dark:text-blue-300">
          <strong>Smart Detection:</strong> The browser automatically detects YouTube, Reddit, TikTok, and Twitter links
          and uses the best embedding method for each platform.
        </p>
      </div>
    </div>
  )
}
