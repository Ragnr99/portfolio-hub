import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play } from 'lucide-react'
import { getHighScore, submitScore } from '../utils/highscores'

// One-button bird: flap through the gaps. Parallax stars, wing tilt, speed ramp.

const W = 480
const H = 560
const BIRD_X = 120
const BIRD_R = 14
const GRAVITY = 0.34
const FLAP = -6.9
const MAX_FALL = 8.5
const PIPE_W = 66
const GAP_START = 170
const GAP_MIN = 120
const PIPE_SPACING = 240

interface Pipe { x: number; gapY: number; scored: boolean }
interface Star { x: number; y: number; speed: number; size: number }

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => getHighScore('flappy'))
  const [newRecord, setNewRecord] = useState(false)

  const birdYRef = useRef(H / 2)
  const birdVRef = useRef(0)
  const pipesRef = useRef<Pipe[]>([])
  const starsRef = useRef<Star[]>([])
  const scoreRef = useRef(0)
  const rafRef = useRef(0)
  const stateRef = useRef<'ready' | 'playing' | 'gameOver'>('ready')

  useEffect(() => { stateRef.current = gameState }, [gameState])

  const initStars = () => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 0.3 + Math.random() * 1.2, size: Math.random() < 0.85 ? 1 : 2,
    }))
  }

  const initGame = () => {
    birdYRef.current = H / 2
    birdVRef.current = FLAP
    pipesRef.current = [
      { x: W + 100, gapY: H / 2, scored: false },
      { x: W + 100 + PIPE_SPACING, gapY: H / 2 + 60, scored: false },
      { x: W + 100 + PIPE_SPACING * 2, gapY: H / 2 - 60, scored: false },
    ]
    scoreRef.current = 0
    setScore(0)
    setNewRecord(false)
    setGameState('playing')
  }

  const endGame = () => {
    setNewRecord(submitScore('flappy', scoreRef.current))
    setBest(getHighScore('flappy'))
    setGameState('gameOver')
  }

  const flap = () => {
    if (stateRef.current === 'playing') birdVRef.current = FLAP
    else initGame()
  }

  const gapFor = () => Math.max(GAP_MIN, GAP_START - scoreRef.current * 2)
  const speedFor = () => 2.6 + Math.min(2, scoreRef.current * 0.05)

  const step = () => {
    birdVRef.current = Math.min(MAX_FALL, birdVRef.current + GRAVITY)
    birdYRef.current += birdVRef.current

    const speed = speedFor()
    starsRef.current.forEach((s) => {
      s.x -= s.speed * (speed / 2.6)
      if (s.x < 0) { s.x = W; s.y = Math.random() * H }
    })

    pipesRef.current.forEach((p) => { p.x -= speed })

    // recycle pipes
    const first = pipesRef.current[0]
    if (first && first.x < -PIPE_W) {
      pipesRef.current.shift()
      const lastX = pipesRef.current[pipesRef.current.length - 1].x
      const margin = 90
      pipesRef.current.push({
        x: lastX + PIPE_SPACING,
        gapY: margin + Math.random() * (H - margin * 2),
        scored: false,
      })
    }

    // score + collide
    const gap = gapFor()
    for (const p of pipesRef.current) {
      if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
        p.scored = true
        scoreRef.current += 1
        setScore(scoreRef.current)
      }
      const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W
      const inGap = birdYRef.current - BIRD_R > p.gapY - gap / 2 && birdYRef.current + BIRD_R < p.gapY + gap / 2
      if (inX && !inGap) { endGame(); return }
    }

    if (birdYRef.current + BIRD_R > H || birdYRef.current - BIRD_R < 0) endGame()
  }

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // stars
    ctx.fillStyle = '#334155'
    starsRef.current.forEach((s) => ctx.fillRect(s.x, s.y, s.size, s.size))

    // pipes
    const gap = gapFor()
    pipesRef.current.forEach((p) => {
      const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0)
      grad.addColorStop(0, '#16a34a')
      grad.addColorStop(0.5, '#4ade80')
      grad.addColorStop(1, '#15803d')
      ctx.fillStyle = grad
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY - gap / 2)
      ctx.fillRect(p.x, p.gapY + gap / 2, PIPE_W, H - (p.gapY + gap / 2))
      // lips
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(p.x - 4, p.gapY - gap / 2 - 14, PIPE_W + 8, 14)
      ctx.fillRect(p.x - 4, p.gapY + gap / 2, PIPE_W + 8, 14)
    })

    // bird with tilt
    const tilt = Math.max(-0.5, Math.min(0.9, birdVRef.current * 0.06))
    ctx.save()
    ctx.translate(BIRD_X, birdYRef.current)
    ctx.rotate(tilt)
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f97316'                       // beak
    ctx.beginPath()
    ctx.moveTo(BIRD_R - 2, -3); ctx.lineTo(BIRD_R + 8, 0); ctx.lineTo(BIRD_R - 2, 3)
    ctx.fill()
    ctx.fillStyle = '#fff'                          // eye
    ctx.beginPath(); ctx.arc(4, -5, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.beginPath(); ctx.arc(5, -5, 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#eab308'                       // wing
    ctx.beginPath()
    ctx.ellipse(-4, 3, 8, 5, birdVRef.current < 0 ? -0.6 : 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // score
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = 'bold 42px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(scoreRef.current), W / 2, 64)
    if (stateRef.current === 'ready') {
      ctx.font = '16px monospace'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('click or press Space to flap', W / 2, H / 2 + 60)
    }
    ctx.textAlign = 'left'
  }

  useEffect(() => {
    initStars()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { flap(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const animate = () => {
      if (stateRef.current === 'playing') step()
      draw()
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-3">
          {[['Score', score], ['Best', best]].map(([label, v]) => (
            <div key={label as string} className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {gameState !== 'playing' && (
            <button onClick={initGame} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
              <Play size={18} /> Start
            </button>
          )}
          <button onClick={initGame} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <RotateCcw size={18} /> Reset
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseDown={flap}
          className="border-2 border-gray-700 rounded-lg cursor-pointer"
        />
      </div>

      {gameState === 'gameOver' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
            {newRecord ? '🏆 New High Score!' : 'Game Over!'}
          </h3>
          <p className="text-red-800 dark:text-red-200 mb-4">Score: {score}</p>
          <button onClick={initGame} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Play Again
          </button>
        </div>
      )}

      {gameState === 'ready' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">Click / Space / ↑</kbd> Flap</div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">The gaps shrink and the world speeds up as your score climbs. Good luck.</p>
        </div>
      )}
    </div>
  )
}
