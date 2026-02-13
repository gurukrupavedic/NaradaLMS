"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
    children,
    defaultTheme = "light",
    storageKey = "narada-theme",
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            enableSystem={true}
            storageKey={storageKey}
            {...props}
        >
            {children}
        </NextThemesProvider>
    )
}
