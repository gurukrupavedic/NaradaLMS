"use client"

import OverviewStats from "./overview-stats"
import ContentChart from "./content-chart"
import RecentPosts from "./recent-posts"
import PopularArticles from "./popular-articles"
import ContentCategories from "./content-categories"
import RecentComments from "./recent-comments"
import PublishingSchedule from "./publishing-schedule"
import UserActivity from "./user-activity"
import SystemHistory from "./system-history"

export default function CMSDashboardContent() {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">CMS Full Form .com</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Forks & Likes this Project, and download Full Templates at CMSFullForm.com
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            New Article
          </button>
          <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium">
            Import Content
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <OverviewStats />

      {/* Content Chart - moved here */}
      <ContentChart />

      {/* User Activity & System History Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <SystemHistory />
        <UserActivity />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0">
          <RecentPosts />
          <PopularArticles />
          <PublishingSchedule />
        </div>

        {/* Right Column - 1/3 width on desktop */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          <ContentCategories />
          <RecentComments />
        </div>
      </div>
    </div>
  )
}
