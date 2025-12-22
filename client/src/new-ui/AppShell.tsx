import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { Link } from "wouter";
import {
  Sparkles,
  BookOpen,
  Layers,
  FileText,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";

export type NavItem = {
  key: string;
  label: string;
  description: string;
  path: string;
  accent: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "learning",
    label: "Learning",
    description: "Segment-first study flows with synced audio.",
    path: "/app/learning",
    accent: "accent",
    icon: BookOpen,
  },
  {
    key: "batches",
    label: "Batches",
    description: "Manage cohorts, instructors, and cadence.",
    path: "/app/batches",
    accent: "accent",
    icon: Layers,
  },
  {
    key: "content",
    label: "Content",
    description: "Tracks, chapters, and script-specific segments.",
    path: "/app/content",
    accent: "accent",
    icon: FileText,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Users, approvals, audits, and policies.",
    path: "/app/admin",
    accent: "accent",
    icon: ShieldCheck,
  },
];

export default function AppShell() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground"> 
      <TopNav />
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <Sidebar items={NAV_ITEMS} currentPath={location} />
          <main className="relative overflow-hidden rounded-3xl border border-border bg-card shadow">
            <div className="relative p-8">
              <Switch>
                <Route path="/app" component={() => <Overview items={NAV_ITEMS} />} />
                <Route path="/app/learning" component={() => <SectionPage title="Learning" summary="Plan the learner experience and preview segment playback." />} />
                <Route path="/app/batches" component={() => <SectionPage title="Batches" summary="Organize cohorts, co-instructors, and progression policies." />} />
                <Route path="/app/content" component={() => <SectionPage title="Content" summary="Draft tracks, chapter HTML, segmentation, and audio mapping." />} />
                <Route path="/app/admin" component={() => <SectionPage title="Admin" summary="Manage identities, approvals, audits, and guardrails." />} />
                <Route component={AppNotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Overview({ items }: { items: NavItem[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Phase 2 Shell</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">New app workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A focused shell for learning delivery, cohort management, and content workflows. Routes are preview-only and mapped to existing modules.
          </p>
        </div>
        <Link href="/">
          <a className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
            Return to legacy dashboard
          </a>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <Link key={item.key} href={item.path}>
            <a className="group block overflow-hidden rounded-2xl border border-border bg-card p-5 transition duration-200 hover:bg-muted">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow"> 
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-lg font-semibold text-foreground">{item.label}</div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Preview</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
                <span>Open</span>
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SectionPage({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Preview surface</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{summary}</p>
        </div>
        <Link href="/app">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to overview</a>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderCard label="What ships here" detail="Align modules to data model: tracks→chapters→segments→mappings." />
        <PlaceholderCard label="Next steps" detail="Wire TanStack Query + route loaders to existing APIs." />
        <PlaceholderCard label="UI goals" detail="Use design-system tokens; keep hover/active states clear." />
        <PlaceholderCard label="Notes" detail="Keep published chapters immutable; use SCRIPTS for language keys." />
      </div>
    </div>
  );
}

function PlaceholderCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function AppNotFound() {
  return (
    <div className="space-y-3 text-center">
      <h2 className="text-2xl font-semibold text-foreground">Not in this preview</h2>
      <p className="text-sm text-muted-foreground">This path is not defined in the Phase 2 shell yet.</p>
      <div className="flex justify-center gap-3 text-sm">
        <Link href="/app">
          <a className="rounded-full bg-accent px-4 py-2 text-accent-foreground hover:opacity-90 transition-colors">Back to shell</a>
        </Link>
        <Link href="/">
          <a className="rounded-full border border-border px-4 py-2 text-foreground hover:bg-muted transition-colors">Go to legacy UI</a>
        </Link>
      </div>
    </div>
  );
}
