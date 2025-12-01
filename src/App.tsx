import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import StockTracker from './pages/StockTracker'
import NewsCurator from './pages/NewsCurator'
import Projects from './pages/Projects'
import SwitchDisplay from './pages/SwitchDisplay'
import Browser from './pages/Browser'
import FileBrowser from './pages/FileBrowser'
import Games from './pages/Games'
import GeometrySandbox from './pages/GeometrySandbox'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stocks" element={<StockTracker />} />
            <Route path="/news" element={<NewsCurator />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/switch" element={<SwitchDisplay />} />
            <Route path="/browser" element={<Browser />} />
            <Route path="/files" element={<FileBrowser />} />
            <Route path="/games" element={<Games />} />
            <Route path="/geometry" element={<GeometrySandbox />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
