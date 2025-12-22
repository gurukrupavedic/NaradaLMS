import React from "react";
import { Palette, Sparkles, Waves, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/design-system/Tabs";

const palette = [
  { name: "Indigo", hex: "#4f46e5", usage: "Navigation, primary tabs" },
  { name: "Teal", hex: "#0d9488", usage: "Text tools, secondary CTAs" },
  { name: "Emerald", hex: "#10b981", usage: "Success, completed segments" },
  { name: "Amber", hex: "#d97706", usage: "Warnings, idle segments" },
  { name: "Orange", hex: "#ea580c", usage: "Recording, timed actions" },
  { name: "Rose", hex: "#f43f5e", usage: "Destructive, errors" },
  { name: "Violet", hex: "#a855f7", usage: "Highlights, preview" },
  { name: "Slate", hex: "#1f2937", usage: "Frames, neutral surfaces" }
];

const segmentStates = [
  { name: "Idle", className: "bg-amber-50 border-amber-100 text-amber-700" },
  { name: "Hover", className: "bg-amber-100 border-amber-200 text-amber-800" },
  { name: "Selected", className: "bg-indigo-200 border-indigo-300 text-indigo-900" },
  { name: "Recording", className: "bg-orange-100 border-orange-200 text-orange-800" },
  { name: "Mapped", className: "bg-emerald-100 border-emerald-200 text-emerald-800" }
];

export function ThemingPlayground() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div className="flex flex-col gap-4">
          <Badge variant="indigo" badgeStyle="modern" size="lg" className="w-fit">
            Parallel UI Theme Preview
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">VedicLMS Theming Playground</h1>
            <p className="text-slate-200 max-w-3xl">
              Visualize the vibrant multi-color palette for the new /_new experience. These tokens map directly to navigation, learning states, and audio mapping so we can iterate quickly without touching the current UI.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1">
                <Palette className="h-4 w-4 text-indigo-200" />
                Palette-first navigation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1">
                <Waves className="h-4 w-4 text-teal-200" />
                Audio + text sync states
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1">
                <Sparkles className="h-4 w-4 text-violet-200" />
                Experimental, safe to discard
              </span>
            </div>
          </div>
        </div>

        <Card variant="indigo" glow="subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Palette className="h-5 w-5 text-indigo-600" />
              Palette with usage notes
            </CardTitle>
            <CardDescription className="text-slate-600">
              Darkened Teal/Amber/Orange for contrast, with semantic anchors for navigation, mapping, and feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {palette.map(color => (
                <div
                  key={color.name}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-4 shadow-inner"
                >
                  <div
                    className="h-12 w-full rounded-lg shadow"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-100">{color.name}</span>
                    <Badge variant="gray" size="sm" className="bg-white/10 text-slate-200">
                      {color.hex}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{color.usage}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="teal" glow="subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-teal-700" />
              Component recipes
            </CardTitle>
            <CardDescription className="text-slate-700">
              Quick pairings to enforce the new semantic rules without hunting through the full design system lab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="navigation" className="w-full">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="navigation">Navigation</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="mapping">Audio mapping</TabsTrigger>
              </TabsList>

              <TabsContent value="navigation" className="pt-4 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Conventional (standard web UI)</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button color="indigo" variant="solid" styleApproach="conventional">Primary CTA</Button>
                    <Button color="teal" variant="outline" styleApproach="conventional">Secondary CTA</Button>
                    <Button color="purple" variant="ghost" styleApproach="conventional">Quiet action</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Fluorescent (experimental/dashboard)</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button color="indigo" variant="solid" styleApproach="fluorescent">Primary CTA</Button>
                    <Button color="teal" variant="outline" styleApproach="fluorescent">Secondary CTA</Button>
                    <Button color="purple" variant="ghost" styleApproach="fluorescent">Quiet action</Button>
                  </div>
                </div>
                <p className="text-sm text-slate-700">
                  Use conventional for forms/navigation; reserve fluorescent for feature cards and high-visibility tiles.
                </p>
              </TabsContent>

              <TabsContent value="feedback" className="pt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="emerald" badgeStyle="modern">Success</Badge>
                  <Badge variant="yellow" badgeStyle="sharp">Pending</Badge>
                  <Badge variant="orange" badgeStyle="sharp">Recording</Badge>
                  <Badge variant="rose" badgeStyle="modern">Error</Badge>
                </div>
                <p className="text-sm text-slate-700">
                  Emerald marks completion; Amber is a holding pattern; Orange signals live/recording; Rose reserves for destructive or blocking states.
                </p>
              </TabsContent>

              <TabsContent value="mapping" className="pt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="text-sm font-semibold">Idle text segment</p>
                    <p className="text-xs">Amber-50 background; upgrade to Amber-100 on hover.</p>
                  </div>
                  <div className="rounded-lg border border-indigo-300 bg-indigo-100 p-3 text-indigo-900">
                    <p className="text-sm font-semibold">Selected</p>
                    <p className="text-xs">Indigo-200 fill with Indigo-400 border for active selection.</p>
                  </div>
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
                    <p className="text-sm font-semibold">Mapped</p>
                    <p className="text-xs">Emerald for confirmed mappings; badge width stays 96px.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card variant="orange" glow="subtle">
          <CardHeader>
            <CardTitle className="text-slate-900">Segment state chips</CardTitle>
            <CardDescription className="text-slate-700">
              Reference for sticky-note aesthetics in the mapping flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {segmentStates.map(state => (
                <div
                  key={state.name}
                  className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${state.className}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{state.name}</span>
                    <Badge variant="gray" size="sm" className="bg-white/50 text-slate-700">
                      96px badge
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs opacity-80">Use consistent padding; avoid gradients on these chips.</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-slate-50" glow="subtle">
          <CardHeader>
            <CardTitle>Multiscript typography pass</CardTitle>
            <CardDescription className="text-slate-200">
              Font classes mapped to scripts for quick visual QA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-base">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-300">Telugu (30px JIMS)</p>
              <p className="font-telugu text-[30px] leading-[1.4]">ఓం నమో భగవతే వాసుదేవాయ</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-300">Devanagari (30px AdishilaSanVedic)</p>
              <p className="font-devanagari text-[30px] font-semibold leading-[1.4]">ॐ नमो भगवते वासुदेवाय</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-300">IAST (30px AdishilaSan)</p>
              <p className="font-iast text-[30px] leading-[1.4]">oṁ namo bhagavate vāsudevāya</p>
            </div>
            <p className="text-sm text-slate-300">
              Keep these baselines when we port the chapter editor into /_new. Tone-on-tone keeps the theming sandbox readable without competing with the core colors.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ThemingPlayground;
