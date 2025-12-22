"use client"

import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { ThemeCustomizer } from "../theme-customizer"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [menuState, setMenuState] = useState<"full" | "collapsed" | "hidden">("full")
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for menu state changes and hover state
  useEffect(() => {
    const checkMenuState = () => {
      if (typeof window !== "undefined") {
        if ((window as any).menuState) {
          setMenuState((window as any).menuState)
        }
        if ((window as any).isHovered !== undefined) {
          setIsHovered((window as any).isHovered)
        }
        if ((window as any).isMobile !== undefined) {
          setIsMobile((window as any).isMobile)
        }
      }
    }

    // Check initial state
    checkMenuState()

    // Set up interval to check for changes
    const interval = setInterval(checkMenuState, 50) // More frequent updates for hover

    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return null
  }

  // Calculate margin based on menu state and hover - only for desktop
  const getMarginLeft = () => {
    if (isMobile) {
      return "0" // No margin on mobile, sidebar is overlay
    }
    if (menuState === "hidden") {
      return "0"
    }
    // If collapsed and hovered, expand temporarily
    if (menuState === "collapsed" && isHovered) {
      return "16rem" // 256px - full width
    }
    if (menuState === "collapsed") {
      return "4rem" // 64px - collapsed width
    }
    return "16rem" // 256px - full width
  }

  return (
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""}`}>
      <Sidebar />
      <div
        className="w-full flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0"
        style={{
          marginLeft: getMarginLeft(),
        }}
      >
        <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23] flex-shrink-0">
          <TopNav />
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-6 bg-white dark:bg-[#0F0F12] min-w-0">{children}</main>
      </div>

      {/* Theme Customizer */}
      <ThemeCustomizer />
    </div>
  )
}
