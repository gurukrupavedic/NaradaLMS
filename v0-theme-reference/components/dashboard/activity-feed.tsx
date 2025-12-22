"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, User, Package, CreditCard, Star } from "lucide-react"

interface Activity {
  id: string
  type: "order" | "user" | "product" | "payment" | "review"
  title: string
  description: string
  time: string
  user?: {
    name: string
    avatar?: string
  }
  metadata?: {
    amount?: string
    rating?: number
    status?: string
  }
}

const activities: Activity[] = [
  {
    id: "1",
    type: "order",
    title: "New order placed",
    description: "Order #3210 for iPhone 15 Pro",
    time: "2 minutes ago",
    user: {
      name: "Olivia Martin",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    metadata: {
      amount: "$1,299.00",
    },
  },
  {
    id: "2",
    type: "user",
    title: "New customer registered",
    description: "Jackson Lee joined the platform",
    time: "15 minutes ago",
    user: {
      name: "Jackson Lee",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "3",
    type: "review",
    title: "Product review received",
    description: "5-star review for MacBook Air M2",
    time: "1 hour ago",
    user: {
      name: "Isabella Nguyen",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    metadata: {
      rating: 5,
    },
  },
  {
    id: "4",
    type: "payment",
    title: "Payment processed",
    description: "Payment for order #3208 completed",
    time: "2 hours ago",
    metadata: {
      amount: "$249.00",
      status: "success",
    },
  },
  {
    id: "5",
    type: "product",
    title: "Low stock alert",
    description: "AirPods Pro stock is running low",
    time: "3 hours ago",
    metadata: {
      status: "warning",
    },
  },
]

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "order":
      return <ShoppingCart className="h-4 w-4" />
    case "user":
      return <User className="h-4 w-4" />
    case "product":
      return <Package className="h-4 w-4" />
    case "payment":
      return <CreditCard className="h-4 w-4" />
    case "review":
      return <Star className="h-4 w-4" />
    default:
      return <Package className="h-4 w-4" />
  }
}

const getActivityColor = (type: Activity["type"]) => {
  switch (type) {
    case "order":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    case "user":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    case "product":
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "payment":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    case "review":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

export default function ActivityFeed() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  {activity.user && (
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
                      <span className="text-xs text-gray-500 dark:text-gray-400">{activity.user.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {activity.metadata?.amount && (
                    <Badge variant="outline" className="text-xs">
                      {activity.metadata.amount}
                    </Badge>
                  )}
                  {activity.metadata?.rating && (
                    <div className="flex items-center">
                      {[...Array(activity.metadata.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
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
