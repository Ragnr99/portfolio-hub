import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Daybreak from './pages/Daybreak'
import Projects from './pages/Projects'
import Games from './pages/Games'
import Pokedex from './pages/Pokedex'
import DamageCalc from './pages/DamageCalc'
import Palworld from './pages/Palworld'
import PalworldMap from './pages/PalworldMap'
import Palpedia from './pages/Palpedia'
import PalBreeder from './pages/PalBreeder'

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
            <Route path="/palworld" element={<Palworld />} />
            <Route path="/palworld/map" element={<PalworldMap />} />
            <Route path="/palworld/palpedia" element={<Palpedia />} />
            <Route path="/palworld/breeder" element={<PalBreeder />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
