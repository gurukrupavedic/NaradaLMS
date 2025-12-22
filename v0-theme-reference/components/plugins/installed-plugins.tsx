"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Settings, Trash2, Download, AlertCircle, CheckCircle, Info, RefreshCw } from "lucide-react"

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  isActive: boolean
  hasUpdate: boolean
  newVersion?: string
  rating: number
  downloads: number
  lastUpdated: string
}

const mockPlugins: Plugin[] = [
  {
    id: "seo-optimizer",
    name: "SEO Optimizer Pro",
    description: "Tối ưu hóa SEO toàn diện cho website với các công cụ phân tích từ khóa và meta tags tự động.",
    version: "2.1.4",
    author: "SEO Tools Team",
    category: "SEO",
    isActive: true,
    hasUpdate: true,
    newVersion: "2.2.0",
    rating: 4.8,
    downloads: 15420,
    lastUpdated: "2024-01-15",
  },
  {
    id: "contact-form",
    name: "Advanced Contact Forms",
    description: "Tạo và quản lý các form liên hệ với nhiều tùy chọn tùy chỉnh và tích hợp email marketing.",
    version: "1.8.2",
    author: "Form Builder Inc",
    category: "Forms",
    isActive: true,
    hasUpdate: false,
    rating: 4.6,
    downloads: 8930,
    lastUpdated: "2024-01-10",
  },
  {
    id: "backup-manager",
    name: "Backup Manager",
    description: "Sao lưu tự động dữ liệu website và cơ sở dữ liệu với lịch trình linh hoạt.",
    version: "3.0.1",
    author: "Backup Solutions",
    category: "Backup",
    isActive: false,
    hasUpdate: false,
    rating: 4.9,
    downloads: 12340,
    lastUpdated: "2024-01-08",
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "Bảng điều khiển phân tích chi tiết với biểu đồ và báo cáo thời gian thực.",
    version: "1.5.0",
    author: "Analytics Pro",
    category: "Analytics",
    isActive: true,
    hasUpdate: false,
    rating: 4.7,
    downloads: 6780,
    lastUpdated: "2024-01-12",
  },
  {
    id: "security-shield",
    name: "Security Shield",
    description: "Bảo vệ website khỏi các cuộc tấn công với firewall và quét malware tự động.",
    version: "2.3.1",
    author: "Security Team",
    category: "Security",
    isActive: false,
    hasUpdate: true,
    newVersion: "2.4.0",
    rating: 4.9,
    downloads: 18920,
    lastUpdated: "2024-01-14",
  },
]

export function InstalledPlugins() {
  const [searchTerm, setSearchTerm] = useState("")
  const [plugins, setPlugins] = useState(mockPlugins)
  const [activeTab, setActiveTab] = useState("all")

  const togglePlugin = (pluginId: string) => {
    setPlugins(plugins.map((plugin) => (plugin.id === pluginId ? { ...plugin, isActive: !plugin.isActive } : plugin)))
  }

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())

    switch (activeTab) {
      case "active":
        return matchesSearch && plugin.isActive
      case "inactive":
        return matchesSearch && !plugin.isActive
      default:
        return matchesSearch
    }
  })

  const activeCount = plugins.filter((p) => p.isActive).length
  const inactiveCount = plugins.filter((p) => !p.isActive).length
  const updateCount = plugins.filter((p) => p.hasUpdate).length

  return (
    <div className="space-y-4">
      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Tìm kiếm plugins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <div className="flex gap-2">
          {updateCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Cập nhật tất cả ({updateCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs">
            Tất cả ({plugins.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">
            Kích hoạt ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="text-xs">
            Vô hiệu ({inactiveCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-2">
            {filteredPlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{plugin.name}</h3>
                        <Badge variant={plugin.isActive ? "default" : "secondary"} className="text-xs px-2 py-0">
                          {plugin.isActive ? "Kích hoạt" : "Vô hiệu"}
                        </Badge>
                        {plugin.hasUpdate && (
                          <Badge variant="destructive" className="text-xs px-2 py-0">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Cập nhật
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">{plugin.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span>v{plugin.version}</span>
                        {plugin.hasUpdate && (
                          <span className="text-orange-600 dark:text-orange-400">→ {plugin.newVersion}</span>
                        )}
                        <span>{plugin.author}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {plugin.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {plugin.rating}/5
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {plugin.hasUpdate && (
                          <Button size="sm" variant="default" className="h-7 text-xs px-2">
                            <Download className="h-3 w-3 mr-1" />
                            Cập nhật
                          </Button>
                        )}

                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 bg-transparent">
                          <Settings className="h-3 w-3 mr-1" />
                          Cài đặt
                        </Button>

                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 bg-transparent">
                          <Info className="h-3 w-3 mr-1" />
                          Chi tiết
                        </Button>

                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2 ml-auto">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={plugin.isActive}
                        onCheckedChange={() => togglePlugin(plugin.id)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPlugins.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Không tìm thấy plugin nào</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {searchTerm
                      ? `Không có plugin nào khớp với "${searchTerm}"`
                      : "Chưa có plugin nào trong danh mục này"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
