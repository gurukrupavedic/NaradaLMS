"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", revenue: 65000, orders: 245 },
  { month: "Feb", revenue: 72000, orders: 267 },
  { month: "Mar", revenue: 68000, orders: 251 },
  { month: "Apr", revenue: 85000, orders: 312 },
  { month: "May", revenue: 92000, orders: 334 },
  { month: "Jun", revenue: 88000, orders: 298 },
  { month: "Jul", revenue: 95000, orders: 356 },
  { month: "Aug", revenue: 102000, orders: 378 },
  { month: "Sep", revenue: 98000, orders: 342 },
  { month: "Oct", revenue: 115000, orders: 398 },
  { month: "Nov", revenue: 125000, orders: 425 },
  { month: "Dec", revenue: 135000, orders: 456 },
]

export function RevenueChart() {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Revenue Trends</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly revenue across all sales channels</p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            revenue: {
              label: "Revenue",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={{ fill: "var(--color-revenue)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
