import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Play, Pause } from 'lucide-react'
import { getHighScore, submitScore } from '../utils/highscores'

// Classic falling-blocks: 7-bag randomizer, wall kicks, hard drop, level speed curve.

const COLS = 10
const ROWS = 20
const CELL = 28
const BOARD_W = COLS * CELL
const PANEL_W = 130
const CANVAS_W = BOARD_W + PANEL_W
const CANVAS_H = ROWS * CELL

// [shape rotations as [x,y] offsets], color
const PIECES: { blocks: number[][][]; color: string }[] = [
  { blocks: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]]], color: '#22d3ee' },              // I
  { blocks: [[[1, 0], [2, 0], [1, 1], [2, 1]]], color: '#facc15' },                                                // O
  { blocks: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]],
             [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]], color: '#c084fc' },              // T
  { blocks: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]]], color: '#4ade80' },              // S
  { blocks: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]]], color: '#f87171' },              // Z
  { blocks: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]],
             [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]], color: '#60a5fa' },              // J
  { blocks: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]],
             [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]], color: '#fb923c' },              // L
]

const LINE_SCORES = [0, 100, 300, 500, 800]

interface Falling { piece: number; rot: number; x: number; y: number }

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('paused')
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(() => getHighScore('tetris'))
  const [newRecord, setNewRecord] = useState(false)

  const boardRef = useRef<(string | null)[][]>([])
  const fallingRef = useRef<Falling>({ piece: 0, rot: 0, x: 3, y: 0 })
  const nextRef = useRef<number>(0)
  const bagRef = useRef<number[]>([])
  const dropTimerRef = useRef(0)
  const flashRowsRef = useRef<number[]>([])
  const flashUntilRef = useRef(0)
  const rafRef = useRef<number>(0)
  const scoreRef = useRef(0)
  const linesRef = useRef(0)

  const drawFromBag = () => {
    if (bagRef.current.length === 0) {
      bagRef.current = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)
    }
    return bagRef.current.pop() as number
  }

  const cells = (f: Falling) => {
    const rots = PIECES[f.piece].blocks
    return rots[f.rot % rots.length].map(([bx, by]) => [f.x + bx, f.y + by])
  }

  const collides = (f: Falling) =>
    cells(f).some(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && boardRef.current[y]?.[x]))

  const spawn = () => {
    fallingRef.current = { piece: nextRef.current, rot: 0, x: 3, y: -1 }
    nextRef.current = drawFromBag()
    if (collides({ ...fallingRef.current, y: 0 })) {
      endGame()
    }
  }

  const endGame = () => {
    setNewRecord(submitScore('tetris', scoreRef.current))
    setBest(getHighScore('tetris'))
    setGameState('gameOver')
  }

  const lockPiece = () => {
    const color = PIECES[fallingRef.current.piece].color
    cells(fallingRef.current).forEach(([x, y]) => {
      if (y >= 0) boardRef.current[y][x] = color
    })
    const full: number[] = []
    boardRef.current.forEach((row, y) => {
      if (row.every(Boolean)) full.push(y)
    })
    if (full.length) {
      flashRowsRef.current = full
      flashUntilRef.current = performance.now() + 160
      full.forEach((y) => {
        boardRef.current.splice(y, 1)
        boardRef.current.unshift(Array(COLS).fill(null))
      })
      const newLines = linesRef.current + full.length
      const lvl = Math.floor(newLines / 10) + 1
      scoreRef.current += LINE_SCORES[full.length] * Math.floor(linesRef.current / 10 + 1)
      linesRef.current = newLines
      setScore(scoreRef.current)
      setLines(newLines)
      setLevel(lvl)
    }
    spawn()
  }

  const tryMove = (dx: number, dy: number): boolean => {
    const f = { ...fallingRef.current, x: fallingRef.current.x + dx, y: fallingRef.current.y + dy }
    if (!collides(f)) {
      fallingRef.current = f
      return true
    }
    return false
  }

  const tryRotate = () => {
    const f = fallingRef.current
    const rots = PIECES[f.piece].blocks
    const rotated = { ...f, rot: (f.rot + 1) % rots.length }
    for (const kick of [0, -1, 1, -2, 2]) {   // simple wall kicks
      const kicked = { ...rotated, x: rotated.x + kick }
      if (!collides(kicked)) {
        fallingRef.current = kicked
        return
      }
    }
  }

  const hardDrop = () => {
    let dist = 0
    while (tryMove(0, 1)) dist++
    scoreRef.current += dist * 2
    setScore(scoreRef.current)
    lockPiece()
  }

  const initGame = () => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    bagRef.current = []
    nextRef.current = drawFromBag()
    scoreRef.current = 0
    linesRef.current = 0
    setScore(0)
    setLines(0)
    setLevel(1)
    setNewRecord(false)
    spawn()
    dropTimerRef.current = performance.now()
    setGameState('playing')
  }

  const dropInterval = () => Math.max(80, 700 - (Math.floor(linesRef.current / 10)) * 60)

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    const px = x * CELL, py = y * CELL
    ctx.fillStyle = color
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'   // bevel highlight
    ctx.fillRect(px + 1, py + 1, CELL - 2, 4)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(px + 1, py + CELL - 5, CELL - 2, 4)
  }

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // board grid
    ctx.strokeStyle = '#1e293b'
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CANVAS_H); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(BOARD_W, y * CELL); ctx.stroke()
    }

    // settled blocks
    boardRef.current.forEach((row, y) => row.forEach((c, x) => { if (c) drawBlock(ctx, x, y, c) }))

    if (gameState !== 'gameOver' && boardRef.current.length) {
      // ghost piece
      const ghost = { ...fallingRef.current }
      while (!collides({ ...ghost, y: ghost.y + 1 })) ghost.y++
      ctx.globalAlpha = 0.22
      cells(ghost).forEach(([x, y]) => { if (y >= 0) drawBlock(ctx, x, y, PIECES[ghost.piece].color) })
      ctx.globalAlpha = 1

      // falling piece
      cells(fallingRef.current).forEach(([x, y]) => {
        if (y >= 0) drawBlock(ctx, x, y, PIECES[fallingRef.current.piece].color)
      })
    }

    // line-clear flash
    if (performance.now() < flashUntilRef.current) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      flashRowsRef.current.forEach((y) => ctx.fillRect(0, y * CELL, BOARD_W, CELL))
    }

    // side panel: next piece
    ctx.fillStyle = '#111c33'
    ctx.fillRect(BOARD_W, 0, PANEL_W, CANVAS_H)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px monospace'
    ctx.fillText('NEXT', BOARD_W + 18, 28)
    const next = PIECES[nextRef.current]
    next.blocks[0].forEach(([bx, by]) => {
      const px = BOARD_W + 24 + bx * 20, py = 44 + by * 20
      ctx.fillStyle = next.color
      ctx.fillRect(px, py, 18, 18)
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return
      if (e.key === 'ArrowLeft') { tryMove(-1, 0); e.preventDefault() }
      else if (e.key === 'ArrowRight') { tryMove(1, 0); e.preventDefault() }
      else if (e.key === 'ArrowUp') { tryRotate(); e.preventDefault() }
      else if (e.key === 'ArrowDown') {
        if (tryMove(0, 1)) { scoreRef.current += 1; setScore(scoreRef.current) }
        e.preventDefault()
      } else if (e.key === ' ') { hardDrop(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gameState])

  useEffect(() => {
    const animate = (t: number) => {
      if (gameState === 'playing') {
        if (t - dropTimerRef.current >= dropInterval()) {
          dropTimerRef.current = t
          if (!tryMove(0, 1)) lockPiece()
        }
      }
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
          {[['Score', score], ['Lines', lines], ['Level', level], ['Best', best]].map(([label, v]) => (
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
          {gameState === 'playing' && (
            <button onClick={() => setGameState('paused')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2">
              <Pause size={18} /> Pause
            </button>
          )}
          <button onClick={initGame} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <RotateCcw size={18} /> Reset
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="border-2 border-gray-700 rounded-lg" />
      </div>

      {gameState === 'gameOver' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
            {newRecord ? '🏆 New High Score!' : 'Game Over!'}
          </h3>
          <p className="text-red-800 dark:text-red-200 mb-4">Score: {score} · {lines} lines</p>
          <button onClick={initGame} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Play Again
          </button>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">← →</kbd> Move</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">↑</kbd> Rotate</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">↓</kbd> Soft drop</div>
            <div><kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">Space</kbd> Hard drop</div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">Clear lines to level up. The ghost shows where your piece lands.</p>
        </div>
      )}
    </div>
  )
}
