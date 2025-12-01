import { useState, useEffect } from 'react'
import { Newspaper, ExternalLink, Filter, Calendar, Search, RefreshCw, Globe } from 'lucide-react'

interface NewsArticle {
  id: string
  title: string
  description: string
  source: string
  apiSource: string
  url: string
  publishedAt: string
  category: string
  imageUrl?: string
  author?: string
}

interface NewsSource {
  id: string
  name: string
  enabled: boolean
  color: string
}

export default function NewsCurator() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'search'>('all')

  // API source toggles
  const [newsSources, setNewsSources] = useState<NewsSource[]>([
    { id: 'newsapi', name: 'NewsAPI', enabled: true, color: 'bg-blue-500' },
    { id: 'guardian', name: 'The Guardian', enabled: true, color: 'bg-orange-500' },
    { id: 'nyt', name: 'NY Times', enabled: true, color: 'bg-gray-800' },
  ])

  const categories = [
    { id: 'technology', label: 'Technology', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    { id: 'business', label: 'Business', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    { id: 'science', label: 'Science', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
    { id: 'health', label: 'Health', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' },
    { id: 'sports', label: 'Sports', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
    { id: 'entertainment', label: 'Entertainment', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  ]

  // API Keys - users will need to sign up for free keys
  const API_KEYS = {
    newsapi: 'YOUR_NEWSAPI_KEY', // Get from https://newsapi.org
    guardian: 'YOUR_GUARDIAN_KEY', // Get from https://open-platform.theguardian.com
    nyt: 'YOUR_NYT_KEY', // Get from https://developer.nytimes.com
  }

  // Fetch from NewsAPI
  const fetchNewsAPI = async (query: string = '', category: string = '') => {
    if (!newsSources.find(s => s.id === 'newsapi')?.enabled) return []

    try {
      const endpoint = query
        ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&apiKey=${API_KEYS.newsapi}`
        : `https://newsapi.org/v2/top-headlines?country=us${category ? `&category=${category}` : ''}&apiKey=${API_KEYS.newsapi}`

      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.status === 'ok' && data.articles) {
        return data.articles.map((article: any, index: number) => ({
          id: `newsapi-${index}-${Date.now()}`,
          title: article.title,
          description: article.description || article.content?.substring(0, 200) || 'No description available',
          source: article.source.name,
          apiSource: 'NewsAPI',
          url: article.url,
          publishedAt: article.publishedAt,
          category: category || 'general',
          imageUrl: article.urlToImage,
          author: article.author,
        }))
      }
    } catch (err) {
      console.error('NewsAPI error:', err)
    }
    return []
  }

  // Fetch from The Guardian
  const fetchGuardian = async (query: string = '', category: string = '') => {
    if (!newsSources.find(s => s.id === 'guardian')?.enabled) return []

    try {
      const section = category === 'business' ? 'business' :
                      category === 'technology' ? 'technology' :
                      category === 'science' ? 'science' :
                      category === 'sports' ? 'sport' : ''

      const searchParam = query ? `&q=${encodeURIComponent(query)}` : ''
      const sectionParam = section ? `&section=${section}` : ''

      const response = await fetch(
        `https://content.guardianapis.com/search?show-fields=thumbnail,trailText,byline&order-by=newest${searchParam}${sectionParam}&api-key=${API_KEYS.guardian}`
      )
      const data = await response.json()

      if (data.response?.results) {
        return data.response.results.map((article: any, index: number) => ({
          id: `guardian-${index}-${Date.now()}`,
          title: article.webTitle,
          description: article.fields?.trailText || 'Read more at The Guardian',
          source: 'The Guardian',
          apiSource: 'Guardian',
          url: article.webUrl,
          publishedAt: article.webPublicationDate,
          category: article.sectionId || category || 'general',
          imageUrl: article.fields?.thumbnail,
          author: article.fields?.byline,
        }))
      }
    } catch (err) {
      console.error('Guardian API error:', err)
    }
    return []
  }

  // Fetch from NY Times
  const fetchNYT = async (query: string = '') => {
    if (!newsSources.find(s => s.id === 'nyt')?.enabled) return []

    try {
      const endpoint = query
        ? `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&sort=newest&api-key=${API_KEYS.nyt}`
        : `https://api.nytimes.com/svc/topstories/v2/home.json?api-key=${API_KEYS.nyt}`

      const response = await fetch(endpoint)
      const data = await response.json()

      const results = query ? data.response?.docs : data.results

      if (results) {
        return results.map((article: any, index: number) => {
          const imageUrl = query
            ? article.multimedia?.[0] ? `https://www.nytimes.com/${article.multimedia[0].url}` : undefined
            : article.multimedia?.[0]?.url

          return {
            id: `nyt-${index}-${Date.now()}`,
            title: query ? article.headline?.main : article.title,
            description: query ? article.abstract : article.abstract || 'Read more at NY Times',
            source: 'NY Times',
            apiSource: 'NYT',
            url: query ? article.web_url : article.url,
            publishedAt: query ? article.pub_date : article.published_date,
            category: query ? article.section_name?.toLowerCase() : article.section?.toLowerCase() || 'general',
            imageUrl,
            author: query ? article.byline?.original : article.byline,
          }
        })
      }
    } catch (err) {
      console.error('NYT API error:', err)
    }
    return []
  }

  // Fetch all news
  const fetchAllNews = async () => {
    setLoading(true)
    setError('')

    try {
      const allArticles: NewsArticle[] = []

      if (activeTab === 'search' && searchQuery) {
        // Search across all sources
        const [newsApiResults, guardianResults, nytResults] = await Promise.all([
          fetchNewsAPI(searchQuery),
          fetchGuardian(searchQuery),
          fetchNYT(searchQuery),
        ])
        allArticles.push(...newsApiResults, ...guardianResults, ...nytResults)
      } else {
        // Fetch top headlines by category
        if (selectedCategories.length === 0) {
          // Fetch general news from all sources
          const [newsApiResults, guardianResults, nytResults] = await Promise.all([
            fetchNewsAPI(),
            fetchGuardian(),
            fetchNYT(),
          ])
          allArticles.push(...newsApiResults, ...guardianResults, ...nytResults)
        } else {
          // Fetch for each selected category
          for (const category of selectedCategories) {
            const [newsApiResults, guardianResults] = await Promise.all([
              fetchNewsAPI('', category),
              fetchGuardian('', category),
            ])
            allArticles.push(...newsApiResults, ...guardianResults)
          }
        }
      }

      // Sort by publish date
      allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

      setArticles(allArticles)

      if (allArticles.length === 0) {
        setError('No articles found. Make sure to add your API keys!')
      }
    } catch (err) {
      setError('Failed to fetch news. Please check your API keys.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch on component mount and when filters change
  useEffect(() => {
    fetchAllNews()
  }, [selectedCategories, activeTab])

  // Sample fallback data
  const sampleNews: NewsArticle[] = [
    {
      id: '1',
      title: 'AI Breakthrough: New Model Surpasses Human Performance in Complex Tasks',
      description: 'Researchers unveil groundbreaking artificial intelligence system that demonstrates unprecedented capabilities in reasoning and problem-solving.',
      source: 'TechCrunch',
      url: '#',
      publishedAt: '2025-01-09T14:30:00Z',
      category: 'technology',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    },
    {
      id: '2',
      title: 'Stock Market Reaches New All-Time High Amid Economic Recovery',
      description: 'Major indices hit record levels as investor confidence grows following positive economic indicators and strong corporate earnings.',
      source: 'Bloomberg',
      url: '#',
      publishedAt: '2025-01-09T12:15:00Z',
      category: 'business',
      imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    },
    {
      id: '3',
      title: 'Revolutionary Battery Technology Could Transform Electric Vehicles',
      description: 'Scientists develop new solid-state battery that offers 500-mile range and charges in under 10 minutes.',
      source: 'MIT Technology Review',
      url: '#',
      publishedAt: '2025-01-09T10:45:00Z',
      category: 'technology',
      imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
    },
    {
      id: '4',
      title: 'Federal Reserve Signals Potential Rate Cuts Later This Year',
      description: 'Central bank officials hint at monetary policy shift as inflation shows signs of cooling.',
      source: 'Wall Street Journal',
      url: '#',
      publishedAt: '2025-01-09T09:20:00Z',
      category: 'finance',
      imageUrl: 'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=800&q=80',
    },
    {
      id: '5',
      title: 'Quantum Computing Startup Secures $200M in Series B Funding',
      description: 'Investors bet big on quantum technology as startup demonstrates practical applications for drug discovery and cryptography.',
      source: 'VentureBeat',
      url: '#',
      publishedAt: '2025-01-09T08:00:00Z',
      category: 'business',
      imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    },
    {
      id: '6',
      title: 'New Study Links Sleep Quality to Long-Term Cognitive Health',
      description: 'Decade-long research reveals significant connections between sleep patterns and brain health in aging populations.',
      source: 'Nature',
      url: '#',
      publishedAt: '2025-01-09T07:30:00Z',
      category: 'health',
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80',
    },
    {
      id: '7',
      title: 'SpaceX Successfully Launches Next-Generation Satellite Constellation',
      description: 'Latest mission deploys advanced communications satellites, expanding global internet coverage.',
      source: 'Space.com',
      url: '#',
      publishedAt: '2025-01-08T22:00:00Z',
      category: 'science',
      imageUrl: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80',
    },
    {
      id: '8',
      title: 'Major Tech Companies Announce Collaborative AI Safety Initiative',
      description: 'Industry leaders form alliance to establish ethical guidelines and safety standards for AI development.',
      source: 'Reuters',
      url: '#',
      publishedAt: '2025-01-08T18:45:00Z',
      category: 'technology',
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    },
  ]

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleSource = (sourceId: string) => {
    setNewsSources(prev =>
      prev.map(source =>
        source.id === sourceId ? { ...source, enabled: !source.enabled } : source
      )
    )
  }

  const handleSearch = () => {
    setActiveTab('search')
    fetchAllNews()
  }

  const displayArticles = articles.length > 0 ? articles : sampleNews

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">News Curator</h1>
        <p className="text-gray-600 dark:text-gray-300">Multi-source news aggregation from NewsAPI, The Guardian, and NY Times</p>
      </div>

      {/* News Source Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={20} className="text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">News Sources</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {newsSources.map(source => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                source.enabled
                  ? `${source.color} text-white`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {source.name}
              {source.enabled && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
        >
          Top Headlines
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
        >
          Search News
        </button>
      </div>

      {/* Search Bar (visible in search mode) */}
      {activeTab === 'search' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search across all news sources..."
              className="flex-1 px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
              Search
            </button>
          </div>
        </div>
      )}

      {/* Category Filter (visible in top headlines mode) */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter by Category</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategories.includes(category.id)
                    ? category.color
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.label}
                {selectedCategories.includes(category.id) && (
                  <span className="ml-2">✓</span>
                )}
              </button>
            ))}
          </div>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => setSelectedCategories([])}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <RefreshCw size={48} className="mx-auto text-blue-600 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Fetching latest news...</h3>
          <p className="text-gray-600 dark:text-gray-300">Aggregating from multiple sources</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* News Stats */}
      {!loading && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-300">Total Articles</span>
              <Newspaper className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{displayArticles.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-300">Active Sources</span>
              <Globe className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {newsSources.filter(s => s.enabled).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-300">Publishers</span>
              <Calendar className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {new Set(displayArticles.map(a => a.source)).size}
            </p>
          </div>
        </div>
      )}

      {/* News Grid */}
      {!loading && (
        <div className="space-y-4">
          {displayArticles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Newspaper size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No articles found</h3>
              <p className="text-gray-600 dark:text-gray-300">Try adjusting your filters or search query</p>
            </div>
          ) : (
            displayArticles.map(article => {
              const category = categories.find(c => c.id === article.category)
              return (
                <div
                  key={article.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="md:flex">
                    {article.imageUrl && (
                      <div className="md:w-64 md:flex-shrink-0">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-48 md:h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {category && (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                              {category.label}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{article.source}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(article.publishedAt)}</span>
                          {article.apiSource && (
                            <>
                              <span className="text-sm text-gray-400">•</span>
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                via {article.apiSource}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                        {article.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {article.description}
                      </p>
                      {article.author && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          By {article.author}
                        </p>
                      )}
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        Read full article
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* API Setup Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
          <Newspaper size={20} />
          Setup API Keys for Real News
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
          Currently showing sample data. To get live news from multiple sources, add your free API keys to the code:
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-blue-900 dark:text-blue-300 min-w-[120px]">NewsAPI:</span>
            <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
              newsapi.org
            </a>
            <span className="text-blue-700 dark:text-blue-300">- 100 requests/day free</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-blue-900 dark:text-blue-300 min-w-[120px]">The Guardian:</span>
            <a href="https://open-platform.theguardian.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
              open-platform.theguardian.com
            </a>
            <span className="text-blue-700 dark:text-blue-300">- 500 requests/day free</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-blue-900 dark:text-blue-300 min-w-[120px]">NY Times:</span>
            <a href="https://developer.nytimes.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
              developer.nytimes.com
            </a>
            <span className="text-blue-700 dark:text-blue-300">- 500 requests/day free</span>
          </div>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-4">
          Update API_KEYS in <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">src/pages/NewsCurator.tsx</code> with your keys
        </p>
      </div>
    </div>
  )
}
