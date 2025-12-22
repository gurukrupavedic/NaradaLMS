"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Package } from "lucide-react"

export function TopProducts() {
  const products = [
    {
      name: "Wireless Headphones",
      sku: "WH-001",
      sales: 234,
      revenue: "$23,400",
      trend: "+15%",
    },
    {
      name: "Smart Watch",
      sku: "SW-002",
      sales: 189,
      revenue: "$18,900",
      trend: "+8%",
    },
    {
      name: "Bluetooth Speaker",
      sku: "BS-003",
      sales: 156,
      revenue: "$15,600",
      trend: "+12%",
    },
    {
      name: "Phone Case",
      sku: "PC-004",
      sales: 145,
      revenue: "$2,900",
      trend: "+5%",
    },
    {
      name: "USB Cable",
      sku: "UC-005",
      sales: 134,
      revenue: "$1,340",
      trend: "+3%",
    },
  ]

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900 dark:text-white">
          <Package className="mr-2 h-5 w-5" />
          Top Products
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Best selling products this month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{product.revenue}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{product.sku}</span>
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    <span>{product.trend}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.sales} sales</div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          View All Products
        </button>
      </CardContent>
    </Card>
  )
}
