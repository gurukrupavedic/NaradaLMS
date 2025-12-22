"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Edit, Trash2 } from "lucide-react"

interface ScheduledPost {
  id: string
  title: string
  author: {
    name: string
    avatar?: string
  }
  category: string
  scheduledDate: string
  scheduledTime: string
  status: "scheduled" | "publishing" | "failed"
  platform: string[]
}

const scheduledPosts: ScheduledPost[] = [
  {
    id: "1",
    title: "Weekly Tech Roundup: Latest Innovations",
    author: {
      name: "Tech Editor",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Technology",
    scheduledDate: "Today",
    scheduledTime: "6:00 PM",
    status: "scheduled",
    platform: ["Website", "Twitter", "LinkedIn"],
  },
  {
    id: "2",
    title: "Market Analysis: Q4 Financial Report",
    author: {
      name: "Financial Analyst",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Business",
    scheduledDate: "Tomorrow",
    scheduledTime: "9:00 AM",
    status: "scheduled",
    platform: ["Website", "Newsletter"],
  },
  {
    id: "3",
    title: "Breaking: New Climate Policy Announced",
    author: {
      name: "News Reporter",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Politics",
    scheduledDate: "Dec 28",
    scheduledTime: "2:00 PM",
    status: "publishing",
    platform: ["Website", "Twitter", "Facebook"],
  },
  {
    id: "4",
    title: "Health Tips for the New Year",
    author: {
      name: "Health Writer",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Health",
    scheduledDate: "Jan 1",
    scheduledTime: "8:00 AM",
    status: "scheduled",
    platform: ["Website", "Instagram"],
  },
  {
    id: "5",
    title: "Sports Highlights: Championship Review",
    author: {
      name: "Sports Editor",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Sports",
    scheduledDate: "Dec 30",
    scheduledTime: "7:00 PM",
    status: "failed",
    platform: ["Website", "Twitter"],
  },
]

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  publishing: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const categoryColors = {
  Technology: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Business: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Politics: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  Health: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Sports: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

export default function PublishingSchedule() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Publishing Schedule</h3>
        <button className="text-sm text-primary hover:underline">Schedule new</button>
      </div>

      <div className="space-y-3">
        {scheduledPosts.map((post) => (
          <div
            key={post.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-accent/50 ${
              post.status === "failed"
                ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                : post.status === "publishing"
                  ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                  : "border-border"
            }`}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
                <AvatarFallback className="text-xs">
                  {post.author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate mb-1">{post.title}</h4>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{post.author.name}</span>
                  <span>•</span>
                  <Badge className={`${categoryColors[post.category as keyof typeof categoryColors]} border-0 text-xs`}>
                    {post.category}
                  </Badge>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {post.scheduledDate} {post.scheduledTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge className={`${statusColors[post.status]} border-0 text-xs`}>{post.status}</Badge>
              <div className="flex items-center space-x-1">
                <button className="p-1 hover:bg-accent rounded">
                  <Edit className="h-3 w-3 text-muted-foreground" />
                </button>
                <button className="p-1 hover:bg-accent rounded">
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
