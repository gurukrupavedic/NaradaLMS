"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Download, Calendar, CheckCircle, Star, Zap, Crown } from "lucide-react"

export default function SubscriptionSettings() {
  const currentPlan = {
    name: "Pro Plan",
    price: "$29",
    period: "month",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Custom integrations",
      "Team collaboration",
    ],
    nextBilling: "January 15, 2024",
    status: "active",
  }

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: ["Up to 3 projects", "Basic analytics", "Community support", "Standard templates"],
      icon: <Star className="h-5 w-5" />,
      popular: false,
      current: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: "$29",
      period: "month",
      description: "Best for professionals",
      features: [
        "Unlimited projects",
        "Advanced analytics",
        "Priority support",
        "Custom integrations",
        "Team collaboration",
        "Advanced security",
      ],
      icon: <Zap className="h-5 w-5" />,
      popular: true,
      current: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$99",
      period: "month",
      description: "For large organizations",
      features: [
        "Everything in Pro",
        "Dedicated support",
        "Custom branding",
        "SSO integration",
        "Advanced permissions",
        "SLA guarantee",
      ],
      icon: <Crown className="h-5 w-5" />,
      popular: false,
      current: false,
    },
  ]

  const invoices = [
    {
      id: "INV-001",
      date: "Dec 15, 2023",
      amount: "$29.00",
      status: "paid",
      description: "Pro Plan - Monthly",
    },
    {
      id: "INV-002",
      date: "Nov 15, 2023",
      amount: "$29.00",
      status: "paid",
      description: "Pro Plan - Monthly",
    },
    {
      id: "INV-003",
      date: "Oct 15, 2023",
      amount: "$29.00",
      status: "paid",
      description: "Pro Plan - Monthly",
    },
  ]

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription & Billing</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your subscription, billing information, and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Plan</h3>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentPlan.name}</CardTitle>
                  <CardDescription>
                    ${currentPlan.price}/{currentPlan.period} • Next billing: {currentPlan.nextBilling}
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Plan Features:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700 bg-transparent">
                  Cancel Subscription
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Plans */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Available Plans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.current ? "border-primary/20 bg-primary/5" : plan.popular ? "border-primary/50" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`p-2 rounded-lg ${plan.current ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"}`}>
                    {plan.icon}
                  </div>
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.current
                      ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Method</h3>
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expires 12/2025</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Update
          </Button>
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Billing History</h3>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{invoice.description}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.date} • {invoice.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900 dark:text-white">{invoice.amount}</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                  Paid
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
