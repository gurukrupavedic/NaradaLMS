"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Order {
  id: string
  customer: {
    name: string
    email: string
    avatar?: string
  }
  product: string
  amount: string
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  date: string
}

const orders: Order[] = [
  {
    id: "#3210",
    customer: {
      name: "Olivia Martin",
      email: "olivia.martin@email.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    product: "iPhone 15 Pro",
    amount: "$1,299.00",
    status: "delivered",
    date: "2 hours ago",
  },
  {
    id: "#3209",
    customer: {
      name: "Jackson Lee",
      email: "jackson.lee@email.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    product: "MacBook Air M2",
    amount: "$1,199.00",
    status: "processing",
    date: "4 hours ago",
  },
  {
    id: "#3208",
    customer: {
      name: "Isabella Nguyen",
      email: "isabella.nguyen@email.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    product: "AirPods Pro",
    amount: "$249.00",
    status: "shipped",
    date: "6 hours ago",
  },
  {
    id: "#3207",
    customer: {
      name: "William Kim",
      email: "will@email.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    product: "iPad Pro 12.9",
    amount: "$1,099.00",
    status: "pending",
    date: "8 hours ago",
  },
  {
    id: "#3206",
    customer: {
      name: "Sofia Davis",
      email: "sofia.davis@email.com",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    product: "Apple Watch Ultra",
    amount: "$799.00",
    status: "cancelled",
    date: "1 day ago",
  },
]

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function RecentOrders() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={order.customer.avatar || "/placeholder.svg"} alt={order.customer.name} />
                <AvatarFallback>
                  {order.customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{order.id}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{order.product}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={`${statusColors[order.status]} border-0`}>{order.status}</Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.amount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{order.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
