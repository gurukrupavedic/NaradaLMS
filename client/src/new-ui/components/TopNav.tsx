import React from "react";
import { Link } from "wouter";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 text-foreground">
        <Link href="/app">
          <a className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">VedicLMS</div>
              <div className="flex items-center gap-1 text-sm">
                Phase 2 workspace <Sparkles className="h-4 w-4 text-accent" />
              </div>
            </div>
          </a>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:inline">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
