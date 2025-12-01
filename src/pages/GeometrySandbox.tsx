import { useRef, useEffect, useState } from 'react'
import { Shapes, RotateCcw, Download, Palette, Sparkles } from 'lucide-react'

type DrawMode = 'spiral' | 'circles' | 'fractal' | 'mandala'

interface Point {
  x: number
  y: number
}

export default function GeometrySandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [drawMode, setDrawMode] = useState<DrawMode>('spiral')
  const [color, setColor] = useState('#3b82f6')
  const [lineWidth, setLineWidth] = useState(2)
  const [complexity, setComplexity] = useState(50)

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initial clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `geometry-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const drawSpiral = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const centerX = start.x
    const centerY = start.y
    const maxRadius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
    const turns = complexity / 10

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()

    for (let i = 0; i < turns * 360; i++) {
      const angle = (i * Math.PI) / 180
      const radius = (maxRadius / (turns * 360)) * i
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }

  const drawCirclePattern = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const centerX = start.x
    const centerY = start.y
    const maxRadius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
    const numCircles = Math.floor(complexity / 2)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth

    for (let i = 1; i <= numCircles; i++) {
      const radius = (maxRadius / numCircles) * i

      // Draw concentric circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw radiating circles
      const angle = (i / numCircles) * Math.PI * 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      ctx.beginPath()
      ctx.arc(x, y, radius / 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const drawFractalTree = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    depth: number,
    length: number
  ) => {
    if (depth === 0) return

    const endX = x + length * Math.cos(angle)
    const endY = y + length * Math.sin(angle)

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = color
    ctx.lineWidth = depth / 2
    ctx.stroke()

    // Draw two branches
    drawFractalTree(ctx, endX, endY, angle - Math.PI / 6, depth - 1, length * 0.7)
    drawFractalTree(ctx, endX, endY, angle + Math.PI / 6, depth - 1, length * 0.7)
  }

  const drawFractal = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const depth = Math.min(Math.floor(complexity / 10), 12)

    drawFractalTree(ctx, start.x, start.y, angle, depth, length / 3)
  }

  const drawMandala = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const centerX = start.x
    const centerY = start.y
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
    const petals = Math.floor(complexity / 5)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2

      // Draw petal
      ctx.beginPath()
      for (let j = 0; j <= 100; j++) {
        const t = (j / 100) * Math.PI * 2
        const r = radius * Math.sin(t / 2)
        const x = centerX + r * Math.cos(t + angle)
        const y = centerY + r * Math.sin(t + angle)

        if (j === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Draw inner details
      ctx.beginPath()
      ctx.arc(
        centerX + (radius / 2) * Math.cos(angle),
        centerY + (radius / 2) * Math.sin(angle),
        radius / 8,
        0,
        Math.PI * 2
      )
      ctx.stroke()
    }

    // Center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius / 4, 0, Math.PI * 2)
    ctx.stroke()
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartPoint({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Clear and redraw (for preview)
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    switch (drawMode) {
      case 'spiral':
        drawSpiral(ctx, startPoint, { x, y })
        break
      case 'circles':
        drawCirclePattern(ctx, startPoint, { x, y })
        break
      case 'fractal':
        drawFractal(ctx, startPoint, { x, y })
        break
      case 'mandala':
        drawMandala(ctx, startPoint, { x, y })
        break
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Final draw
    switch (drawMode) {
      case 'spiral':
        drawSpiral(ctx, startPoint, { x, y })
        break
      case 'circles':
        drawCirclePattern(ctx, startPoint, { x, y })
        break
      case 'fractal':
        drawFractal(ctx, startPoint, { x, y })
        break
      case 'mandala':
        drawMandala(ctx, startPoint, { x, y })
        break
    }

    setIsDrawing(false)
    setStartPoint(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center">
          <Shapes className="text-purple-600 dark:text-purple-400" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Geometry Sandbox</h1>
          <p className="text-gray-600 dark:text-gray-300">Click and drag to create beautiful patterns</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Draw Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Pattern Type:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDrawMode('spiral')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                drawMode === 'spiral'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🌀 Spiral
            </button>
            <button
              onClick={() => setDrawMode('circles')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                drawMode === 'circles'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ⭕ Circles
            </button>
            <button
              onClick={() => setDrawMode('fractal')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                drawMode === 'fractal'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🌳 Fractal Tree
            </button>
            <button
              onClick={() => setDrawMode('mandala')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                drawMode === 'mandala'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🪷 Mandala
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Palette size={16} className="inline mr-1" />
                Color:
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <div className="flex gap-1">
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-8 h-10 rounded border-2 border-transparent hover:border-white transition-all"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Sparkles size={16} className="inline mr-1" />
                Complexity: {complexity}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Line Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line Width: {lineWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={clearCanvas}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={18} />
          Clear Canvas
        </button>
        <button
          onClick={downloadCanvas}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download size={18} />
          Download
        </button>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDrawing(false)
            setStartPoint(null)
          }}
          className="border-2 border-gray-700 rounded-lg cursor-crosshair shadow-2xl"
          style={{ backgroundColor: '#0a0a0a' }}
        />
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">How to Use:</h3>
        <div className="space-y-2 text-purple-800 dark:text-purple-200">
          <p>• <strong>Click and drag</strong> on the canvas to create patterns</p>
          <p>• <strong>Start point</strong> = where you click down</p>
          <p>• <strong>End point</strong> = where you release (determines size/angle)</p>
          <p>• <strong>🌀 Spiral:</strong> Creates expanding spirals from center</p>
          <p>• <strong>⭕ Circles:</strong> Concentric circles with radiating patterns</p>
          <p>• <strong>🌳 Fractal Tree:</strong> Recursive branching structure</p>
          <p>• <strong>🪷 Mandala:</strong> Symmetric petal patterns</p>
        </div>
      </div>
    </div>
  )
}
