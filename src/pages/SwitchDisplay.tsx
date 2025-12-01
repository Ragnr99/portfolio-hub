import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react'

export default function SwitchDisplay() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string>('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  // Get available video input devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission first so we can see device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            // Stop the temp stream immediately
            stream.getTracks().forEach(track => track.stop())
          })

        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput')
        console.log('Found video devices:', videoDevices)
        setDevices(videoDevices)

        // Try to find the capture card (usually contains "USB" or "Video" in the name)
        const captureCard = videoDevices.find(d =>
          d.label.toLowerCase().includes('usb') ||
          d.label.toLowerCase().includes('video') ||
          d.label.toLowerCase().includes('capture')
        )

        if (captureCard) {
          setSelectedDevice(captureCard.deviceId)
        } else if (videoDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error('Error getting devices:', err)
        setError('Could not access media devices. Please grant camera permissions and refresh.')
      }
    }
    getDevices()
  }, [])

  // Start video stream
  const startCapture = async () => {
    try {
      setError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing capture card:', err)
      setError('Could not access capture card. Make sure it\'s plugged in and you\'ve granted camera permissions.')
    }
  }

  // Stop video stream
  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return

    if (!isFullscreen) {
      videoRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Gamepad2 className="text-red-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Switch Display</h1>
            <p className="text-gray-600">Play your Nintendo Switch games on PC</p>
          </div>
        </div>
      </div>

      {/* Device Selection */}
      {devices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Capture Device:
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            Make sure your capture card is plugged in and refresh the page to grant permissions.
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={startCapture}
          disabled={!selectedDevice || !!stream}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Start Display
        </button>
        <button
          onClick={stopCapture}
          disabled={!stream}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Stop Display
        </button>
        <button
          onClick={toggleMute}
          disabled={!stream}
          className="px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={toggleFullscreen}
          disabled={!stream}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Video Display */}
      <div className="bg-black rounded-lg shadow-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-auto max-h-[70vh] object-contain"
          style={{ backgroundColor: '#000' }}
        >
          Your browser does not support video playback.
        </video>
      </div>

      {/* Instructions */}
      {!stream && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Connect your Switch dock to the capture card via HDMI</li>
            <li>Connect the capture card to your PC via USB</li>
            <li>Select your capture device from the dropdown above</li>
            <li>Click "Start Display" and grant camera/microphone permissions</li>
            <li>Your Switch display should appear below!</li>
          </ol>
          <p className="mt-4 text-sm text-blue-700">
            <strong>Tip:</strong> Use the fullscreen button for an immersive gaming experience!
          </p>
        </div>
      )}
    </div>
  )
}
