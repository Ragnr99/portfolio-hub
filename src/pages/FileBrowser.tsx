import { useState } from 'react'
import { Folder, File, Home, ChevronRight, Image, FileText, FileCode, FileArchive, Music, Video } from 'lucide-react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  extension?: string
}

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState('C:\\Users\\Nicholas')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError('')
    setSelectedFile(null)
    setFileContent('')

    try {
      // This will need a backend API to actually work
      // For now, showing the UI structure
      setError('File browsing requires a backend API. This is a UI-only demo.')
      setFiles([])
    } catch (err) {
      setError('Failed to load directory')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="text-blue-500" size={20} />
    }

    const ext = file.extension?.toLowerCase()
    if (!ext) return <File className="text-gray-400" size={20} />

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
      return <Image className="text-green-500" size={20} />
    }
    if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(ext)) {
      return <FileText className="text-blue-400" size={20} />
    }
    if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) {
      return <FileCode className="text-purple-500" size={20} />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="text-orange-500" size={20} />
    }
    if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) {
      return <Music className="text-pink-500" size={20} />
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext)) {
      return <Video className="text-red-500" size={20} />
    }

    return <File className="text-gray-400" size={20} />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  const navigateUp = () => {
    const parts = currentPath.split('\\')
    if (parts.length > 1) {
      parts.pop()
      setCurrentPath(parts.join('\\'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Folder className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">File Browser</h1>
          <p className="text-gray-600 dark:text-gray-300">Browse your local files (read-only)</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-300 text-sm">
          <strong>Note:</strong> This feature requires a backend API to access your local file system.
          This is currently a UI demo showing what the file browser would look like.
        </p>
      </div>

      {/* Path Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPath('C:\\Users\\Nicholas')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Home"
          >
            <Home size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <ChevronRight size={16} className="text-gray-400" />
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {currentPath.split('\\').map((segment, index, arr) => (
              <div key={index} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const newPath = arr.slice(0, index + 1).join('\\')
                    setCurrentPath(newPath)
                  }}
                  className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-medium"
                >
                  {segment}
                </button>
                {index < arr.length - 1 && (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={navigateUp}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          ⬆ Up
        </button>
        <button
          onClick={() => loadDirectory(currentPath)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* File List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No files to display. This is a demo UI - backend integration required.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr
                    key={file.path}
                    onClick={() => {
                      if (file.type === 'directory') {
                        setCurrentPath(file.path)
                      } else {
                        setSelectedFile(file.path)
                      }
                    }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {file.type === 'directory' ? 'Folder' : file.extension?.toUpperCase() || 'File'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">To Enable This Feature:</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300 text-sm">
          <li>Create a simple Node.js/Python backend server</li>
          <li>Add endpoints for:
            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
              <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">GET /api/files?path=...</code> - List directory contents</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">GET /api/file?path=...</code> - Read file contents</li>
            </ul>
          </li>
          <li>Connect this frontend to those API endpoints</li>
          <li>Add proper security/sandboxing to prevent unauthorized access</li>
        </ol>
      </div>
    </div>
  )
}
