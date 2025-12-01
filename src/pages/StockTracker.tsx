import { useState } from 'react'
import { TrendingUp, Search, X, RefreshCw, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  marketCap?: number
}

interface ChartDataPoint {
  date: string
  price: number
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y'

export default function StockTracker() {
  const [watchlist, setWatchlist] = useState<Stock[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('1M')
  const [loadingChart, setLoadingChart] = useState(false)

  const apiKey = 'II19ZTIIPZLYNA6O'

  // Search for stock symbols
  const searchStocks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${apiKey}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.bestMatches) {
        const symbols = data.bestMatches.slice(0, 5).map((match: any) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
        }))
        setSearchResults(symbols)
      }
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const fetchStockData = async (symbol: string): Promise<Stock | null> => {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${apiKey}`
      const response = await fetch(url)
      const data = await response.json()

      if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
        if (data['Note']) {
          throw new Error('API rate limit reached (5 calls/min)')
        }
        throw new Error('Stock not found')
      }

      const quote = data['Global Quote']
      const price = parseFloat(quote['05. price'])
      const change = parseFloat(quote['09. change'])
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))
      const volume = parseInt(quote['06. volume'])

      return {
        symbol: quote['01. symbol'],
        name: symbol.toUpperCase(),
        price: price,
        change: change,
        changePercent: changePercent,
        volume: volume,
        marketCap: undefined,
      }
    } catch (err) {
      console.error('Error fetching stock:', err)
      return null
    }
  }

  const fetchChartData = async (symbol: string, range: TimeRange) => {
    setLoadingChart(true)
    try {
      let functionName = 'TIME_SERIES_INTRADAY'
      let interval = '60min'
      let outputsize = 'compact'

      // Determine API function based on time range
      if (range === '1D') {
        functionName = 'TIME_SERIES_INTRADAY'
        interval = '5min'
      } else if (range === '1W' || range === '1M') {
        functionName = 'TIME_SERIES_DAILY'
      } else {
        functionName = 'TIME_SERIES_DAILY'
        outputsize = 'full'
      }

      const url = functionName === 'TIME_SERIES_INTRADAY'
        ? `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&interval=${interval}&apikey=${apiKey}&outputsize=${outputsize}`
        : `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}&outputsize=${outputsize}`

      const response = await fetch(url)
      const data = await response.json()

      let timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'))
      if (!timeSeriesKey) {
        throw new Error('No chart data available')
      }

      const timeSeries = data[timeSeriesKey]
      const dataPoints: ChartDataPoint[] = []

      // Get date cutoff based on range
      const now = new Date()
      const cutoffDate = new Date()
      switch (range) {
        case '1D':
          cutoffDate.setDate(now.getDate() - 1)
          break
        case '1W':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case '1M':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case '3M':
          cutoffDate.setMonth(now.getMonth() - 3)
          break
        case '1Y':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }

      Object.entries(timeSeries)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .forEach(([date, values]: [string, any]) => {
          const pointDate = new Date(date)
          if (pointDate >= cutoffDate) {
            dataPoints.push({
              date: date,
              price: parseFloat(values['4. close']),
            })
          }
        })

      setChartData(dataPoints)
    } catch (err) {
      console.error('Chart error:', err)
    } finally {
      setLoadingChart(false)
    }
  }

  const addStock = async (symbol: string) => {
    setLoading(true)
    setError('')

    const stockData = await fetchStockData(symbol)

    if (stockData) {
      if (watchlist.find(s => s.symbol === stockData.symbol)) {
        setError('Stock already in watchlist')
      } else {
        setWatchlist([...watchlist, stockData])
        setSearchQuery('')
        setSearchResults([])
      }
    } else {
      setError(`Could not find stock: ${symbol}`)
    }

    setLoading(false)
  }

  const removeStock = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s.symbol !== symbol))
    if (selectedStock?.symbol === symbol) {
      setSelectedStock(null)
      setChartData([])
    }
  }

  const selectStock = async (stock: Stock) => {
    setSelectedStock(stock)
    await fetchChartData(stock.symbol, timeRange)
  }

  const refreshAll = async () => {
    setLoading(true)
    const symbols = watchlist.map(s => s.symbol)
    const updated: Stock[] = []

    for (const symbol of symbols) {
      const data = await fetchStockData(symbol)
      if (data) updated.push(data)
    }

    setWatchlist(updated)
    setLoading(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const formatNumber = (num?: number) => {
    if (!num) return '-'
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Tracker</h1>
            <p className="text-gray-600 dark:text-gray-300">Real-time stock market data</p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading || watchlist.length === 0}
          className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          title="Refresh all stocks"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search Bar with Autocomplete */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search & Add Stocks
        </label>
        <div className="relative">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchStocks(e.target.value)
                }}
                placeholder="Search stocks by name or symbol..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result: any) => (
                <button
                  key={result.symbol}
                  onClick={() => addStock(result.symbol)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{result.symbol}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{result.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Chart */}
      {selectedStock && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedStock.symbol} - {formatPrice(selectedStock.price)}
                </h3>
                <p className={`text-sm ${selectedStock.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}{formatPrice(selectedStock.change)} ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['1D', '1W', '1M', '3M', '1Y'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range)
                    fetchChartData(selectedStock.symbol, range)
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {loadingChart ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="animate-spin text-gray-400" size={32} />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    if (timeRange === '1D') {
                      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    }
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No chart data available
            </div>
          )}
        </div>
      )}

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 dark:text-gray-400 text-lg">Your watchlist is empty</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Search and add stocks above to start tracking</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {watchlist.map((stock) => (
                  <tr
                    key={stock.symbol}
                    onClick={() => selectStock(stock)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      selectedStock?.symbol === stock.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{stock.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatPrice(stock.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${
                          stock.change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{formatPrice(stock.change)}
                        </span>
                        <span className={`text-xs ${
                          stock.change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(stock.volume)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStock(stock.symbol)
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remove from watchlist"
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Data Source:</strong> Alpha Vantage • <strong>Real-time quotes</strong> • <strong>Limit:</strong> 5 calls/min, 100/day
        </p>
      </div>
    </div>
  )
}
