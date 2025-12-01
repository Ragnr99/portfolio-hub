import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play, Pause, Settings } from 'lucide-react'
import ControlsModal from './ControlsModal'
import type { GameControls } from '../types/controls'

interface Position {
  x: number
  y: number
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('paused')
  const [score, setScore] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [controls, setControls] = useState<GameControls>({
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  })

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }])
  const directionRef = useRef<Position>({ x: 1, y: 0 })
  const nextDirectionRef = useRef<Position>({ x: 1, y: 0 })
  const foodRef = useRef<Position>({ x: 15, y: 15 })
  const animationFrameRef = useRef<number>()
  const lastMoveTimeRef = useRef<number>(0)

  const GRID_SIZE = 20
  const CELL_SIZE = 25
  const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE
  const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE
  const MOVE_INTERVAL = 150 // ms

  const generateFood = () => {
    const snake = snakeRef.current
    let newFood: Position

    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y))

    foodRef.current = newFood
  }

  const initGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }]
    directionRef.current = { x: 1, y: 0 }
    nextDirectionRef.current = { x: 1, y: 0 }
    generateFood()
    setScore(0)
    setGameState('playing')
    lastMoveTimeRef.current = performance.now()
  }

  const resetGame = () => {
    initGame()
  }

  const gameLoop = (currentTime: number) => {
    if (gameState !== 'playing') return

    const timeSinceLastMove = currentTime - lastMoveTimeRef.current

    if (timeSinceLastMove >= MOVE_INTERVAL) {
      lastMoveTimeRef.current = currentTime

      const snake = snakeRef.current
      directionRef.current = nextDirectionRef.current

      // Calculate new head position
      const head = snake[0]
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y,
      }

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('gameOver')
        return
      }

      // Check self collision
      if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameState('gameOver')
        return
      }

      // Add new head
      snake.unshift(newHead)

      // Check food collision
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => s + 10)
        generateFood()
      } else {
        // Remove tail if no food eaten
        snake.pop()
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
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE)
      ctx.stroke()
    }

    // Draw snake
    const snake = snakeRef.current
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#10b981' : '#059669'
      ctx.fillRect(
        segment.x * CELL_SIZE + 2,
        segment.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      )
    })

    // Draw food
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(
      foodRef.current.x * CELL_SIZE + CELL_SIZE / 2,
      foodRef.current.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = directionRef.current

      // Prevent opposite direction
      if (e.key === controls.up && dir.y === 0) {
        nextDirectionRef.current = { x: 0, y: -1 }
        e.preventDefault()
      } else if (e.key === controls.down && dir.y === 0) {
        nextDirectionRef.current = { x: 0, y: 1 }
        e.preventDefault()
      } else if (e.key === controls.left && dir.x === 0) {
        nextDirectionRef.current = { x: -1, y: 0 }
        e.preventDefault()
      } else if (e.key === controls.right && dir.x === 0) {
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
            <div className="text-sm text-gray-600 dark:text-gray-300">Length</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{snakeRef.current.length}</div>
          </div>
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
        gameName="Snake"
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

      {gameState === 'paused' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.up === ' ' ? 'Space' : controls.up.replace('Arrow', '').toUpperCase()}</kbd> Move Up</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.down === ' ' ? 'Space' : controls.down.replace('Arrow', '').toUpperCase()}</kbd> Move Down</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.left === ' ' ? 'Space' : controls.left.replace('Arrow', '').toUpperCase()}</kbd> Move Left</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.right === ' ' ? 'Space' : controls.right.replace('Arrow', '').toUpperCase()}</kbd> Move Right</div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">Eat the red food to grow. Don't hit walls or yourself!</p>
        </div>
      )}
    </div>
  )
}
