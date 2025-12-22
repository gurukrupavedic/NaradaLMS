"use client"

import { Badge } from "@/components/ui/badge"
import { Settings, Palette, Plug, Shield, Database, Upload, Download, PowerOff, Save, RefreshCw } from "lucide-react"

interface SystemEvent {
  id: string
  action:
    | "plugin_installed"
    | "plugin_activated"
    | "plugin_deactivated"
    | "theme_changed"
    | "settings_saved"
    | "backup_created"
    | "system_updated"
    | "security_scan"
    | "cache_cleared"
    | "database_optimized"
  target: string
  user: string
  timestamp: string
  details?: string
  status: "success" | "warning" | "error" | "info"
}

const systemEvents: SystemEvent[] = [
  {
    id: "1",
    action: "plugin_activated",
    target: "SEO Optimizer Pro",
    user: "Admin",
    timestamp: "10 minutes ago",
    details: "Version 2.1.4",
    status: "success",
  },
  {
    id: "2",
    action: "settings_saved",
    target: "General Settings",
    user: "Sarah Johnson",
    timestamp: "25 minutes ago",
    details: "Site title and description updated",
    status: "success",
  },
  {
    id: "3",
    action: "theme_changed",
    target: "Modern Blog Theme",
    user: "Admin",
    timestamp: "1 hour ago",
    details: "Switched from Classic Theme",
    status: "success",
  },
  {
    id: "4",
    action: "backup_created",
    target: "Full Site Backup",
    user: "System",
    timestamp: "2 hours ago",
    details: "Scheduled backup - 2.4 GB",
    status: "success",
  },
  {
    id: "5",
    action: "plugin_installed",
    target: "Contact Form Builder",
    user: "Mike Chen",
    timestamp: "3 hours ago",
    details: "Version 1.8.2 from repository",
    status: "success",
  },
  {
    id: "6",
    action: "security_scan",
    target: "Security Check",
    user: "System",
    timestamp: "4 hours ago",
    details: "No threats detected",
    status: "success",
  },
  {
    id: "7",
    action: "plugin_deactivated",
    target: "Old Gallery Plugin",
    user: "Emma Wilson",
    timestamp: "6 hours ago",
    details: "Replaced with new version",
    status: "warning",
  },
  {
    id: "8",
    action: "database_optimized",
    target: "Database Cleanup",
    user: "System",
    timestamp: "8 hours ago",
    details: "Removed 1,247 spam comments",
    status: "success",
  },
  {
    id: "9",
    action: "system_updated",
    target: "CMS Core Update",
    user: "Admin",
    timestamp: "1 day ago",
    details: "Updated to version 6.4.2",
    status: "success",
  },
  {
    id: "10",
    action: "cache_cleared",
    target: "Site Cache",
    user: "Alex Rodriguez",
    timestamp: "1 day ago",
    details: "Performance optimization",
    status: "info",
  },
]

const getActionIcon = (action: string) => {
  switch (action) {
    case "plugin_installed":
    case "plugin_activated":
      return <Plug className="h-4 w-4" />
    case "plugin_deactivated":
      return <PowerOff className="h-4 w-4" />
    case "theme_changed":
      return <Palette className="h-4 w-4" />
    case "settings_saved":
      return <Save className="h-4 w-4" />
    case "backup_created":
      return <Download className="h-4 w-4" />
    case "system_updated":
      return <Upload className="h-4 w-4" />
    case "security_scan":
      return <Shield className="h-4 w-4" />
    case "cache_cleared":
      return <RefreshCw className="h-4 w-4" />
    case "database_optimized":
      return <Database className="h-4 w-4" />
    default:
      return <Settings className="h-4 w-4" />
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case "plugin_installed":
    case "plugin_activated":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    case "plugin_deactivated":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
    case "theme_changed":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    case "settings_saved":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    case "backup_created":
    case "system_updated":
      return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
    case "security_scan":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
    case "cache_cleared":
    case "database_optimized":
      return "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "warning":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "info":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

const getActionLabel = (action: string) => {
  switch (action) {
    case "plugin_installed":
      return "Plugin Installed"
    case "plugin_activated":
      return "Plugin Activated"
    case "plugin_deactivated":
      return "Plugin Deactivated"
    case "theme_changed":
      return "Theme Changed"
    case "settings_saved":
      return "Settings Saved"
    case "backup_created":
      return "Backup Created"
    case "system_updated":
      return "System Updated"
    case "security_scan":
      return "Security Scan"
    case "cache_cleared":
      return "Cache Cleared"
    case "database_optimized":
      return "Database Optimized"
    default:
      return "System Event"
  }
}

export default function SystemHistory() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System History</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-3">
        {systemEvents.slice(0, 8).map((event) => (
          <div
            key={event.id}
            className="flex items-center space-x-3 p-3 hover:bg-accent/50 rounded-lg transition-colors"
          >
            <div className={`p-2 rounded-full ${getActionColor(event.action)} flex-shrink-0`}>
              {getActionIcon(event.action)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">{getActionLabel(event.action)}</span>
                  <Badge className={`${getStatusColor(event.status)} border-0 text-xs`}>{event.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{event.timestamp}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{event.target}</span> by {event.user}
                {event.details && <span className="text-xs"> • {event.details}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last system check: 2 hours ago</span>
          <button className="text-primary hover:underline">System logs</button>
        </div>
      </div>
    </div>
  )
}
