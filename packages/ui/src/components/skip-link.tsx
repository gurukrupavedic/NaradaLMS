import * as React from "react"

import { cn } from "../lib/utils"

export interface SkipLinkProps extends React.ComponentProps<"a"> {
    href?: string
}

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
    ({ href = "#main-content", className, children = "Skip to main content", ...props }, ref) => {
        return (
            <a
                ref={ref}
                href={href}
                className={cn(
                    "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground shadow",
                    className
                )}
                {...props}
            >
                {children}
            </a>
        )
    }
)

SkipLink.displayName = "SkipLink"

export { SkipLink }

