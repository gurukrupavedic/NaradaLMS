"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, Star, TrendingDown } from "lucide-react"

export function CustomerInsights() {
  const metrics = [
    {
      label: "New Customers",
      value: "1,247",
      change: "+23%",
      icon: UserPlus,
      color: "text-green-600",
    },
    {
      label: "Returning Customers",
      value: "8,392",
      change: "+12%",
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Avg. Rating",
      value: "4.8",
      change: "+0.2",
      icon: Star,
      color: "text-yellow-600",
    },
    {
      label: "Churn Rate",
      value: "2.1%",
      change: "-0.5%",
      icon: TrendingDown,
      color: "text-red-600",
    },
  ]

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Customer Insights</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Customer metrics and satisfaction</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <metric.icon className={`mx-auto h-6 w-6 mb-2 ${metric.color}`} />
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{metric.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
              <div className={`text-xs mt-1 ${metric.color}`}>{metric.change}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
