"use client"

import Image from "next/image"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Product {
  id: string
  name: string
  category: string
  sales: number
  revenue: string
  change: number
  image: string
}

const products: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro",
    category: "Smartphones",
    sales: 1234,
    revenue: "$1,234,000",
    change: 12.5,
    image: "/placeholder.svg?height=48&width=48",
  },
  {
    id: "2",
    name: "MacBook Air M2",
    category: "Laptops",
    sales: 856,
    revenue: "$856,000",
    change: 8.2,
    image: "/placeholder.svg?height=48&width=48",
  },
  {
    id: "3",
    name: "AirPods Pro",
    category: "Audio",
    sales: 2341,
    revenue: "$468,200",
    change: -2.1,
    image: "/placeholder.svg?height=48&width=48",
  },
  {
    id: "4",
    name: "iPad Pro 12.9",
    category: "Tablets",
    sales: 567,
    revenue: "$567,000",
    change: 15.3,
    image: "/placeholder.svg?height=48&width=48",
  },
  {
    id: "5",
    name: "Apple Watch Ultra",
    category: "Wearables",
    sales: 432,
    revenue: "$345,600",
    change: 5.7,
    image: "/placeholder.svg?height=48&width=48",
  },
]

export default function TopProducts() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Products</h3>
        <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          <option>This month</option>
          <option>Last month</option>
          <option>Last 3 months</option>
        </select>
      </div>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">
                {index + 1}
              </div>
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                width={48}
                height={48}
                className="rounded-lg object-cover"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{product.revenue}</p>
              <div className="flex items-center justify-end space-x-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{product.sales} sold</span>
                <div className="flex items-center">
                  {product.change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ml-1 ${product.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {product.change > 0 ? "+" : ""}
                    {product.change}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
