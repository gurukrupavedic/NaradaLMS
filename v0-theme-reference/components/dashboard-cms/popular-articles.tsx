"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, Eye, MessageSquare, Share2 } from "lucide-react"

interface Article {
  id: string
  title: string
  category: string
  views: number
  comments: number
  shares: number
  trend: number
  publishDate: string
  readTime: string
}

const articles: Article[] = [
  {
    id: "1",
    title: "10 Essential Tips for Remote Work Productivity",
    category: "Business",
    views: 15420,
    comments: 89,
    shares: 234,
    trend: 23.5,
    publishDate: "3 days ago",
    readTime: "5 min read",
  },
  {
    id: "2",
    title: "The Complete Guide to Machine Learning",
    category: "Technology",
    views: 12890,
    comments: 156,
    shares: 445,
    trend: 18.2,
    publishDate: "1 week ago",
    readTime: "12 min read",
  },
  {
    id: "3",
    title: "Sustainable Living: Small Changes, Big Impact",
    category: "Lifestyle",
    views: 9876,
    comments: 67,
    shares: 189,
    trend: 15.7,
    publishDate: "2 days ago",
    readTime: "7 min read",
  },
  {
    id: "4",
    title: "Cryptocurrency Market Analysis 2024",
    category: "Finance",
    views: 8543,
    comments: 203,
    shares: 567,
    trend: 12.3,
    publishDate: "5 days ago",
    readTime: "9 min read",
  },
  {
    id: "5",
    title: "Mental Health in the Digital Age",
    category: "Health",
    views: 7234,
    comments: 45,
    shares: 123,
    trend: 9.8,
    publishDate: "1 week ago",
    readTime: "6 min read",
  },
]

const categoryColors = {
  Business: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Technology: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Lifestyle: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Finance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Health: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function PopularArticles() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Articles</h3>
        <select className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground">
          <option>This week</option>
          <option>This month</option>
          <option>All time</option>
        </select>
      </div>
      <div className="space-y-3">
        {articles.map((article, index) => (
          <div
            key={article.id}
            className="flex items-center space-x-3 p-3 hover:bg-accent/50 rounded-lg transition-colors"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full text-xs font-medium text-muted-foreground flex-shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-foreground truncate flex-1">{article.title}</h4>
                <div className="flex items-center ml-2 flex-shrink-0">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">+{article.trend}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge
                    className={`${categoryColors[article.category as keyof typeof categoryColors]} border-0 text-xs`}
                  >
                    {article.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{article.readTime}</span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{article.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{article.comments}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Share2 className="h-3 w-3" />
                    <span>{article.shares}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
