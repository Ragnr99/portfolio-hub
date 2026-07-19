import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play, Pause } from 'lucide-react'
import { getHighScore, submitScore } from '../utils/highscores'

// Brick breaker: mouse or arrow keys, angle control off the paddle, particles,
// speed ramps per level, one ball, three lives.

const W = 720
const H = 520
const PADDLE_W = 110
const PADDLE_H = 12
const BALL_R = 7
const BRICK_ROWS = 6
const BRICK_COLS = 12
const BRICK_H = 22
const BRICK_GAP = 4
const BRICK_TOP = 60
const ROW_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#c084fc']

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('paused')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(() => getHighScore('breakout'))
  const [newRecord, setNewRecord] = useState(false)

  const paddleXRef = useRef(W / 2 - PADDLE_W / 2)
  const ballRef = useRef({ x: W / 2, y: H - 80, vx: 3.4, vy: -3.4, stuck: true })
  const bricksRef = useRef<boolean[][]>([])
  const particlesRef = useRef<Particle[]>([])
  const keysRef = useRef<Record<string, boolean>>({})
  const rafRef = useRef(0)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const levelRef = useRef(1)

  const brickW = (W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS

  const resetBricks = () => {
    bricksRef.current = Array.from({ length: BRICK_ROWS }, () => Array(BRICK_COLS).fill(true))
  }

  const resetBall = () => {
    ballRef.current = { x: paddleXRef.current + PADDLE_W / 2, y: H - 60, vx: 0, vy: 0, stuck: true }
  }

  const launchBall = () => {
    const b = ballRef.current
    if (!b.stuck) return
    const speed = 4 + (levelRef.current - 1) * 0.6
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
    b.vx = Math.cos(angle) * speed
    b.vy = Math.sin(angle) * speed
    b.stuck = false
  }

  const initGame = (fromLevel = 1) => {
    levelRef.current = fromLevel
    setLevel(fromLevel)
    if (fromLevel === 1) {
      scoreRef.current = 0
      livesRef.current = 3
      setScore(0)
      setLives(3)
      setNewRecord(false)
    }
    resetBricks()
    paddleXRef.current = W / 2 - PADDLE_W / 2
    resetBall()
    particlesRef.current = []
    setGameState('playing')
  }

  const endGame = () => {
    setNewRecord(submitScore('breakout', scoreRef.current))
    setBest(getHighScore('breakout'))
    setGameState('gameOver')
  }

  const burst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 1 + Math.random() * 3
      particlesRef.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 26, color })
    }
  }

  const step = () => {
    // paddle: keyboard
    if (keysRef.current['ArrowLeft']) paddleXRef.current = Math.max(0, paddleXRef.current - 8)
    if (keysRef.current['ArrowRight']) paddleXRef.current = Math.min(W - PADDLE_W, paddleXRef.current + 8)

    const b = ballRef.current
    if (b.stuck) {
      b.x = paddleXRef.current + PADDLE_W / 2
      b.y = H - 60
      return
    }
    b.x += b.vx
    b.y += b.vy

    // walls
    if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) }
    if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) }
    if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) }

    // paddle bounce: hit position controls angle
    const px = paddleXRef.current
    if (b.vy > 0 && b.y > H - 40 - BALL_R && b.y < H - 40 + PADDLE_H && b.x > px - BALL_R && b.x < px + PADDLE_W + BALL_R) {
      const rel = (b.x - (px + PADDLE_W / 2)) / (PADDLE_W / 2)   // -1..1
      const speed = Math.hypot(b.vx, b.vy) * 1.015               // slow ramp
      const angle = -Math.PI / 2 + rel * 1.05
      b.vx = Math.cos(angle) * speed
      b.vy = Math.sin(angle) * speed
      b.y = H - 40 - BALL_R
    }

    // bricks
    outer:
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricksRef.current[r][c]) continue
        const bx = BRICK_GAP + c * (brickW + BRICK_GAP)
        const by = BRICK_TOP + r * (BRICK_H + BRICK_GAP)
        if (b.x > bx - BALL_R && b.x < bx + brickW + BALL_R && b.y > by - BALL_R && b.y < by + BRICK_H + BALL_R) {
          bricksRef.current[r][c] = false
          burst(b.x, b.y, ROW_COLORS[r])
          scoreRef.current += (BRICK_ROWS - r) * 10
          setScore(scoreRef.current)
          // bounce off the nearest face
          const overlapX = Math.min(b.x - (bx - BALL_R), (bx + brickW + BALL_R) - b.x)
          const overlapY = Math.min(b.y - (by - BALL_R), (by + BRICK_H + BALL_R) - b.y)
          if (overlapX < overlapY) b.vx = -b.vx
          else b.vy = -b.vy
          break outer
        }
      }
    }

    // cleared the wall?
    if (bricksRef.current.every((row) => row.every((v) => !v))) {
      scoreRef.current += 100 * levelRef.current
      setScore(scoreRef.current)
      initGame(levelRef.current + 1)
      return
    }

    // dropped the ball
    if (b.y > H + BALL_R) {
      livesRef.current -= 1
      setLives(livesRef.current)
      if (livesRef.current <= 0) endGame()
      else resetBall()
    }

    // particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 1
      return p.life > 0
    })
  }

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // bricks
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricksRef.current[r]?.[c]) continue
        const bx = BRICK_GAP + c * (brickW + BRICK_GAP)
        const by = BRICK_TOP + r * (BRICK_H + BRICK_GAP)
        ctx.fillStyle = ROW_COLORS[r]
        ctx.fillRect(bx, by, brickW, BRICK_H)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(bx, by, brickW, 4)
      }
    }

    // paddle
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(paddleXRef.current, H - 40, PADDLE_W, PADDLE_H)

    // ball
    const b = ballRef.current
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()

    // particles
    particlesRef.current.forEach((p) => {
      ctx.globalAlpha = p.life / 26
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
    })
    ctx.globalAlpha = 1

    if (b.stuck && gameState === 'playing') {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('click or press Space to launch', W / 2, H - 100)
      ctx.textAlign = 'left'
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true
      if (e.key === ' ') { launchBall(); e.preventDefault() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (W / rect.width)
      paddleXRef.current = Math.min(W - PADDLE_W, Math.max(0, x - PADDLE_W / 2))
    }
    const onClick = () => launchBall()
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    return () => { canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('click', onClick) }
  }, [])

  useEffect(() => {
    const animate = () => {
      if (gameState === 'playing') step()
      draw()
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [gameState])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-3">
          {[['Score', score], ['Lives', lives], ['Level', level], ['Best', best]].map(([label, v]) => (
            <div key={label as string} className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {gameState !== 'playing' && (
            <button onClick={() => initGame(1)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
              <Play size={18} /> Start
            </button>
          )}
          {gameState === 'playing' && (
            <button onClick={() => setGameState('paused')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2">
              <Pause size={18} /> Pause
            </button>
          )}
          <button onClick={() => initGame(1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <RotateCcw size={18} /> Reset
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-gray-700 rounded-lg cursor-none" />
      </div>

      {gameState === 'gameOver' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
            {newRecord ? '🏆 New High Score!' : 'Game Over!'}
          </h3>
          <p className="text-red-800 dark:text-red-200 mb-4">Score: {score} · reached level {level}</p>
          <button onClick={() => initGame(1)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Play Again
          </button>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">Mouse / ← →</kbd> Move paddle</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">Click / Space</kbd> Launch ball</div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">Where the ball hits the paddle controls the angle. Higher rows score more.</p>
        </div>
      )}
    </div>
  )
}
