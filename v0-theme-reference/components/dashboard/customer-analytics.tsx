"use client"
import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

const customerData = {
  labels: ["New Customers", "Returning Customers", "VIP Customers"],
  datasets: [
    {
      data: [45, 35, 20],
      backgroundColor: ["rgba(59, 130, 246, 0.8)", "rgba(16, 185, 129, 0.8)", "rgba(245, 158, 11, 0.8)"],
      borderColor: ["rgb(59, 130, 246)", "rgb(16, 185, 129)", "rgb(245, 158, 11)"],
      borderWidth: 2,
    },
  ],
}

const customerStats = [
  {
    label: "New Customers",
    value: "2,345",
    percentage: "45%",
    color: "bg-blue-500",
  },
  {
    label: "Returning Customers",
    value: "1,823",
    percentage: "35%",
    color: "bg-green-500",
  },
  {
    label: "VIP Customers",
    value: "1,042",
    percentage: "20%",
    color: "bg-yellow-500",
  },
]

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.label}: ${context.parsed}%`,
      },
    },
  },
}

export default function CustomerAnalytics() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-3 sm:p-6 border border-gray-200 dark:border-[#1F1F23] w-full min-w-0">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Customer Analytics</h3>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">This month</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Chart - Full width on mobile */}
        <div className="h-32 sm:h-48 w-full flex justify-center">
          <div className="w-32 sm:w-48 h-32 sm:h-48">
            <Doughnut data={customerData} options={chartOptions} />
          </div>
        </div>

        {/* Stats - Below chart on mobile */}
        <div className="space-y-3 sm:space-y-4">
          {customerStats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <div className={`w-3 h-3 rounded-full ${stat.color} flex-shrink-0`} />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{stat.label}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.percentage}</p>
              </div>
            </div>
          ))}

          <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Total Customers</span>
              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">5,210</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12.5% from last month</p>
          </div>
        </div>
      </div>
    </div>
  )
}
