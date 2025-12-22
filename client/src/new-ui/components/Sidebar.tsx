import React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { NavItem } from "../AppShell";

export function Sidebar({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  return (
    <aside className="rounded-3xl border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow backdrop-blur">
      <div className="px-2 pb-4 text-xs uppercase tracking-[0.18em] text-sidebar-foreground/70">Navigate</div>
      <div className="space-y-2">
        {items.map(item => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
          return (
            <Link key={item.key} href={item.path}>
              <a
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition duration-150",
                  isActive
                    ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-sidebar-border/40 bg-transparent hover:bg-sidebar-accent/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold leading-tight">{item.label}</div>
                  <p className="text-xs text-sidebar-foreground/70">{item.description}</p>
                </div>
              </a>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
