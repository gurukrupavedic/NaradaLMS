"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, MessageSquare, Phone, Mail } from "lucide-react"

export function SalesTeamActivity() {
  const activities = [
    {
      user: "Sarah Johnson",
      avatar: "/placeholder.svg?height=32&width=32",
      action: "Closed deal with TechCorp",
      value: "$15,000",
      time: "5 min ago",
      icon: MessageSquare,
      color: "text-green-600",
    },
    {
      user: "Mike Chen",
      avatar: "/placeholder.svg?height=32&width=32",
      action: "Called prospect",
      value: "Follow-up scheduled",
      time: "12 min ago",
      icon: Phone,
      color: "text-blue-600",
    },
    {
      user: "Emma Wilson",
      avatar: "/placeholder.svg?height=32&width=32",
      action: "Sent proposal",
      value: "$8,500 potential",
      time: "25 min ago",
      icon: Mail,
      color: "text-purple-600",
    },
    {
      user: "David Brown",
      avatar: "/placeholder.svg?height=32&width=32",
      action: "Updated lead status",
      value: "Hot prospect",
      time: "1 hour ago",
      icon: MessageSquare,
      color: "text-orange-600",
    },
    {
      user: "Lisa Wang",
      avatar: "/placeholder.svg?height=32&width=32",
      action: "Scheduled demo",
      value: "Tomorrow 2 PM",
      time: "2 hours ago",
      icon: Phone,
      color: "text-indigo-600",
    },
  ]

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900 dark:text-white">
          <Users className="mr-2 h-5 w-5" />
          Sales Team Activity
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Recent actions by your sales team</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.avatar || "/placeholder.svg"} alt={activity.user} />
                <AvatarFallback>
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{activity.user}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                </div>
                <div className="flex items-center mt-1">
                  <activity.icon className={`mr-2 h-3 w-3 ${activity.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{activity.action}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.value}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          View Team Dashboard
        </button>
      </CardContent>
    </Card>
  )
}
