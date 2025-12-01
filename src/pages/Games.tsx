import { useState } from 'react'
import { Gamepad2, Zap, Joystick, Ghost } from 'lucide-react'
import AsteroidsGame from '../components/AsteroidsGame'
import SnakeGame from '../components/SnakeGame'
import PacManGame from '../components/PacManGame'

type GameType = 'asteroids' | 'snake' | 'pacman' | null

export default function Games() {
  const [selectedGame, setSelectedGame] = useState<GameType>(null)

  const games = [
    {
      id: 'asteroids' as GameType,
      name: 'Asteroids',
      icon: Zap,
      description: 'Navigate space, destroy asteroids, survive!',
      color: 'from-blue-500 to-blue-700',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'snake' as GameType,
      name: 'Snake',
      icon: Joystick,
      description: 'Eat food, grow longer, avoid walls!',
      color: 'from-green-500 to-green-700',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      id: 'pacman' as GameType,
      name: 'Pac-Man',
      icon: Ghost,
      description: 'Eat pellets, avoid ghosts, clear the maze!',
      color: 'from-yellow-500 to-yellow-700',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
  ]

  if (selectedGame === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Classic Games</h1>
          <p className="text-gray-600 dark:text-gray-300">Custom-built retro arcade games</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {games.map((game) => {
            const Icon = game.icon
            return (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all group"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={32} className="text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${game.textColor}`}>
                  {game.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {game.description}
                </p>
              </button>
            )
          })}
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Gamepad2 size={32} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
                100% Custom Games
              </h3>
              <p className="text-purple-800 dark:text-purple-200 text-sm mb-3">
                All games built from scratch using HTML5 Canvas and TypeScript. No external game engines or libraries.
              </p>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                <li>✓ Classic arcade physics and gameplay</li>
                <li>✓ Keyboard controls optimized for desktop</li>
                <li>✓ Progressive difficulty and scoring systems</li>
                <li>✓ Retro pixel-perfect graphics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentGame = games.find(g => g.id === selectedGame)
  const GameIcon = currentGame?.icon || Gamepad2

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedGame(null)}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Gamepad2 size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <GameIcon size={32} className={currentGame?.textColor} />
              {currentGame?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">{currentGame?.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {selectedGame === 'asteroids' && <AsteroidsGame />}
        {selectedGame === 'snake' && <SnakeGame />}
        {selectedGame === 'pacman' && <PacManGame />}
      </div>
    </div>
  )
}
