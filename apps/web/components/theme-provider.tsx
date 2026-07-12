'use client'

import { createContext, useContext, useLayoutEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'light',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({
  children,
  initialTheme,
  storageKey,
}: {
  children: React.ReactNode
  initialTheme: Theme
  storageKey: string
}) {
  const [theme, setTheme] = useState(initialTheme)
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.cookie = `${storageKey}=${theme}; path=/; max-age=31536000`
  }, [theme, storageKey])

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
