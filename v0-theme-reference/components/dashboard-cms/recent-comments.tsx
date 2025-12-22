"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, Flag, MoreHorizontal } from "lucide-react"

interface Comment {
  id: string
  author: {
    name: string
    avatar?: string
  }
  content: string
  article: string
  timestamp: string
  likes: number
  status: "approved" | "pending" | "flagged"
  isReply?: boolean
}

const comments: Comment[] = [
  {
    id: "1",
    author: {
      name: "John Smith",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    content: "Great article! This really helped me understand the concept better.",
    article: "The Future of AI in Healthcare",
    timestamp: "2 minutes ago",
    likes: 5,
    status: "approved",
  },
  {
    id: "2",
    author: {
      name: "Sarah Wilson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    content: "I disagree with some points mentioned here. The data seems outdated.",
    article: "Global Economic Trends 2024",
    timestamp: "15 minutes ago",
    likes: 2,
    status: "pending",
  },
  {
    id: "3",
    author: {
      name: "Mike Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    content: "Thanks for sharing this! Could you provide more sources?",
    article: "Climate Change Solutions",
    timestamp: "1 hour ago",
    likes: 8,
    status: "approved",
    isReply: true,
  },
  {
    id: "4",
    author: {
      name: "Emma Davis",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    content: "This is spam content that should be removed immediately.",
    article: "Remote Work Culture",
    timestamp: "2 hours ago",
    likes: 0,
    status: "flagged",
  },
  {
    id: "5",
    author: {
      name: "Alex Chen",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    content: "Excellent insights! Looking forward to more content like this.",
    article: "Quantum Computing Research",
    timestamp: "3 hours ago",
    likes: 12,
    status: "approved",
  },
]

const statusColors = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  flagged: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function RecentComments() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Comments</h3>
        <button className="text-sm text-primary hover:underline">Moderate all</button>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-3 rounded-lg border transition-colors hover:bg-accent/50 ${
              comment.status === "flagged"
                ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                : comment.status === "pending"
                  ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10"
                  : "border-border"
            }`}
          >
            <div className="flex items-start space-x-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={comment.author.avatar || "/placeholder.svg"} alt={comment.author.name} />
                <AvatarFallback className="text-xs">
                  {comment.author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">{comment.author.name}</span>
                    {comment.isReply && (
                      <Badge variant="outline" className="text-xs">
                        Reply
                      </Badge>
                    )}
                    <Badge className={`${statusColors[comment.status]} border-0 text-xs`}>{comment.status}</Badge>
                  </div>
                  <button className="p-1 hover:bg-accent rounded">
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{comment.content}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <span>on "{comment.article}"</span>
                    <span>•</span>
                    <span>{comment.timestamp}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {comment.status === "pending" && (
                    <div className="flex items-center space-x-1">
                      <button className="text-green-600 hover:text-green-700 font-medium">Approve</button>
                      <button className="text-red-600 hover:text-red-700 font-medium">Reject</button>
                    </div>
                  )}
                  {comment.status === "flagged" && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <Flag className="h-3 w-3" />
                      <span>Flagged</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
