"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

const data = [
  { channel: "Website", sales: 45000, orders: 234 },
  { channel: "Amazon", sales: 38000, orders: 189 },
  { channel: "eBay", sales: 25000, orders: 145 },
  { channel: "Shopify", sales: 32000, orders: 167 },
  { channel: "Facebook", sales: 18000, orders: 98 },
  { channel: "Instagram", sales: 22000, orders: 112 },
]

export function ChannelPerformance() {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Channel Performance</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sales performance by channel this month</p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            sales: {
              label: "Sales",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
