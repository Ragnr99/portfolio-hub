import { useRef, useEffect, useState } from 'react'
import { Paintbrush, Minus, RotateCcw, Save, Droplet, Square, Circle, Eraser, Sparkles, Type, Upload, Blend, Undo, Redo, MousePointer, ExternalLink, Pentagon, Star, Hexagon, Triangle, Move, Copy, Scissors, ZoomIn, ZoomOut, Grid3x3, Pipette, Pencil, Stamp } from 'lucide-react'

type Tool = 'brush' | 'line' | 'bucket' | 'rectangle' | 'circle' | 'eraser' | 'spray' | 'text' | 'select' | 'pencil' | 'ellipse' | 'polygon' | 'star' | 'triangle' | 'move' | 'clone' | 'eyedropper' | 'stamp' | 'zoom'

interface Point {
  x: number
  y: number
}

export default function GeometrySandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorWheelRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [lastPoint, setLastPoint] = useState<Point | null>(null)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(3)
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null)

  // Undo/Redo history
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

  // Selection tool
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [selectionOffset, setSelectionOffset] = useState<Point | null>(null)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)

  // Popped windows
  const [poppedWindows, setPoppedWindows] = useState<Window[]>([])

  // RGB values
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)

  // Filter parameters
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [blurRadius, setBlurRadius] = useState(16)
  const [brightnessAmount, setBrightnessAmount] = useState(20)
  const [thresholdValue, setThresholdValue] = useState(128)
  const [sharpenStrength, setSharpenStrength] = useState(5)
  const [contrastAmount, setContrastAmount] = useState(1.5)
  const [saturationAmount, setSaturationAmount] = useState(1.5)
  const [hueRotation, setHueRotation] = useState(0)
  const [noiseAmount, setNoiseAmount] = useState(25)
  const [pixelateSize, setPixelateSize] = useState(10)

  const CANVAS_WIDTH = 1000
  const CANVAS_HEIGHT = 700
  const COLOR_WHEEL_SIZE = 180

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initial white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Save initial state to history
    saveToHistory(ctx)
  }, [])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyStep, history])

  // Close all popped windows when page unloads
  useEffect(() => {
    const handleUnload = () => {
      poppedWindows.forEach(win => {
        if (win && !win.closed) {
          win.close()
        }
      })
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload()
    }
  }, [poppedWindows])

  // Draw color wheel
  useEffect(() => {
    const canvas = colorWheelRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = COLOR_WHEEL_SIZE / 2
    const centerY = COLOR_WHEEL_SIZE / 2
    const radius = COLOR_WHEEL_SIZE / 2 - 10

    // Draw gradient wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180
      const endAngle = angle * Math.PI / 180

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      const hue = angle
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`)
      gradient.addColorStop(1, '#000000')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()
    }
  }, [])

  // Update color when RGB changes
  useEffect(() => {
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    setColor(hex)
  }, [r, g, b])

  // Draw selection rectangle overlay with floating image
  useEffect(() => {
    if (tool !== 'select' || !selectionStart || !selectionEnd) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get the base canvas state (without selection overlay)
    const getBaseState = () => {
      if (history[historyStep]) {
        return history[historyStep]
      }
      return ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    // Animate dashed line
    let dashOffset = 0
    const intervalId = setInterval(() => {
      // Restore base canvas
      const baseState = getBaseState()
      ctx.putImageData(baseState, 0, 0)

      // Draw the floating selected image
      if (selectedImage) {
        const minX = Math.min(selectionStart.x, selectionEnd.x)
        const minY = Math.min(selectionStart.y, selectionEnd.y)
        ctx.putImageData(selectedImage, minX, minY)
      }

      // Draw selection box on top
      ctx.strokeStyle = '#0066ff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.lineDashOffset = dashOffset
      ctx.strokeRect(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x - selectionStart.x,
        selectionEnd.y - selectionStart.y
      )
      ctx.setLineDash([])
      dashOffset = (dashOffset + 1) % 10
    }, 50)

    return () => {
      clearInterval(intervalId)
    }
  }, [tool, selectionStart, selectionEnd, selectedImage, history, historyStep])

  // Undo/Redo Functions
  const saveToHistory = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1)
      newHistory.push(imageData)
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryStep(prev => Math.min(prev + 1, 49))
  }

  const undo = () => {
    if (historyStep <= 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newStep = historyStep - 1
    setHistoryStep(newStep)
    ctx.putImageData(history[newStep], 0, 0)
  }

  const redo = () => {
    if (historyStep >= history.length - 1) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newStep = historyStep + 1
    setHistoryStep(newStep)
    ctx.putImageData(history[newStep], 0, 0)
  }

  // Pop-out Window Function
  const popOutCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL()
    const newWindow = window.open('', '_blank', 'width=1200,height=900')

    if (!newWindow) {
      alert('Please allow pop-ups for this site')
      return
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Paint Editor Clone</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: #1f2937;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              max-width: 1100px;
              margin: 0 auto;
            }
            canvas {
              border: 2px solid #374151;
              border-radius: 8px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
              background: white;
              display: block;
              margin: 0 auto 20px;
            }
            .buttons {
              display: flex;
              justify-content: center;
              gap: 10px;
            }
            button {
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .save-btn {
              background: #10b981;
              color: white;
            }
            .save-btn:hover {
              background: #059669;
            }
            .close-btn {
              background: #ef4444;
              color: white;
            }
            .close-btn:hover {
              background: #dc2626;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <canvas id="cloneCanvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
            <div class="buttons">
              <button class="save-btn" onclick="saveClone()">Save Clone</button>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
          </div>
          <script>
            const canvas = document.getElementById('cloneCanvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
            };
            img.src = '${dataUrl}';

            function saveClone() {
              const link = document.createElement('a');
              link.download = 'paint-clone-' + Date.now() + '.png';
              link.href = canvas.toDataURL();
              link.click();
            }
          </script>
        </body>
      </html>
    `)

    newWindow.document.close()
    setPoppedWindows(prev => [...prev, newWindow])
  }

  const handleColorWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = colorWheelRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const imageData = ctx.getImageData(x, y, 1, 1).data
    setR(imageData[0])
    setG(imageData[1])
    setB(imageData[2])
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    saveToHistory(ctx)
  }

  const saveCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `paint-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const importImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current
          if (!canvas) return

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          // Draw image on canvas (resize to fit)
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
          saveToHistory(ctx)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  // Image Filters
  const applyConvolution = (kernel: number[][], divisor: number = 1) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data
    const output = new Uint8ClampedArray(pixels)

    const kSize = kernel.length
    const half = Math.floor(kSize / 2)

    for (let y = half; y < CANVAS_HEIGHT - half; y++) {
      for (let x = half; x < CANVAS_WIDTH - half; x++) {
        let r = 0, g = 0, b = 0

        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = x + kx - half
            const py = y + ky - half
            const pos = (py * CANVAS_WIDTH + px) * 4

            r += pixels[pos] * kernel[ky][kx]
            g += pixels[pos + 1] * kernel[ky][kx]
            b += pixels[pos + 2] * kernel[ky][kx]
          }
        }

        const pos = (y * CANVAS_WIDTH + x) * 4
        output[pos] = r / divisor
        output[pos + 1] = g / divisor
        output[pos + 2] = b / divisor
      }
    }

    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = output[i]
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyGaussianBlur = () => {
    applyConvolution([
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ], blurRadius)
  }

  const applySharpen = () => {
    const center = sharpenStrength
    applyConvolution([
      [0, -1, 0],
      [-1, center, -1],
      [0, -1, 0]
    ], 1)
  }

  const applyEdgeDetect = () => {
    applyConvolution([
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1]
    ], 1)
  }

  const applyEmboss = () => {
    applyConvolution([
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2]
    ], 1)
  }

  const applyGrayscale = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
      pixels[i] = avg
      pixels[i + 1] = avg
      pixels[i + 2] = avg
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyInvert = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i]
      pixels[i + 1] = 255 - pixels[i + 1]
      pixels[i + 2] = 255 - pixels[i + 2]
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applySepia = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      pixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      pixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      pixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyBrightness = (amount?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    const adjustAmount = amount !== undefined ? amount : brightnessAmount

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + adjustAmount))
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + adjustAmount))
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + adjustAmount))
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyThreshold = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
      const val = avg > thresholdValue ? 255 : 0
      pixels[i] = val
      pixels[i + 1] = val
      pixels[i + 2] = val
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyContrast = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data
    const factor = contrastAmount

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(255, Math.max(0, factor * (pixels[i] - 128) + 128))
      pixels[i + 1] = Math.min(255, Math.max(0, factor * (pixels[i + 1] - 128) + 128))
      pixels[i + 2] = Math.min(255, Math.max(0, factor * (pixels[i + 2] - 128) + 128))
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applySaturation = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
      pixels[i] = Math.min(255, Math.max(0, gray + saturationAmount * (pixels[i] - gray)))
      pixels[i + 1] = Math.min(255, Math.max(0, gray + saturationAmount * (pixels[i + 1] - gray)))
      pixels[i + 2] = Math.min(255, Math.max(0, gray + saturationAmount * (pixels[i + 2] - gray)))
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyNoise = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseAmount
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise))
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise))
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise))
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyPixelate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data
    const size = pixelateSize

    for (let y = 0; y < CANVAS_HEIGHT; y += size) {
      for (let x = 0; x < CANVAS_WIDTH; x += size) {
        let r = 0, g = 0, b = 0, count = 0

        for (let py = 0; py < size && y + py < CANVAS_HEIGHT; py++) {
          for (let px = 0; px < size && x + px < CANVAS_WIDTH; px++) {
            const i = ((y + py) * CANVAS_WIDTH + (x + px)) * 4
            r += pixels[i]
            g += pixels[i + 1]
            b += pixels[i + 2]
            count++
          }
        }

        r = Math.floor(r / count)
        g = Math.floor(g / count)
        b = Math.floor(b / count)

        for (let py = 0; py < size && y + py < CANVAS_HEIGHT; py++) {
          for (let px = 0; px < size && x + px < CANVAS_WIDTH; px++) {
            const i = ((y + py) * CANVAS_WIDTH + (x + px)) * 4
            pixels[i] = r
            pixels[i + 1] = g
            pixels[i + 2] = b
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const applyHueRotate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data
    const rotation = (hueRotation * Math.PI) / 180

    // RGB to HSL conversion with hue rotation
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] / 255
      const g = pixels[i + 1] / 255
      const b = pixels[i + 2] / 255

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let h = 0, s = 0
      const l = (max + min) / 2

      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        if (max === r) {
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        } else if (max === g) {
          h = ((b - r) / d + 2) / 6
        } else {
          h = ((r - g) / d + 4) / 6
        }
      }

      // Rotate hue
      h = (h + hueRotation / 360) % 1
      if (h < 0) h += 1

      // HSL to RGB conversion
      const hueToRgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      if (s === 0) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = l * 255
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        pixels[i] = hueToRgb(p, q, h + 1 / 3) * 255
        pixels[i + 1] = hueToRgb(p, q, h) * 255
        pixels[i + 2] = hueToRgb(p, q, h - 1 / 3) * 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const drawBrush = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const drawLine = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const drawRectangle = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y)
  }

  const drawCircle = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const radius = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.arc(from.x, from.y, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  const drawSpray = (ctx: CanvasRenderingContext2D, point: Point) => {
    ctx.fillStyle = color
    const density = 20
    const spread = lineWidth * 2

    for (let i = 0; i < density; i++) {
      const offsetX = (Math.random() - 0.5) * spread
      const offsetY = (Math.random() - 0.5) * spread
      ctx.fillRect(point.x + offsetX, point.y + offsetY, 1, 1)
    }
  }

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const pixels = imageData.data

    const fillR = parseInt(fillColor.slice(1, 3), 16)
    const fillG = parseInt(fillColor.slice(3, 5), 16)
    const fillB = parseInt(fillColor.slice(5, 7), 16)

    const startPos = (startY * CANVAS_WIDTH + startX) * 4
    const startR = pixels[startPos]
    const startG = pixels[startPos + 1]
    const startB = pixels[startPos + 2]

    if (startR === fillR && startG === fillG && startB === fillB) return

    const stack: Point[] = [{ x: startX, y: startY }]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const { x, y } = stack.pop()!
      const key = `${x},${y}`

      if (visited.has(key)) continue
      if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue

      const pos = (y * CANVAS_WIDTH + x) * 4
      const pR = pixels[pos]
      const pG = pixels[pos + 1]
      const pB = pixels[pos + 2]

      if (pR !== startR || pG !== startG || pB !== startB) continue

      pixels[pos] = fillR
      pixels[pos + 1] = fillG
      pixels[pos + 2] = fillB
      pixels[pos + 3] = 255

      visited.add(key)

      stack.push({ x: x + 1, y })
      stack.push({ x: x - 1, y })
      stack.push({ x, y: y + 1 })
      stack.push({ x, y: y - 1 })
    }

    ctx.putImageData(imageData, 0, 0)
    saveToHistory(ctx)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left)
    const y = Math.floor(e.clientY - rect.top)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'bucket') {
      floodFill(ctx, x, y, color)
      return
    }

    if (tool === 'text') {
      const text = prompt('Enter text:')
      if (text) {
        ctx.font = `${lineWidth * 8}px Arial`
        ctx.fillStyle = color
        ctx.fillText(text, x, y)
        saveToHistory(ctx)
      }
      return
    }

    if (tool === 'select') {
      // Check if clicking inside existing selection to move it
      if (selectionStart && selectionEnd && selectedImage) {
        const minX = Math.min(selectionStart.x, selectionEnd.x)
        const maxX = Math.max(selectionStart.x, selectionEnd.x)
        const minY = Math.min(selectionStart.y, selectionEnd.y)
        const maxY = Math.max(selectionStart.y, selectionEnd.y)

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          // Start dragging selection
          setIsDraggingSelection(true)
          setSelectionOffset({ x: x - minX, y: y - minY })
          setIsDrawing(true)
          return
        }
      }

      // Click outside - deselect and start new selection
      if (selectedImage && selectionStart && selectionEnd) {
        // Paste the selection back before starting new one
        const minX = Math.min(selectionStart.x, selectionEnd.x)
        const minY = Math.min(selectionStart.y, selectionEnd.y)
        ctx.putImageData(selectedImage, minX, minY)
        saveToHistory(ctx)
      }

      setSelectionStart({ x, y })
      setSelectionEnd(null)
      setSelectedImage(null)
      setIsDraggingSelection(false)
      setIsDrawing(true)
      return
    }

    setIsDrawing(true)
    setStartPoint({ x, y })
    setLastPoint({ x, y })

    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      setSavedImageData(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT))
    } else if (tool === 'brush' || tool === 'eraser') {
      drawBrush(ctx, { x, y }, { x, y })
    } else if (tool === 'spray') {
      drawSpray(ctx, { x, y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left)
    const y = Math.floor(e.clientY - rect.top)

    if (tool === 'select' && isDrawing) {
      if (isDraggingSelection && selectionStart && selectionEnd && selectedImage && selectionOffset) {
        // Moving existing selection
        const newX = x - selectionOffset.x
        const newY = y - selectionOffset.y
        setSelectionStart({ x: newX, y: newY })
        setSelectionEnd({
          x: newX + selectedImage.width,
          y: newY + selectedImage.height
        })
      } else if (selectionStart) {
        // Drawing new selection
        setSelectionEnd({ x, y })
      }
      return
    }

    if (!isDrawing || !startPoint) return

    if (tool === 'brush' || tool === 'eraser') {
      if (lastPoint) {
        drawBrush(ctx, lastPoint, { x, y })
      }
      setLastPoint({ x, y })
    } else if (tool === 'spray') {
      drawSpray(ctx, { x, y })
    } else if (tool === 'line') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawLine(ctx, startPoint, { x, y })
    } else if (tool === 'rectangle') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawRectangle(ctx, startPoint, { x, y })
    } else if (tool === 'circle') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawCircle(ctx, startPoint, { x, y })
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left)
    const y = Math.floor(e.clientY - rect.top)

    if (tool === 'select' && isDrawing) {
      if (isDraggingSelection) {
        // Finished dragging - just stop
        setIsDraggingSelection(false)
        setIsDrawing(false)
        return
      }

      if (selectionStart) {
        // Finished drawing new selection - cut the selected area
        setSelectionEnd({ x, y })
        setIsDrawing(false)

        const minX = Math.min(selectionStart.x, x)
        const maxX = Math.max(selectionStart.x, x)
        const minY = Math.min(selectionStart.y, y)
        const maxY = Math.max(selectionStart.y, y)
        const width = maxX - minX
        const height = maxY - minY

        if (width > 0 && height > 0) {
          // Extract the selected area
          const selectedData = ctx.getImageData(minX, minY, width, height)
          setSelectedImage(selectedData)

          // Clear the selected area (replace with white)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(minX, minY, width, height)

          // Update selection bounds
          setSelectionStart({ x: minX, y: minY })
          setSelectionEnd({ x: maxX, y: maxY })
        }
      }
      return
    }

    if (!isDrawing || !startPoint) return

    if (tool === 'line') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawLine(ctx, startPoint, { x, y })
    } else if (tool === 'rectangle') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawRectangle(ctx, startPoint, { x, y })
    } else if (tool === 'circle') {
      if (savedImageData) {
        ctx.putImageData(savedImageData, 0, 0)
      }
      drawCircle(ctx, startPoint, { x, y })
    }

    // Save to history after drawing
    saveToHistory(ctx)

    setIsDrawing(false)
    setStartPoint(null)
    setLastPoint(null)
    setSavedImageData(null)
  }

  const tools = [
    { id: 'select' as Tool, icon: MousePointer, label: 'Select' },
    { id: 'brush' as Tool, icon: Paintbrush, label: 'Brush' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
    { id: 'line' as Tool, icon: Minus, label: 'Line' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
    { id: 'ellipse' as Tool, icon: Circle, label: 'Ellipse' },
    { id: 'triangle' as Tool, icon: Triangle, label: 'Triangle' },
    { id: 'polygon' as Tool, icon: Pentagon, label: 'Polygon' },
    { id: 'star' as Tool, icon: Star, label: 'Star' },
    { id: 'bucket' as Tool, icon: Droplet, label: 'Fill' },
    { id: 'spray' as Tool, icon: Sparkles, label: 'Spray' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
    { id: 'text' as Tool, icon: Type, label: 'Text' },
    { id: 'eyedropper' as Tool, icon: Pipette, label: 'Dropper' },
    { id: 'move' as Tool, icon: Move, label: 'Move' },
    { id: 'clone' as Tool, icon: Copy, label: 'Clone' },
    { id: 'stamp' as Tool, icon: Stamp, label: 'Stamp' },
    { id: 'zoom' as Tool, icon: ZoomIn, label: 'Zoom' },
  ]

  return (
    <div className="space-y-4">
      {/* Top Controls Bar - All small options */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Undo/Redo/Pop-out */}
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            title="Undo (Ctrl+Z)"
            className={`p-2 rounded-lg transition-all ${
              historyStep <= 0
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Undo size={18} />
          </button>
          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className={`p-2 rounded-lg transition-all ${
              historyStep >= history.length - 1
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Redo size={18} />
          </button>
          <button
            onClick={popOutCanvas}
            title="Pop Out Canvas"
            className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all border border-purple-700"
          >
            <ExternalLink size={18} />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* Tools */}
        <div className="flex gap-1.5">
          {tools.map(({ id, icon: Icon, label }) => (
            <div key={id} className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => setTool(id)}
                title={label}
                className={`p-1.5 rounded-lg transition-all ${
                  tool === id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <Icon size={16} />
              </button>
              <span className="text-[9px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>

        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* Line Width */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Size: {lineWidth}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
        </div>
      </div>

      {/* Main Layout: Filters Left | Canvas Center | Color Right */}
      <div className="flex gap-4 items-start">
        {/* Left Side: Image Filters */}
        <div className="relative">
          <div className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Blend size={16} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Filters</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'blur' ? null : 'blur')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'blur'
                    ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                }`}
              >
                Blur ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'sharpen' ? null : 'sharpen')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'sharpen'
                    ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                }`}
              >
                Sharpen ›
              </button>
              <button onClick={applyEdgeDetect} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-left">
                Edge Detect
              </button>
              <button onClick={applyEmboss} className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded text-xs hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors text-left">
                Emboss
              </button>
              <button onClick={applyGrayscale} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left">
                Grayscale
              </button>
              <button onClick={applySepia} className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-left">
                Sepia
              </button>
              <button onClick={applyInvert} className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-left">
                Invert
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'threshold' ? null : 'threshold')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'threshold'
                    ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                }`}
              >
                Threshold ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'brightness' ? null : 'brightness')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'brightness'
                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
              >
                Brightness ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'contrast' ? null : 'contrast')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'contrast'
                    ? 'bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200'
                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50'
                }`}
              >
                Contrast ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'saturation' ? null : 'saturation')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'saturation'
                    ? 'bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200'
                    : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50'
                }`}
              >
                Saturation ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'noise' ? null : 'noise')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'noise'
                    ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                }`}
              >
                Noise ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'pixelate' ? null : 'pixelate')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'pixelate'
                    ? 'bg-lime-200 dark:bg-lime-800 text-lime-800 dark:text-lime-200'
                    : 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 hover:bg-lime-200 dark:hover:bg-lime-900/50'
                }`}
              >
                Pixelate ›
              </button>
              <button
                onClick={() => setSelectedFilter(selectedFilter === 'huerotate' ? null : 'huerotate')}
                className={`px-3 py-1.5 rounded text-xs transition-colors text-left ${
                  selectedFilter === 'huerotate'
                    ? 'bg-fuchsia-200 dark:bg-fuchsia-800 text-fuchsia-800 dark:text-fuchsia-200'
                    : 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/50'
                }`}
              >
                Hue Rotate ›
              </button>
            </div>
          </div>

          {/* Filter Parameters Panel - Absolute positioned overlay to the LEFT */}
          {selectedFilter && (
            <div className="absolute right-full top-0 mr-2 w-56 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-2xl z-50">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Parameters</h3>

              {selectedFilter === 'blur' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Blur Divisor: {blurRadius}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="32"
                      value={blurRadius}
                      onChange={(e) => setBlurRadius(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Higher = more blur</p>
                  </div>
                  <button
                    onClick={applyGaussianBlur}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    Apply Blur
                  </button>
                </div>
              )}

              {selectedFilter === 'sharpen' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Strength: {sharpenStrength}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sharpenStrength}
                      onChange={(e) => setSharpenStrength(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Higher = sharper</p>
                  </div>
                  <button
                    onClick={applySharpen}
                    className="w-full px-3 py-2 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition-colors"
                  >
                    Apply Sharpen
                  </button>
                </div>
              )}

              {selectedFilter === 'threshold' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Threshold: {thresholdValue}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Cutoff point for black/white</p>
                  </div>
                  <button
                    onClick={applyThreshold}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Apply Threshold
                  </button>
                </div>
              )}

              {selectedFilter === 'brightness' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                      Amount: {brightnessAmount > 0 ? '+' : ''}{brightnessAmount}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={brightnessAmount}
                      onChange={(e) => setBrightnessAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Negative = darker, Positive = brighter</p>
                  </div>
                  <button
                    onClick={() => applyBrightness()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Brightness
                  </button>
                </div>
              )}

              {/* Contrast Parameters */}
              {selectedFilter === 'contrast' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white">Adjust Contrast</h4>
                  <div>
                    <label className="text-[10px] text-gray-600 dark:text-gray-400 block mb-1">
                      Contrast Amount: {contrastAmount.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={contrastAmount}
                      onChange={(e) => setContrastAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">&lt;1 = less contrast, &gt;1 = more contrast</p>
                  </div>
                  <button
                    onClick={() => applyContrast()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Contrast
                  </button>
                </div>
              )}

              {/* Saturation Parameters */}
              {selectedFilter === 'saturation' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white">Adjust Saturation</h4>
                  <div>
                    <label className="text-[10px] text-gray-600 dark:text-gray-400 block mb-1">
                      Saturation Amount: {saturationAmount.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={saturationAmount}
                      onChange={(e) => setSaturationAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">0 = grayscale, 1 = normal, &gt;1 = oversaturated</p>
                  </div>
                  <button
                    onClick={() => applySaturation()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Saturation
                  </button>
                </div>
              )}

              {/* Noise Parameters */}
              {selectedFilter === 'noise' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white">Add Noise</h4>
                  <div>
                    <label className="text-[10px] text-gray-600 dark:text-gray-400 block mb-1">
                      Noise Amount: {noiseAmount}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={noiseAmount}
                      onChange={(e) => setNoiseAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Higher = more grainy texture</p>
                  </div>
                  <button
                    onClick={() => applyNoise()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Noise
                  </button>
                </div>
              )}

              {/* Pixelate Parameters */}
              {selectedFilter === 'pixelate' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white">Pixelate Effect</h4>
                  <div>
                    <label className="text-[10px] text-gray-600 dark:text-gray-400 block mb-1">
                      Pixel Size: {pixelateSize}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      value={pixelateSize}
                      onChange={(e) => setPixelateSize(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Larger = more pixelated look</p>
                  </div>
                  <button
                    onClick={() => applyPixelate()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Pixelate
                  </button>
                </div>
              )}

              {/* Hue Rotate Parameters */}
              {selectedFilter === 'huerotate' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white">Rotate Hue</h4>
                  <div>
                    <label className="text-[10px] text-gray-600 dark:text-gray-400 block mb-1">
                      Rotation: {hueRotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hueRotation}
                      onChange={(e) => setHueRotation(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">0° = original, 360° = full rotation</p>
                  </div>
                  <button
                    onClick={() => applyHueRotate()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Apply Hue Rotate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col gap-3 items-center">
          <div className="relative">
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
                setLastPoint(null)
                setSavedImageData(null)
              }}
              className={`border-2 border-gray-700 rounded-lg shadow-2xl bg-white ${
                tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
              }`}
            />
            {/* Clear button overlay */}
            <button
              onClick={clearCanvas}
              className="absolute top-2 right-2 p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-lg transition-colors"
              title="Clear Canvas"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={importImage}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={saveCanvas}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Right Side: Color Wheel */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Color</h3>
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={colorWheelRef}
              width={COLOR_WHEEL_SIZE}
              height={COLOR_WHEEL_SIZE}
              onClick={handleColorWheelClick}
              className="cursor-crosshair rounded-lg border border-gray-300 dark:border-gray-600"
              style={{ width: '140px', height: '140px' }}
            />

            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-red-600 dark:text-red-400 w-4">R</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={r}
                  onChange={(e) => setR(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{r}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-green-600 dark:text-green-400 w-4">G</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={g}
                  onChange={(e) => setG(Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{g}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 w-4">B</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{b}</span>
              </div>
            </div>

            <div
              className="w-full h-10 rounded border-2 border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
