"use client"

import type React from "react"

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react"

interface StatCard {
  title: string
  value: string
  change: string
  changeType: "increase" | "decrease"
  icon: React.ReactNode
}

const stats: StatCard[] = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    changeType: "increase",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    title: "Orders",
    value: "2,350",
    change: "+180.1%",
    changeType: "increase",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    title: "Customers",
    value: "12,234",
    change: "+19%",
    changeType: "increase",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Products",
    value: "573",
    change: "-4.3%",
    changeType: "decrease",
    icon: <Package className="h-4 w-4" />,
  },
]

export default function OverviewStats() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white dark:bg-[#0F0F12] rounded-lg sm:rounded-xl p-3 sm:p-6 border border-gray-200 dark:border-[#1F1F23] hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{stat.title}</h3>
            <div className="text-gray-600 dark:text-gray-400 flex-shrink-0">{stat.icon}</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{stat.value}</div>
            <div className="flex items-center text-xs">
              {stat.changeType === "increase" ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
              )}
              <span className={`font-medium ${stat.changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                {stat.change}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">from last month</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1 sm:hidden">vs last</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
