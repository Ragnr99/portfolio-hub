import { useEffect, useState } from 'react'
import { ArrowLeft, Zap, Joystick, Ghost, Grid3x3, Square, Bird } from 'lucide-react'
import AsteroidsGame from '../components/AsteroidsGame'
import SnakeGame from '../components/SnakeGame'
import PacManGame from '../components/PacManGame'
import TetrisGame from '../components/TetrisGame'
import BreakoutGame from '../components/BreakoutGame'
import FlappyGame from '../components/FlappyGame'
import { getHighScore } from '../utils/highscores'

type GameType = 'tetris' | 'breakout' | 'flappy' | 'asteroids' | 'snake' | 'pacman' | null

const PIXEL = { fontFamily: '"Press Start 2P", monospace' }

const GAMES = [
  {
    id: 'tetris' as GameType, name: 'Tetris', icon: Grid3x3,
    tagline: 'Stack. Clear. Repeat.',
    glow: '#22d3ee', component: TetrisGame,
  },
  {
    id: 'breakout' as GameType, name: 'Breakout', icon: Square,
    tagline: 'One ball. Six rows. No mercy.',
    glow: '#fb923c', component: BreakoutGame,
  },
  {
    id: 'flappy' as GameType, name: 'Flappy', icon: Bird,
    tagline: 'One button. Infinite rage.',
    glow: '#facc15', component: FlappyGame,
  },
  {
    id: 'asteroids' as GameType, name: 'Asteroids', icon: Zap,
    tagline: 'Space rocks. Big laser.',
    glow: '#60a5fa', component: AsteroidsGame,
  },
  {
    id: 'snake' as GameType, name: 'Snake', icon: Joystick,
    tagline: 'Eat. Grow. Don’t bite yourself.',
    glow: '#4ade80', component: SnakeGame,
  },
  {
    id: 'pacman' as GameType, name: 'Pac-Man', icon: Ghost,
    tagline: 'Four ghosts. Zero chill.',
    glow: '#c084fc', component: PacManGame,
  },
]

export default function Games() {
  const [selectedGame, setSelectedGame] = useState<GameType>(null)
  const [scores, setScores] = useState<Record<string, number>>({})

  // re-read scores whenever we land back on the cabinet wall
  useEffect(() => {
    if (selectedGame === null) {
      const s: Record<string, number> = {}
      GAMES.forEach((g) => { s[g.id as string] = getHighScore(g.id as string) })
      setScores(s)
    }
  }, [selectedGame])

  if (selectedGame === null) {
    return (
      <div className="rounded-2xl bg-gray-950 border border-gray-800 p-8 md:p-12 space-y-10 shadow-2xl">
        {/* marquee */}
        <div className="text-center space-y-4">
          <h1
            style={{ ...PIXEL, textShadow: '0 0 8px #e879f9, 0 0 24px #e879f9, 0 0 60px #a21caf' }}
            className="text-3xl md:text-4xl text-fuchsia-300 tracking-wider"
          >
            THE ARCADE
          </h1>
          <p style={PIXEL} className="text-[10px] text-gray-500 tracking-widest">
            SIX MACHINES · ZERO QUARTERS · HIGH SCORES SAVED
          </p>
        </div>

        {/* cabinets */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => {
            const Icon = game.icon
            const best = scores[game.id as string] || 0
            return (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className="group relative bg-gray-900 rounded-xl border border-gray-800 p-6 text-left
                           transition-all duration-200 hover:-translate-y-1"
                style={{ boxShadow: '0 0 0 rgba(0,0,0,0)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${game.glow}55, inset 0 0 0 1px ${game.glow}` }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)' }}
              >
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ background: `${game.glow}22`, border: `1px solid ${game.glow}66` }}
                >
                  <Icon size={28} style={{ color: game.glow }} />
                </div>
                <h3 style={{ ...PIXEL, color: game.glow }} className="text-sm mb-3">
                  {game.name.toUpperCase()}
                </h3>
                <p className="text-gray-400 text-sm mb-5">{game.tagline}</p>
                <div className="flex items-center justify-between">
                  <div style={PIXEL} className="text-[9px] text-gray-500">
                    HI-SCORE <span className="text-amber-300">{best ? best.toLocaleString() : '000000'}</span>
                  </div>
                  <div
                    style={PIXEL}
                    className="text-[9px] text-gray-600 group-hover:text-white group-hover:animate-pulse transition-colors"
                  >
                    INSERT COIN ▸
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-600">
          Built on HTML5 Canvas and TypeScript, no game engine. Scores live in your browser.
        </p>
      </div>
    )
  }

  const current = GAMES.find((g) => g.id === selectedGame)!
  const GameComponent = current.component

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedGame(null)}
          style={PIXEL}
          className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-[10px] text-gray-300 rounded-lg
                     border border-gray-700 hover:border-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> ARCADE
        </button>
        <div>
          <h1 style={{ ...PIXEL, color: current.glow, textShadow: `0 0 12px ${current.glow}88` }} className="text-lg">
            {current.name.toUpperCase()}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{current.tagline}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <GameComponent />
      </div>
    </div>
  )
}
