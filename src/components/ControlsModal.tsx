import { X, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { GameControls } from '../types/controls'

interface ControlsModalProps {
  isOpen: boolean
  onClose: () => void
  controls: GameControls
  onSave: (controls: GameControls) => void
  gameName: string
  hasAction?: boolean
}

export default function ControlsModal({ isOpen, onClose, controls, onSave, gameName, hasAction = false }: ControlsModalProps) {
  const [editingControls, setEditingControls] = useState<GameControls>(controls)
  const [listening, setListening] = useState<keyof GameControls | null>(null)

  useEffect(() => {
    setEditingControls(controls)
  }, [controls])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!listening) return

      e.preventDefault()
      const key = e.key

      // Don't allow duplicate keys
      const existingKeys = Object.entries(editingControls)
        .filter(([k, _]) => k !== listening)
        .map(([_, v]) => v)

      if (existingKeys.includes(key)) {
        alert('This key is already assigned!')
        return
      }

      setEditingControls(prev => ({
        ...prev,
        [listening]: key
      }))
      setListening(null)
    }

    if (listening) {
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [listening, editingControls])

  const presets = {
    arrows: {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      action: ' ',
    },
    wasd: {
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd',
      action: ' ',
    },
  }

  const applyPreset = (preset: 'arrows' | 'wasd') => {
    setEditingControls(presets[preset])
  }

  const handleSave = () => {
    onSave(editingControls)
    onClose()
  }

  if (!isOpen) return null

  const getKeyDisplay = (key: string) => {
    if (key === ' ') return 'Space'
    if (key.startsWith('Arrow')) return key.replace('Arrow', '')
    return key.toUpperCase()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {gameName} Controls
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => applyPreset('arrows')}
              className="flex-1 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium transition-colors"
            >
              Arrow Keys
            </button>
            <button
              onClick={() => applyPreset('wasd')}
              className="flex-1 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-colors"
            >
              WASD
            </button>
          </div>

          <div className="space-y-3">
            {(['up', 'down', 'left', 'right'] as const).map((direction) => (
              <div key={direction} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">
                  {direction}
                </span>
                <button
                  onClick={() => setListening(direction)}
                  className={`px-4 py-2 rounded-lg font-mono font-bold transition-all ${
                    listening === direction
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {listening === direction ? 'Press a key...' : getKeyDisplay(editingControls[direction])}
                </button>
              </div>
            ))}

            {hasAction && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">
                  Action / Shoot
                </span>
                <button
                  onClick={() => setListening('action')}
                  className={`px-4 py-2 rounded-lg font-mono font-bold transition-all ${
                    listening === 'action'
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {listening === 'action' ? 'Press a key...' : getKeyDisplay(editingControls.action || ' ')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Click a button and press any key to rebind. Use presets for quick setup.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Save Controls
          </button>
        </div>
      </div>
    </div>
  )
}
