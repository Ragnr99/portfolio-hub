import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import { NavStackProvider } from './lib/history'
import Home from './pages/Home'
import Daybreak from './pages/Daybreak'
import Clustering from './pages/Clustering'
import Projects from './pages/Projects'
import Games from './pages/Games'
import Pokedex from './pages/Pokedex'
import DamageCalc from './pages/DamageCalc'
import Palworld from './pages/Palworld'
import PalworldMap from './pages/PalworldMap'
import Palpedia from './pages/Palpedia'
import PalBreeder from './pages/PalBreeder'
import PalPassives from './pages/PalPassives'
import PalPage from './pages/PalPage'
import PokemonPage from './pages/PokemonPage'

function App() {
  return (
    <ThemeProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <NavStackProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/daybreak" element={<Daybreak />} />
            <Route path="/daybreak/clustering" element={<Clustering />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/games" element={<Games />} />
            <Route path="/pokedex" element={<Pokedex />} />
            <Route path="/pokedex/:slug" element={<PokemonPage />} />
            <Route path="/calc" element={<DamageCalc />} />
            <Route path="/palworld" element={<Palworld />} />
            <Route path="/palworld/map" element={<PalworldMap />} />
            <Route path="/palworld/palpedia" element={<Palpedia />} />
            <Route path="/palworld/breeder" element={<PalBreeder />} />
            <Route path="/palworld/passives" element={<PalPassives />} />
            <Route path="/palworld/pal/:slug" element={<PalPage />} />
          </Routes>
        </Layout>
        </NavStackProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
