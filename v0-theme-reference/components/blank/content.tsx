import { FileText } from "lucide-react"

export default function BlankContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full">
        <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blank Page</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          This is a blank page with sidebar navigation and top bar. You can start building your content here.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Getting Started</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This page demonstrates the layout structure with responsive sidebar and navigation components.
        </p>
      </div>
    </div>
  )
}
