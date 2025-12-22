"use client"

import OverviewStats from "./overview-stats"
import { SalesChart, RevenueChart } from "./sales-chart"
import RecentOrders from "./recent-orders"
import TopProducts from "./top-products"
import CustomerAnalytics from "./customer-analytics"
import ActivityFeed from "./activity-feed"
import FinancialWidgets from "./financial-widgets"

export default function DashboardContent() {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Overview Stats */}
      <OverviewStats />

      {/* Charts Row - Stack on mobile, side by side on desktop */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        <div className="w-full min-w-0">
          <SalesChart />
        </div>
        <div className="w-full min-w-0">
          <RevenueChart />
        </div>
      </div>

      {/* Main Content Grid - Stack on mobile, responsive grid on larger screens */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - Full width on mobile, 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0">
          <RecentOrders />
          <TopProducts />
        </div>

        {/* Right Column - Full width on mobile, 1/3 width on desktop */}
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          <CustomerAnalytics />
          <ActivityFeed />
        </div>
      </div>

      {/* Financial Overview Section */}
      <div className="mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 px-1">
          Financial Overview
        </h2>
        <FinancialWidgets />
      </div>
    </div>
  )
}
