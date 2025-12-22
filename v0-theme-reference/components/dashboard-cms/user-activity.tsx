"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, MessageSquare, Plus, Trash2, Upload } from "lucide-react"

interface Activity {
  id: string
  user: {
    name: string
    avatar?: string
    role: string
  }
  action: "created" | "edited" | "deleted" | "commented" | "uploaded" | "viewed"
  target: string
  timestamp: string
  details?: string
}

const activities: Activity[] = [
  {
    id: "1",
    user: {
      name: "Sarah Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Editor",
    },
    action: "created",
    target: "New article: 'AI in Healthcare'",
    timestamp: "5 minutes ago",
    details: "Technology category",
  },
  {
    id: "2",
    user: {
      name: "Mike Chen",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Writer",
    },
    action: "edited",
    target: "Global Economic Trends 2024",
    timestamp: "15 minutes ago",
    details: "Updated statistics section",
  },
  {
    id: "3",
    user: {
      name: "Emma Wilson",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Admin",
    },
    action: "uploaded",
    target: "hero-banner-2024.jpg",
    timestamp: "1 hour ago",
    details: "2.4 MB image file",
  },
  {
    id: "4",
    user: {
      name: "Alex Rodriguez",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Moderator",
    },
    action: "commented",
    target: "Climate Change Solutions",
    timestamp: "2 hours ago",
    details: "Approved user comment",
  },
  {
    id: "5",
    user: {
      name: "Lisa Wang",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Writer",
    },
    action: "deleted",
    target: "Draft: Outdated Tech News",
    timestamp: "3 hours ago",
    details: "Removed obsolete content",
  },
  {
    id: "6",
    user: {
      name: "John Smith",
      avatar: "/placeholder.svg?height=32&width=32",
      role: "Viewer",
    },
    action: "viewed",
    target: "Remote Work Productivity",
    timestamp: "4 hours ago",
    details: "Page analytics updated",
  },
]

const getActionIcon = (action: string) => {
  switch (action) {
    case "created":
      return <Plus className="h-4 w-4" />
    case "edited":
      return <Edit className="h-4 w-4" />
    case "deleted":
      return <Trash2 className="h-4 w-4" />
    case "commented":
      return <MessageSquare className="h-4 w-4" />
    case "uploaded":
      return <Upload className="h-4 w-4" />
    case "viewed":
      return <Eye className="h-4 w-4" />
    default:
      return <Edit className="h-4 w-4" />
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case "created":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    case "edited":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    case "deleted":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
    case "commented":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    case "uploaded":
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "viewed":
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "Admin":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "Editor":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "Writer":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "Moderator":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    case "Viewer":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

export default function UserActivity() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center space-x-3 p-3 hover:bg-accent/50 rounded-lg transition-colors"
          >
            <div className={`p-2 rounded-full ${getActionColor(activity.action)} flex-shrink-0`}>
              {getActionIcon(activity.action)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{activity.user.name}</span>
                  <Badge className={`${getRoleBadgeColor(activity.user.role)} border-0 text-xs`}>
                    {activity.user.role}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{activity.timestamp}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="capitalize">{activity.action}</span> {activity.target}
                {activity.details && <span className="text-xs"> • {activity.details}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">24 active users today</span>
          <button className="text-primary hover:underline">User management</button>
        </div>
      </div>
    </div>
  )
}
