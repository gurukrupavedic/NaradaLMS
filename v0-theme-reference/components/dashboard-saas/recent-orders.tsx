"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"

export function RecentOrders() {
  const orders = [
    {
      id: "#ORD-001",
      customer: "John Smith",
      channel: "Website",
      amount: "$124.99",
      status: "completed",
      time: "2 min ago",
    },
    {
      id: "#ORD-002",
      customer: "Sarah Johnson",
      channel: "Amazon",
      amount: "$89.50",
      status: "processing",
      time: "5 min ago",
    },
    {
      id: "#ORD-003",
      customer: "Mike Chen",
      channel: "eBay",
      amount: "$234.00",
      status: "shipped",
      time: "12 min ago",
    },
    {
      id: "#ORD-004",
      customer: "Emma Wilson",
      channel: "Shopify",
      amount: "$67.25",
      status: "pending",
      time: "18 min ago",
    },
    {
      id: "#ORD-005",
      customer: "David Brown",
      channel: "Facebook",
      amount: "$156.80",
      status: "completed",
      time: "25 min ago",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "shipped":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900 dark:text-white">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Recent Orders
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Latest orders from all channels</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{order.id}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{order.amount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{order.customer}</span>
                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{order.channel}</span>
                  <span>{order.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          View All Orders
        </button>
      </CardContent>
    </Card>
  )
}
