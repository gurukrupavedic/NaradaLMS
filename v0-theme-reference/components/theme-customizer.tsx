"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, X, Palette, Layout, Menu, Square, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useTheme } from "next-themes"

interface ThemeConfig {
  menuState: "full" | "collapsed" | "hidden"
  layout: "ltr" | "rtl"
  colors: {
    light: {
      background: string
      foreground: string
      primary: string
      primaryForeground: string
      secondary: string
      secondaryForeground: string
      accent: string
      accentForeground: string
      muted: string
      mutedForeground: string
      border: string
      input: string
      ring: string
      card: string
      cardForeground: string
      menuText: string
      menuTextHover: string
      menuIcon: string
      menuIconHover: string
      menuSectionLabel: string
    }
    dark: {
      background: string
      foreground: string
      primary: string
      primaryForeground: string
      secondary: string
      secondaryForeground: string
      accent: string
      accentForeground: string
      muted: string
      mutedForeground: string
      border: string
      input: string
      ring: string
      card: string
      cardForeground: string
      menuText: string
      menuTextHover: string
      menuIcon: string
      menuIconHover: string
      menuSectionLabel: string
    }
  }
  card: {
    borderRadius: number
    borderWidth: number
    padding: number
  }
  typography: {
    fontSize: number
    fontWeight: string
    lineHeight: number
  }
  button: {
    borderRadius: number
    fontSize: number
    padding: string
  }
}

const defaultConfig: ThemeConfig = {
  menuState: "full",
  layout: "ltr",
  colors: {
    light: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      primary: "222.2 47.4% 11.2%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 96%",
      secondaryForeground: "222.2 84% 4.9%",
      accent: "210 40% 96%",
      accentForeground: "222.2 84% 4.9%",
      muted: "210 40% 96%",
      mutedForeground: "215.4 16.3% 46.9%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      menuText: "222.2 84% 4.9%",
      menuTextHover: "222.2 84% 4.9%",
      menuIcon: "222.2 84% 4.9%",
      menuIconHover: "222.2 84% 4.9%",
      menuSectionLabel: "215.4 16.3% 35%",
    },
    dark: {
      background: "240 10% 3.9%",
      foreground: "0 0% 98%",
      primary: "0 0% 98%",
      primaryForeground: "240 5.9% 10%",
      secondary: "240 3.7% 15.9%",
      secondaryForeground: "0 0% 98%",
      accent: "240 3.7% 15.9%",
      accentForeground: "0 0% 98%",
      muted: "240 3.7% 15.9%",
      mutedForeground: "240 5% 64.9%",
      border: "240 3.7% 15.9%",
      input: "240 3.7% 15.9%",
      ring: "240 4.9% 83.9%",
      card: "240 10% 3.9%",
      cardForeground: "0 0% 98%",
      menuText: "0 0% 98%",
      menuTextHover: "0 0% 98%",
      menuIcon: "0 0% 98%",
      menuIconHover: "0 0% 98%",
      menuSectionLabel: "240 5% 75%",
    },
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  typography: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 1.5,
  },
  button: {
    borderRadius: 6,
    fontSize: 14,
    padding: "8px 16px",
  },
}

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig)
  const [editingDarkMode, setEditingDarkMode] = useState(false)

  // Optimized theme application function
  const applyThemeColors = useCallback((config: ThemeConfig, isDark: boolean) => {
    const root = document.documentElement
    const colors = isDark ? config.colors.dark : config.colors.light

    // Apply color variables efficiently
    const colorEntries = Object.entries(colors)
    for (const [key, value] of colorEntries) {
      if (value && typeof value === "string") {
        const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        root.style.setProperty(cssVar, value)
      }
    }

    // Apply layout and other properties
    root.dir = config.layout
    document.body.dir = config.layout
    root.style.setProperty("--radius", `${config.card.borderRadius}px`)
    root.style.setProperty("--card-border-width", `${config.card.borderWidth}px`)
    root.style.setProperty("--card-padding", `${config.card.padding}px`)
    root.style.setProperty("--font-size-base", `${config.typography.fontSize}px`)
    root.style.setProperty("--font-weight-base", config.typography.fontWeight)
    root.style.setProperty("--line-height-base", config.typography.lineHeight.toString())
    root.style.setProperty("--button-radius", `${config.button.borderRadius}px`)
    root.style.setProperty("--button-font-size", `${config.button.fontSize}px`)
    root.style.setProperty("--button-padding", config.button.padding)

    // Update dynamic styles only if needed
    let existingStyle = document.getElementById("theme-customizer-styles")
    if (!existingStyle) {
      existingStyle = document.createElement("style")
      existingStyle.id = "theme-customizer-styles"
      document.head.appendChild(existingStyle)
    }

    existingStyle.textContent = `
      /* Menu colors */
      .sidebar-menu-text {
        color: hsl(${colors.menuText || colors.foreground}) !important;
      }
      
      .sidebar-menu-icon {
        color: hsl(${colors.menuIcon || colors.foreground}) !important;
      }
      
      .sidebar-menu-item:hover .sidebar-menu-text {
        color: hsl(${colors.menuTextHover || colors.foreground}) !important;
      }
      
      .sidebar-menu-item:hover .sidebar-menu-icon {
        color: hsl(${colors.menuIconHover || colors.foreground}) !important;
      }
      
      .sidebar-section-label {
        color: hsl(${colors.menuSectionLabel || colors.mutedForeground}) !important;
      }
      
      /* Card styles */
      .bg-white.dark\\:bg-\\[\\#0F0F12\\].rounded-xl,
      .bg-white.dark\\:bg-zinc-900\\/70.rounded-xl,
      [class*="rounded-xl"][class*="bg-white"],
      [class*="rounded-lg"][class*="bg-white"],
      [class*="rounded-2xl"][class*="bg-white"] {
        border-radius: ${config.card.borderRadius}px !important;
        padding: ${config.card.padding}px !important;
        border-width: ${config.card.borderWidth}px !important;
      }
      
      /* Button styles */
      button, .button, [role="button"] {
        border-radius: ${config.button.borderRadius}px !important;
        font-size: ${config.button.fontSize}px !important;
        padding: ${config.button.padding} !important;
      }
      
      /* Typography */
      body {
        font-size: ${config.typography.fontSize}px !important;
        font-weight: ${config.typography.fontWeight} !important;
        line-height: ${config.typography.lineHeight} !important;
      }
    `
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load config from localStorage and apply initial theme
  useEffect(() => {
    if (!mounted) return

    const savedConfig = localStorage.getItem("theme-config")
    let finalConfig = defaultConfig

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        finalConfig = {
          ...defaultConfig,
          ...parsed,
          colors: {
            light: { ...defaultConfig.colors.light, ...(parsed.colors?.light || {}) },
            dark: { ...defaultConfig.colors.dark, ...(parsed.colors?.dark || {}) },
          },
        }
      } catch (error) {
        console.error("Failed to parse saved config:", error)
        finalConfig = defaultConfig
      }
    }

    setConfig(finalConfig)

    // Apply theme immediately
    const isDark = theme === "dark"
    applyThemeColors(finalConfig, isDark)

    // Apply menu state
    if (typeof window !== "undefined" && (window as any).setMenuStateFromCustomizer) {
      ;(window as any).setMenuStateFromCustomizer(finalConfig.menuState)
    }
  }, [mounted, theme, applyThemeColors])

  // Apply theme changes when config changes (but not on theme toggle)
  useEffect(() => {
    if (!mounted) return

    const isDark = theme === "dark"
    applyThemeColors(config, isDark)

    // Apply menu state
    if (typeof window !== "undefined" && (window as any).setMenuStateFromCustomizer) {
      ;(window as any).setMenuStateFromCustomizer(config.menuState)
    }
  }, [config, mounted, applyThemeColors])

  // Separate effect for theme changes only (fast toggle)
  useEffect(() => {
    if (!mounted) return

    const isDark = theme === "dark"
    const colors = isDark ? config.colors.dark : config.colors.light
    const root = document.documentElement

    // Only update color variables for fast theme switching
    Object.entries(colors).forEach(([key, value]) => {
      if (value && typeof value === "string") {
        const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        root.style.setProperty(cssVar, value)
      }
    })

    // Update menu colors in existing style
    const existingStyle = document.getElementById("theme-customizer-styles")
    if (existingStyle) {
      existingStyle.textContent =
        existingStyle.textContent
          ?.replace(
            /\.sidebar-menu-text\s*{[^}]*}/g,
            `.sidebar-menu-text { color: hsl(${colors.menuText || colors.foreground}) !important; }`,
          )
          .replace(
            /\.sidebar-menu-icon\s*{[^}]*}/g,
            `.sidebar-menu-icon { color: hsl(${colors.menuIcon || colors.foreground}) !important; }`,
          )
          .replace(
            /\.sidebar-menu-item:hover \.sidebar-menu-text\s*{[^}]*}/g,
            `.sidebar-menu-item:hover .sidebar-menu-text { color: hsl(${colors.menuTextHover || colors.foreground}) !important; }`,
          )
          .replace(
            /\.sidebar-menu-item:hover \.sidebar-menu-icon\s*{[^}]*}/g,
            `.sidebar-menu-item:hover .sidebar-menu-icon { color: hsl(${colors.menuIconHover || colors.foreground}) !important; }`,
          )
          .replace(
            /\.sidebar-section-label\s*{[^}]*}/g,
            `.sidebar-section-label { color: hsl(${colors.menuSectionLabel || colors.mutedForeground}) !important; }`,
          ) || ""
    }
  }, [theme, mounted, config.colors])

  const handleSave = () => {
    localStorage.setItem("theme-config", JSON.stringify(config))
    alert("Theme configuration saved!")
  }

  const handleReset = () => {
    setConfig(defaultConfig)
    localStorage.removeItem("theme-config")
    alert("Theme configuration reset to default!")
  }

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev))
      const keys = path.split(".")
      let current: any = newConfig

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value

      return newConfig
    })
  }

  // Fast theme toggle
  const handleDarkModeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Convert HSL to hex for color input with proper error handling
  const hslToHex = (hsl: string): string => {
    try {
      if (!hsl || typeof hsl !== "string") {
        return "#000000"
      }

      const parts = hsl.trim().split(" ")
      if (parts.length !== 3) {
        return "#000000"
      }

      const [h, s, l] = parts.map((v) => {
        const num = Number.parseFloat(v.replace("%", ""))
        return isNaN(num) ? 0 : num
      })

      const hNorm = h / 360
      const sNorm = s / 100
      const lNorm = l / 100

      const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
      const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1))
      const m = lNorm - c / 2

      let r = 0,
        g = 0,
        b = 0

      if (0 <= hNorm && hNorm < 1 / 6) {
        r = c
        g = x
        b = 0
      } else if (1 / 6 <= hNorm && hNorm < 2 / 6) {
        r = x
        g = c
        b = 0
      } else if (2 / 6 <= hNorm && hNorm < 3 / 6) {
        r = 0
        g = c
        b = x
      } else if (3 / 6 <= hNorm && hNorm < 4 / 6) {
        r = 0
        g = x
        b = c
      } else if (4 / 6 <= hNorm && hNorm < 5 / 6) {
        r = x
        g = 0
        b = c
      } else if (5 / 6 <= hNorm && hNorm < 1) {
        r = c
        g = 0
        b = x
      }

      r = Math.round((r + m) * 255)
      g = Math.round((g + m) * 255)
      b = Math.round((b + m) * 255)

      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    } catch (error) {
      console.error("Error converting HSL to hex:", error)
      return "#000000"
    }
  }

  // Convert hex to HSL with proper error handling
  const hexToHsl = (hex: string): string => {
    try {
      if (!hex || typeof hex !== "string" || !hex.startsWith("#") || hex.length !== 7) {
        return "0 0% 0%"
      }

      const r = Number.parseInt(hex.slice(1, 3), 16) / 255
      const g = Number.parseInt(hex.slice(3, 5), 16) / 255
      const b = Number.parseInt(hex.slice(5, 7), 16) / 255

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return "0 0% 0%"
      }

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let h = 0,
        s = 0,
        l = (max + min) / 2

      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0)
            break
          case g:
            h = (b - r) / d + 2
            break
          case b:
            h = (r - g) / d + 4
            break
        }
        h /= 6
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    } catch (error) {
      console.error("Error converting hex to HSL:", error)
      return "0 0% 0%"
    }
  }

  const ColorInput = ({ label, path, value }: { label: string; path: string; value: string }) => {
    const safeValue = value || "0 0% 0%"
    const hexValue = hslToHex(safeValue)

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={safeValue}
            onChange={(e) => updateConfig(path, e.target.value)}
            className="flex-1 h-8 text-xs"
            placeholder="0 0% 100%"
          />
          <input
            type="color"
            value={hexValue}
            onChange={(e) => {
              const hslValue = hexToHsl(e.target.value)
              updateConfig(path, hslValue)
            }}
            className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
            title="Color picker"
          />
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <button
        className="fixed right-4 top-1/2 -translate-y-1/2 z-[80] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg"
        title="Theme Customizer"
        disabled
      >
        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    )
  }

  const panelPosition = config.layout === "rtl" ? "left-0" : "right-0"
  const buttonPosition = config.layout === "rtl" ? "left-4" : "right-4"

  return (
    <>
      {/* Sticky Theme Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${buttonPosition} top-1/2 -translate-y-1/2 z-[80] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}
        title="Theme Customizer"
      >
        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Theme Customizer Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-[90]" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div
            className={`fixed ${panelPosition} top-0 h-full w-80 bg-white dark:bg-gray-900 border-${config.layout === "rtl" ? "r" : "l"} border-gray-200 dark:border-gray-700 z-[100] overflow-y-auto`}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Theme Customizer</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Menu Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Menu className="w-4 h-4" />
                    <Label className="font-medium">Menu</Label>
                  </div>
                  <Select
                    value={config.menuState}
                    onValueChange={(value: "full" | "collapsed" | "hidden") => updateConfig("menuState", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="collapsed">Collapsed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Layout Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    <Label className="font-medium">Layout</Label>
                  </div>
                  <Select value={config.layout} onValueChange={(value: "ltr" | "rtl") => updateConfig("layout", value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      <SelectItem value="ltr">Left to Right (LTR)</SelectItem>
                      <SelectItem value="rtl">Right to Left (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Dark Mode</Label>
                  <Switch checked={theme === "dark"} onCheckedChange={handleDarkModeToggle} />
                </div>

                {/* Color Mode Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Edit Dark Colors</Label>
                  <Switch checked={editingDarkMode} onCheckedChange={setEditingDarkMode} />
                </div>

                {/* Color Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <Label className="font-medium">Colors ({editingDarkMode ? "Dark" : "Light"})</Label>
                  </div>

                  <div className="grid gap-3 max-h-80 overflow-y-auto">
                    <ColorInput
                      label="Background"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.background`}
                      value={editingDarkMode ? config.colors.dark.background : config.colors.light.background}
                    />
                    <ColorInput
                      label="Foreground"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.foreground`}
                      value={editingDarkMode ? config.colors.dark.foreground : config.colors.light.foreground}
                    />
                    <ColorInput
                      label="Primary"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.primary`}
                      value={editingDarkMode ? config.colors.dark.primary : config.colors.light.primary}
                    />
                    <ColorInput
                      label="Secondary"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.secondary`}
                      value={editingDarkMode ? config.colors.dark.secondary : config.colors.light.secondary}
                    />
                    <ColorInput
                      label="Accent"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.accent`}
                      value={editingDarkMode ? config.colors.dark.accent : config.colors.light.accent}
                    />
                    <ColorInput
                      label="Border"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.border`}
                      value={editingDarkMode ? config.colors.dark.border : config.colors.light.border}
                    />
                    <ColorInput
                      label="Card"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.card`}
                      value={editingDarkMode ? config.colors.dark.card : config.colors.light.card}
                    />

                    <Separator />
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu Colors</Label>

                    <ColorInput
                      label="Menu Text"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.menuText`}
                      value={editingDarkMode ? config.colors.dark.menuText : config.colors.light.menuText}
                    />
                    <ColorInput
                      label="Menu Text Hover"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.menuTextHover`}
                      value={editingDarkMode ? config.colors.dark.menuTextHover : config.colors.light.menuTextHover}
                    />
                    <ColorInput
                      label="Menu Icon"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.menuIcon`}
                      value={editingDarkMode ? config.colors.dark.menuIcon : config.colors.light.menuIcon}
                    />
                    <ColorInput
                      label="Menu Icon Hover"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.menuIconHover`}
                      value={editingDarkMode ? config.colors.dark.menuIconHover : config.colors.light.menuIconHover}
                    />
                    <ColorInput
                      label="Section Labels (Overview, E-commerce, etc.)"
                      path={`colors.${editingDarkMode ? "dark" : "light"}.menuSectionLabel`}
                      value={
                        editingDarkMode ? config.colors.dark.menuSectionLabel : config.colors.light.menuSectionLabel
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Card Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    <Label className="font-medium">Card</Label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Border Radius: {config.card.borderRadius}px</Label>
                      <Slider
                        value={[config.card.borderRadius]}
                        onValueChange={([value]) => updateConfig("card.borderRadius", value)}
                        max={20}
                        min={0}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Border Width: {config.card.borderWidth}px</Label>
                      <Slider
                        value={[config.card.borderWidth]}
                        onValueChange={([value]) => updateConfig("card.borderWidth", value)}
                        max={5}
                        min={0}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Padding: {config.card.padding}px</Label>
                      <Slider
                        value={[config.card.padding]}
                        onValueChange={([value]) => updateConfig("card.padding", value)}
                        max={48}
                        min={8}
                        step={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Button Settings */}
                <div className="space-y-3">
                  <Label className="font-medium">Button</Label>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Border Radius: {config.button.borderRadius}px</Label>
                      <Slider
                        value={[config.button.borderRadius]}
                        onValueChange={([value]) => updateConfig("button.borderRadius", value)}
                        max={20}
                        min={0}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Font Size: {config.button.fontSize}px</Label>
                      <Slider
                        value={[config.button.fontSize]}
                        onValueChange={([value]) => updateConfig("button.fontSize", value)}
                        max={20}
                        min={10}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Typography Settings */}
                <div className="space-y-3">
                  <Label className="font-medium">Typography</Label>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Font Size: {config.typography.fontSize}px</Label>
                      <Slider
                        value={[config.typography.fontSize]}
                        onValueChange={([value]) => updateConfig("typography.fontSize", value)}
                        max={20}
                        min={10}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Font Weight</Label>
                      <Select
                        value={config.typography.fontWeight}
                        onValueChange={(value) => updateConfig("typography.fontWeight", value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[110]">
                          <SelectItem value="300">Light (300)</SelectItem>
                          <SelectItem value="400">Normal (400)</SelectItem>
                          <SelectItem value="500">Medium (500)</SelectItem>
                          <SelectItem value="600">Semibold (600)</SelectItem>
                          <SelectItem value="700">Bold (700)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Line Height: {config.typography.lineHeight}</Label>
                      <Slider
                        value={[config.typography.lineHeight]}
                        onValueChange={([value]) => updateConfig("typography.lineHeight", value)}
                        max={2}
                        min={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
