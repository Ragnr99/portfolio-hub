import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play, Pause, Settings } from 'lucide-react'
import ControlsModal from './ControlsModal'
import type { GameControls } from '../types/controls'

interface Vector {
  x: number
  y: number
}

interface Ship {
  pos: Vector
  vel: Vector
  angle: number
  thrust: boolean
}

interface Asteroid {
  pos: Vector
  vel: Vector
  radius: number
  points: Vector[]
}

interface Bullet {
  pos: Vector
  vel: Vector
  life: number
}

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('paused')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [showControls, setShowControls] = useState(false)
  const [controls, setControls] = useState<GameControls>({
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: ' ',
  })

  const shipRef = useRef<Ship>({
    pos: { x: 400, y: 300 },
    vel: { x: 0, y: 0 },
    angle: 0,
    thrust: false,
  })
  const asteroidsRef = useRef<Asteroid[]>([])
  const bulletsRef = useRef<Bullet[]>([])
  const keysRef = useRef<{ [key: string]: boolean }>({})
  const animationFrameRef = useRef<number>()

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600

  const createAsteroid = (x?: number, y?: number, radius: number = 50): Asteroid => {
    const pos = x !== undefined && y !== undefined
      ? { x, y }
      : {
          x: Math.random() < 0.5 ? Math.random() * 100 : CANVAS_WIDTH - Math.random() * 100,
          y: Math.random() < 0.5 ? Math.random() * 100 : CANVAS_HEIGHT - Math.random() * 100,
        }

    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 2
    const vel = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    }

    const points: Vector[] = []
    const numPoints = 8 + Math.floor(Math.random() * 4)
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const variance = 0.7 + Math.random() * 0.6
      points.push({
        x: Math.cos(angle) * radius * variance,
        y: Math.sin(angle) * radius * variance,
      })
    }

    return { pos, vel, radius, points }
  }

  const initGame = () => {
    shipRef.current = {
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      vel: { x: 0, y: 0 },
      angle: 0,
      thrust: false,
    }
    bulletsRef.current = []
    asteroidsRef.current = []

    const numAsteroids = 3 + level
    for (let i = 0; i < numAsteroids; i++) {
      asteroidsRef.current.push(createAsteroid())
    }

    setGameState('playing')
  }

  const resetGame = () => {
    setScore(0)
    setLives(3)
    setLevel(1)
    initGame()
  }

  const wrap = (pos: Vector): Vector => ({
    x: (pos.x + CANVAS_WIDTH) % CANVAS_WIDTH,
    y: (pos.y + CANVAS_HEIGHT) % CANVAS_HEIGHT,
  })

  const checkCollision = (ship: Ship, asteroid: Asteroid): boolean => {
    const dx = ship.pos.x - asteroid.pos.x
    const dy = ship.pos.y - asteroid.pos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < asteroid.radius + 10
  }

  const checkBulletCollision = (bullet: Bullet, asteroid: Asteroid): boolean => {
    const dx = bullet.pos.x - asteroid.pos.x
    const dy = bullet.pos.y - asteroid.pos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < asteroid.radius
  }

  const gameLoop = () => {
    if (gameState !== 'playing') return

    const ship = shipRef.current
    const asteroids = asteroidsRef.current
    const bullets = bulletsRef.current
    const keys = keysRef.current

    if (keys[controls.left]) ship.angle -= 0.1
    if (keys[controls.right]) ship.angle += 0.1

    ship.thrust = keys[controls.up] || false

    if (ship.thrust) {
      ship.vel.x += Math.cos(ship.angle) * 0.15
      ship.vel.y += Math.sin(ship.angle) * 0.15
    }

    ship.vel.x *= 0.99
    ship.vel.y *= 0.99

    ship.pos.x += ship.vel.x
    ship.pos.y += ship.vel.y
    ship.pos = wrap(ship.pos)

    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].pos.x += bullets[i].vel.x
      bullets[i].pos.y += bullets[i].vel.y
      bullets[i].pos = wrap(bullets[i].pos)
      bullets[i].life--

      if (bullets[i].life <= 0) {
        bullets.splice(i, 1)
      }
    }

    asteroids.forEach((asteroid) => {
      asteroid.pos.x += asteroid.vel.x
      asteroid.pos.y += asteroid.vel.y
      asteroid.pos = wrap(asteroid.pos)
    })

    for (let i = asteroids.length - 1; i >= 0; i--) {
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (checkBulletCollision(bullets[j], asteroids[i])) {
          bullets.splice(j, 1)
          const asteroid = asteroids[i]
          asteroids.splice(i, 1)

          setScore((s) => s + Math.floor(100 / asteroid.radius))

          if (asteroid.radius > 15) {
            asteroids.push(createAsteroid(asteroid.pos.x, asteroid.pos.y, asteroid.radius / 2))
            asteroids.push(createAsteroid(asteroid.pos.x, asteroid.pos.y, asteroid.radius / 2))
          }
          break
        }
      }

      if (asteroids[i] && checkCollision(ship, asteroids[i])) {
        setLives((l) => {
          const newLives = l - 1
          if (newLives <= 0) {
            setGameState('gameOver')
          } else {
            ship.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
            ship.vel = { x: 0, y: 0 }
          }
          return newLives
        })
        asteroids.splice(i, 1)
      }
    }

    if (asteroids.length === 0) {
      setLevel((l) => l + 1)
      setTimeout(() => {
        const numAsteroids = 3 + level
        for (let i = 0; i < numAsteroids; i++) {
          asteroidsRef.current.push(createAsteroid())
        }
      }, 1000)
    }

    draw()
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const ship = shipRef.current
    const asteroids = asteroidsRef.current
    const bullets = bulletsRef.current

    ctx.save()
    ctx.translate(ship.pos.x, ship.pos.y)
    ctx.rotate(ship.angle)
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-10, -10)
    ctx.lineTo(-5, 0)
    ctx.lineTo(-10, 10)
    ctx.closePath()
    ctx.stroke()

    if (ship.thrust) {
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(-5, 0)
      ctx.lineTo(-15, -5)
      ctx.lineTo(-15, 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    asteroids.forEach((asteroid) => {
      ctx.save()
      ctx.translate(asteroid.pos.x, asteroid.pos.y)
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 2
      ctx.beginPath()
      asteroid.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    })

    ctx.fillStyle = '#fbbf24'
    bullets.forEach((bullet) => {
      ctx.beginPath()
      ctx.arc(bullet.pos.x, bullet.pos.y, 2, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const shoot = () => {
    const ship = shipRef.current
    bulletsRef.current.push({
      pos: { x: ship.pos.x, y: ship.pos.y },
      vel: {
        x: Math.cos(ship.angle) * 7 + ship.vel.x,
        y: Math.sin(ship.angle) * 7 + ship.vel.y,
      },
      life: 60,
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true
      if (e.key === controls.action && gameState === 'playing') {
        e.preventDefault()
        shoot()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState, controls])

  useEffect(() => {
    const animate = () => {
      gameLoop()
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    if (gameState === 'playing') {
      animate()
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
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">Level</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{level}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">Asteroids</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{asteroidsRef.current.length}</div>
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
        gameName="Asteroids"
        hasAction={true}
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
          <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.left === ' ' ? 'Space' : controls.left.replace('Arrow', '').toUpperCase()}</kbd> Rotate Left</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.right === ' ' ? 'Space' : controls.right.replace('Arrow', '').toUpperCase()}</kbd> Rotate Right</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.up === ' ' ? 'Space' : controls.up.replace('Arrow', '').toUpperCase()}</kbd> Thrust Forward</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">{controls.action === ' ' ? 'Space' : controls.action?.replace('Arrow', '').toUpperCase()}</kbd> Shoot</div>
          </div>
        </div>
      )}
    </div>
  )
}
