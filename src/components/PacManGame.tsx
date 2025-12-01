import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play, Pause, Settings } from 'lucide-react'
import ControlsModal from './ControlsModal'
import type { GameControls } from '../types/controls'

interface Position {
  x: number
  y: number
}

interface Ghost {
  pos: Position
  dir: Position
  color: string
}

export default function PacManGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('paused')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [showControls, setShowControls] = useState(false)
  const [controls, setControls] = useState<GameControls>({
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  })

  const pacmanRef = useRef<Position>({ x: 1, y: 1 })
  const directionRef = useRef<Position>({ x: 1, y: 0 })
  const nextDirectionRef = useRef<Position>({ x: 1, y: 0 })
  const ghostsRef = useRef<Ghost[]>([])
  const pelletsRef = useRef<boolean[][]>([])
  const powerPelletsRef = useRef<Position[]>([])
  const powerModeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>()
  const lastMoveTimeRef = useRef<number>(0)
  const mouthOpenRef = useRef<boolean>(true)

  const GRID_SIZE = 19
  const CELL_SIZE = 25
  const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE
  const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE
  const MOVE_INTERVAL = 180
  const GHOST_MOVE_INTERVAL = 220

  // Simple maze layout (1 = wall, 0 = path)
  const maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,0,0,1,1,0,1,1,0,0,0,1,1,0,1],
    [1,0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,0,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ]

  const initGame = () => {
    pacmanRef.current = { x: 1, y: 1 }
    directionRef.current = { x: 1, y: 0 }
    nextDirectionRef.current = { x: 1, y: 0 }
    powerModeRef.current = 0

    // Initialize pellets
    const newPellets: boolean[][] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      newPellets[y] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        newPellets[y][x] = maze[y][x] === 0
      }
    }
    pelletsRef.current = newPellets

    // Power pellets
    powerPelletsRef.current = [
      { x: 1, y: 1 },
      { x: 17, y: 1 },
      { x: 1, y: 17 },
      { x: 17, y: 17 },
    ]

    // Initialize ghosts
    ghostsRef.current = [
      { pos: { x: 9, y: 7 }, dir: { x: 1, y: 0 }, color: '#ef4444' },
      { pos: { x: 8, y: 9 }, dir: { x: 0, y: -1 }, color: '#ec4899' },
      { pos: { x: 10, y: 9 }, dir: { x: 0, y: 1 }, color: '#06b6d4' },
      { pos: { x: 9, y: 10 }, dir: { x: -1, y: 0 }, color: '#f97316' },
    ]

    setScore(0)
    setGameState('playing')
    lastMoveTimeRef.current = performance.now()
  }

  const resetGame = () => {
    setLives(3)
    initGame()
  }

  const isValidMove = (x: number, y: number): boolean => {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && maze[y][x] === 0
  }

  const gameLoop = (currentTime: number) => {
    if (gameState !== 'playing') return

    const timeSinceLastMove = currentTime - lastMoveTimeRef.current

    if (timeSinceLastMove >= MOVE_INTERVAL) {
      lastMoveTimeRef.current = currentTime
      mouthOpenRef.current = !mouthOpenRef.current

      // Try to change direction
      const pacman = pacmanRef.current
      const nextDir = nextDirectionRef.current
      const newX = pacman.x + nextDir.x
      const newY = pacman.y + nextDir.y

      if (isValidMove(newX, newY)) {
        directionRef.current = nextDir
        pacman.x = newX
        pacman.y = newY
      } else {
        // Continue in current direction
        const dir = directionRef.current
        const continueX = pacman.x + dir.x
        const continueY = pacman.y + dir.y
        if (isValidMove(continueX, continueY)) {
          pacman.x = continueX
          pacman.y = continueY
        }
      }

      // Eat pellet
      if (pelletsRef.current[pacman.y]?.[pacman.x]) {
        pelletsRef.current[pacman.y][pacman.x] = false
        setScore(s => s + 10)
      }

      // Eat power pellet
      const powerIndex = powerPelletsRef.current.findIndex(
        p => p.x === pacman.x && p.y === pacman.y
      )
      if (powerIndex !== -1) {
        powerPelletsRef.current.splice(powerIndex, 1)
        setScore(s => s + 50)
        powerModeRef.current = 100
      }

      if (powerModeRef.current > 0) {
        powerModeRef.current--
      }

      // Move ghosts
      if (timeSinceLastMove >= GHOST_MOVE_INTERVAL) {
        ghostsRef.current.forEach(ghost => {
          const possibleDirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ]

          // Filter valid directions
          const validDirs = possibleDirs.filter(dir =>
            isValidMove(ghost.pos.x + dir.x, ghost.pos.y + dir.y) &&
            !(dir.x === -ghost.dir.x && dir.y === -ghost.dir.y) // Don't reverse
          )

          if (validDirs.length > 0) {
            // Simple AI: move towards or away from Pac-Man
            if (powerModeRef.current > 0) {
              // Run away from Pac-Man
              const sorted = validDirs.sort((a, b) => {
                const distA = Math.abs(ghost.pos.x + a.x - pacman.x) + Math.abs(ghost.pos.y + a.y - pacman.y)
                const distB = Math.abs(ghost.pos.x + b.x - pacman.x) + Math.abs(ghost.pos.y + b.y - pacman.y)
                return distB - distA
              })
              ghost.dir = sorted[0]
            } else {
              // Chase Pac-Man
              const sorted = validDirs.sort((a, b) => {
                const distA = Math.abs(ghost.pos.x + a.x - pacman.x) + Math.abs(ghost.pos.y + a.y - pacman.y)
                const distB = Math.abs(ghost.pos.x + b.x - pacman.x) + Math.abs(ghost.pos.y + b.y - pacman.y)
                return distA - distB
              })
              ghost.dir = sorted[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * sorted.length)]
            }

            ghost.pos.x += ghost.dir.x
            ghost.pos.y += ghost.dir.y
          }
        })
      }

      // Check ghost collision
      ghostsRef.current.forEach((ghost, index) => {
        if (ghost.pos.x === pacman.x && ghost.pos.y === pacman.y) {
          if (powerModeRef.current > 0) {
            // Eat ghost
            setScore(s => s + 200)
            ghost.pos = { x: 9, y: 9 }
          } else {
            // Lose life
            setLives(l => {
              const newLives = l - 1
              if (newLives <= 0) {
                setGameState('gameOver')
              } else {
                pacman.x = 1
                pacman.y = 1
              }
              return newLives
            })
          }
        }
      })

      // Check win condition
      const hasAnyPellets = pelletsRef.current.some(row => row.some(cell => cell))
      if (!hasAnyPellets && powerPelletsRef.current.length === 0) {
        setGameState('won')
      }
    }

    draw()
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw maze
    ctx.fillStyle = '#1e40af'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (maze[y][x] === 1) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Draw pellets
    ctx.fillStyle = '#fbbf24'
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (pelletsRef.current[y]?.[x]) {
          ctx.beginPath()
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            2,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
    }

    // Draw power pellets
    powerPelletsRef.current.forEach(p => {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(
        p.x * CELL_SIZE + CELL_SIZE / 2,
        p.y * CELL_SIZE + CELL_SIZE / 2,
        6,
        0,
        Math.PI * 2
      )
      ctx.fill()
    })

    // Draw Pac-Man
    const pacman = pacmanRef.current
    ctx.fillStyle = powerModeRef.current > 0 ? '#facc15' : '#fbbf24'
    ctx.beginPath()

    const angle = directionRef.current.x === 1 ? 0 :
                  directionRef.current.x === -1 ? Math.PI :
                  directionRef.current.y === -1 ? -Math.PI / 2 :
                  Math.PI / 2

    const mouthAngle = mouthOpenRef.current ? 0.3 : 0.1

    ctx.arc(
      pacman.x * CELL_SIZE + CELL_SIZE / 2,
      pacman.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      angle + mouthAngle,
      angle - mouthAngle + Math.PI * 2
    )
    ctx.lineTo(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2)
    ctx.fill()

    // Draw ghosts
    ghostsRef.current.forEach(ghost => {
      const ghostColor = powerModeRef.current > 0 ? '#3b82f6' : ghost.color
      ctx.fillStyle = ghostColor

      // Ghost body
      ctx.beginPath()
      ctx.arc(
        ghost.pos.x * CELL_SIZE + CELL_SIZE / 2,
        ghost.pos.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        Math.PI,
        0
      )
      ctx.lineTo(
        ghost.pos.x * CELL_SIZE + CELL_SIZE - 2,
        ghost.pos.y * CELL_SIZE + CELL_SIZE - 2
      )

      // Ghost skirt (wavy bottom)
      for (let i = 0; i < 3; i++) {
        const x1 = ghost.pos.x * CELL_SIZE + CELL_SIZE - 2 - (i * CELL_SIZE / 3)
        const x2 = ghost.pos.x * CELL_SIZE + CELL_SIZE - 2 - ((i + 1) * CELL_SIZE / 3)
        ctx.lineTo(x1, ghost.pos.y * CELL_SIZE + CELL_SIZE - 2)
        ctx.lineTo((x1 + x2) / 2, ghost.pos.y * CELL_SIZE + CELL_SIZE - 6)
      }
      ctx.lineTo(ghost.pos.x * CELL_SIZE + 2, ghost.pos.y * CELL_SIZE + CELL_SIZE - 2)
      ctx.fill()

      // Ghost eyes
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(
        ghost.pos.x * CELL_SIZE + CELL_SIZE / 2 - 4,
        ghost.pos.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        3,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.beginPath()
      ctx.arc(
        ghost.pos.x * CELL_SIZE + CELL_SIZE / 2 + 4,
        ghost.pos.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        3,
        0,
        Math.PI * 2
      )
      ctx.fill()

      if (powerModeRef.current === 0) {
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(
          ghost.pos.x * CELL_SIZE + CELL_SIZE / 2 - 4,
          ghost.pos.y * CELL_SIZE + CELL_SIZE / 2 - 2,
          1.5,
          0,
          Math.PI * 2
        )
        ctx.fill()
        ctx.beginPath()
        ctx.arc(
          ghost.pos.x * CELL_SIZE + CELL_SIZE / 2 + 4,
          ghost.pos.y * CELL_SIZE + CELL_SIZE / 2 - 2,
          1.5,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === controls.up) {
        nextDirectionRef.current = { x: 0, y: -1 }
        e.preventDefault()
      } else if (e.key === controls.down) {
        nextDirectionRef.current = { x: 0, y: 1 }
        e.preventDefault()
      } else if (e.key === controls.left) {
        nextDirectionRef.current = { x: -1, y: 0 }
        e.preventDefault()
      } else if (e.key === controls.right) {
        nextDirectionRef.current = { x: 1, y: 0 }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [controls])

  useEffect(() => {
    const animate = (currentTime: number) => {
      gameLoop(currentTime)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    if (gameState === 'playing') {
      animate(performance.now())
    } else {
      draw()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameState])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">Score</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{score}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">Lives</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{lives}</div>
          </div>
          {powerModeRef.current > 0 && (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-4 py-2 border border-yellow-300 dark:border-yellow-700">
              <div className="text-sm text-yellow-700 dark:text-yellow-300">Power Mode!</div>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-400">{Math.ceil(powerModeRef.current / 10)}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowControls(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2"
          >
            <Settings size={18} />
            Controls
          </button>
          {gameState === 'paused' && (
            <button
              onClick={initGame}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
            >
              <Play size={18} />
              Start
            </button>
          )}
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('paused')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2"
            >
              <Pause size={18} />
              Pause
            </button>
          )}
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </div>

      <ControlsModal
        isOpen={showControls}
        onClose={() => setShowControls(false)}
        controls={controls}
        onSave={setControls}
        gameName="Pac-Man"
        hasAction={false}
      />

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-700 rounded-lg"
        />
      </div>

      {gameState === 'gameOver' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">Game Over!</h3>
          <p className="text-red-800 dark:text-red-200 mb-4">Final Score: {score}</p>
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Play Again
          </button>
        </div>
      )}

      {gameState === 'won' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-300 mb-2">You Won!</h3>
          <p className="text-green-800 dark:text-green-200 mb-4">Final Score: {score}</p>
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Play Again
          </button>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.up === ' ' ? 'Space' : controls.up.replace('Arrow', '').toUpperCase()}</kbd> Move Up</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.down === ' ' ? 'Space' : controls.down.replace('Arrow', '').toUpperCase()}</kbd> Move Down</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.left === ' ' ? 'Space' : controls.left.replace('Arrow', '').toUpperCase()}</kbd> Move Left</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.right === ' ' ? 'Space' : controls.right.replace('Arrow', '').toUpperCase()}</kbd> Move Right</div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
            Eat all pellets to win! Large pellets give you power to eat ghosts!
          </p>
        </div>
      )}
    </div>
  )
}
