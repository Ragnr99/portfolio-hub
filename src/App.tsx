import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Daybreak from './pages/Daybreak'
import Projects from './pages/Projects'
import Games from './pages/Games'
import Pokedex from './pages/Pokedex'
import DamageCalc from './pages/DamageCalc'

function App() {
  return (
    <ThemeProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/daybreak" element={<Daybreak />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/games" element={<Games />} />
            <Route path="/pokedex" element={<Pokedex />} />
            <Route path="/calc" element={<DamageCalc />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
