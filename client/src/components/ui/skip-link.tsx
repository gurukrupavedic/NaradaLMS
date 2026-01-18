import * as React from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export const SkipLink = React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => {
    return (
        <a
            href="#main-content"
            ref={ref}
            className={cn(
                buttonVariants({ variant: "default" }),
                "absolute left-4 top-4 z-[100] -translate-y-[150%] transition-transform focus:translate-y-0",
                className
            )}
            {...props}
        >
            Skip to content
        </a>
    )
})
SkipLink.displayName = "SkipLink"
