"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Eye, MessageSquare, MoreHorizontal } from "lucide-react"

interface Post {
  id: string
  title: string
  author: {
    name: string
    avatar?: string
  }
  category: string
  status: "published" | "draft" | "scheduled" | "review"
  publishDate: string
  views: number
  comments: number
  featured?: boolean
}

const posts: Post[] = [
  {
    id: "1",
    title: "The Future of Artificial Intelligence in Healthcare",
    author: {
      name: "Dr. Sarah Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Technology",
    status: "published",
    publishDate: "2 hours ago",
    views: 1247,
    comments: 23,
    featured: true,
  },
  {
    id: "2",
    title: "Global Economic Trends: What to Expect in 2024",
    author: {
      name: "Michael Chen",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Business",
    status: "published",
    publishDate: "5 hours ago",
    views: 892,
    comments: 15,
  },
  {
    id: "3",
    title: "Climate Change Solutions: Innovative Technologies",
    author: {
      name: "Emma Rodriguez",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Science",
    status: "scheduled",
    publishDate: "Tomorrow, 9:00 AM",
    views: 0,
    comments: 0,
  },
  {
    id: "4",
    title: "The Rise of Remote Work Culture",
    author: {
      name: "Alex Thompson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Business",
    status: "draft",
    publishDate: "Draft",
    views: 0,
    comments: 3,
  },
  {
    id: "5",
    title: "Breakthrough in Quantum Computing Research",
    author: {
      name: "Dr. Lisa Wang",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    category: "Technology",
    status: "review",
    publishDate: "Pending review",
    views: 0,
    comments: 1,
  },
]

const statusColors = {
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}

const categoryColors = {
  Technology: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Business: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Science: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Health: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function RecentPosts() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Posts</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-accent/50 ${
              post.featured ? "border-primary/20 bg-primary/5" : "border-border"
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
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground truncate">{post.title}</h4>
                  {post.featured && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{post.author.name}</span>
                  <span>•</span>
                  <Badge className={`${categoryColors[post.category as keyof typeof categoryColors]} border-0 text-xs`}>
                    {post.category}
                  </Badge>
                  <span>•</span>
                  <span>{post.publishDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <Badge className={`${statusColors[post.status]} border-0 text-xs`}>{post.status}</Badge>

              {post.status === "published" && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{post.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{post.comments}</span>
                  </div>
                </div>
              )}

              <button className="p-1 hover:bg-accent rounded">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
