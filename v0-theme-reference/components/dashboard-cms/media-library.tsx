"use client"

import { Badge } from "@/components/ui/badge"
import { ImageIcon, Video, FileText, Music, Download, Trash2, Eye, MoreHorizontal } from "lucide-react"

interface MediaFile {
  id: string
  name: string
  type: "image" | "video" | "document" | "audio"
  size: string
  uploadDate: string
  dimensions?: string
  duration?: string
  downloads: number
  url: string
}

const mediaFiles: MediaFile[] = [
  {
    id: "1",
    name: "hero-banner-2024.jpg",
    type: "image",
    size: "2.4 MB",
    uploadDate: "2 hours ago",
    dimensions: "1920x1080",
    downloads: 45,
    url: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "2",
    name: "product-demo-video.mp4",
    type: "video",
    size: "15.7 MB",
    uploadDate: "1 day ago",
    dimensions: "1280x720",
    duration: "3:24",
    downloads: 23,
    url: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "3",
    name: "annual-report-2024.pdf",
    type: "document",
    size: "1.2 MB",
    uploadDate: "3 days ago",
    downloads: 156,
    url: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "4",
    name: "podcast-episode-12.mp3",
    type: "audio",
    size: "45.6 MB",
    uploadDate: "1 week ago",
    duration: "45:30",
    downloads: 89,
    url: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "5",
    name: "infographic-climate.png",
    type: "image",
    size: "3.1 MB",
    uploadDate: "1 week ago",
    dimensions: "1080x1920",
    downloads: 67,
    url: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "6",
    name: "interview-highlights.mp4",
    type: "video",
    size: "8.9 MB",
    uploadDate: "2 weeks ago",
    dimensions: "1920x1080",
    duration: "2:15",
    downloads: 34,
    url: "/placeholder.svg?height=120&width=120",
  },
]

const getFileIcon = (type: string) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-5 w-5" />
    case "video":
      return <Video className="h-5 w-5" />
    case "document":
      return <FileText className="h-5 w-5" />
    case "audio":
      return <Music className="h-5 w-5" />
    default:
      return <FileText className="h-5 w-5" />
  }
}

const getFileColor = (type: string) => {
  switch (type) {
    case "image":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "video":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "document":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "audio":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

export default function MediaLibrary() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media Library</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your images, videos, and documents</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Upload Files
          </button>
          <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option>All Files</option>
            <option>Images</option>
            <option>Videos</option>
            <option>Documents</option>
            <option>Audio</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {mediaFiles.map((file) => (
          <div
            key={file.id}
            className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all hover:border-gray-300 dark:hover:border-gray-600"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${getFileColor(file.type)}`}>{getFileIcon(file.type)}</div>
              <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">{file.name}</h4>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{file.size}</span>
                {file.dimensions && (
                  <>
                    <span>•</span>
                    <span>{file.dimensions}</span>
                  </>
                )}
                {file.duration && (
                  <>
                    <span>•</span>
                    <span>{file.duration}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <Badge className={`${getFileColor(file.type)} border-0 text-xs`}>{file.type}</Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">{file.uploadDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Download className="h-3 w-3" />
                <span>{file.downloads} downloads</span>
              </div>

              <div className="flex items-center space-x-1">
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                  <Eye className="h-3 w-3 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                  <Download className="h-3 w-3 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                  <Trash2 className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {mediaFiles.length} of 1,247 files • 2.4 GB used of 10 GB
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
