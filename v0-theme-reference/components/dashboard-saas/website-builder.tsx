"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Eye, Smartphone, Monitor } from "lucide-react"

export function WebsiteBuilder() {
  const websites = [
    {
      name: "Main Store",
      url: "mystore.com",
      visitors: "12.4K",
      status: "live",
      mobile: "98%",
      desktop: "95%",
    },
    {
      name: "Fashion Blog",
      url: "fashion.mystore.com",
      visitors: "8.2K",
      status: "live",
      mobile: "92%",
      desktop: "88%",
    },
    {
      name: "Landing Page",
      url: "promo.mystore.com",
      visitors: "3.1K",
      status: "draft",
      mobile: "85%",
      desktop: "90%",
    },
  ]

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-900 dark:text-white">
          <Globe className="mr-2 h-5 w-5" />
          Website Builder
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your websites and performance</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {websites.map((website, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{website.name}</h4>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    website.status === "live"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {website.status}
                </span>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{website.url}</p>

              <div className="flex items-center mb-3">
                <Eye className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{website.visitors} visitors</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Smartphone className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-gray-600 dark:text-gray-300">Mobile</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{website.mobile}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Monitor className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-gray-600 dark:text-gray-300">Desktop</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{website.desktop}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700">
          Create New Website
        </button>
      </CardContent>
    </Card>
  )
}
