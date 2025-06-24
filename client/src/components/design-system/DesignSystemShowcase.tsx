/**
 * Design System Showcase - Optimized & Organized
 * 
 * Compact, organized showcase for testing design system components.
 * Features grouped components, universal color picker, and reduced redundancy.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { Progress, CircularProgress } from "./Progress";
import { Badge } from "./Badge";
import { Alert, AlertTitle, AlertDescription } from "./Alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Avatar } from "./Avatar";
import { TextSegment } from "./TextSegment";
import { Textarea } from "./Textarea";
import { Switch } from "./Switch";
import { Tooltip, SimpleTooltip } from "./Tooltip";
import { Loading } from "./Loading";
import { RichTextEditor } from "./RichTextEditor";
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers, CheckCircle, AlertCircle, Info, XCircle, Star, Crown, Shield, Copy } from "lucide-react";

export function DesignSystemShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string>("blue");
  const [activeGroup, setActiveGroup] = useState<string>("foundation");
  
  const colorVariants = [
    "blue", "green", "purple", "orange", "pink", "indigo", 
    "teal", "cyan", "yellow", "lime", "rose", "emerald"
  ];

  const colorMap: Record<string, string> = {
    blue: "#3b82f6", green: "#22c55e", purple: "#a855f7", orange: "#f97316",
    pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6", cyan: "#06b6d4",
    yellow: "#eab308", lime: "#84cc16", rose: "#f43f5e", emerald: "#10b981"
  };

  const componentGroups = [
    { id: "foundation", name: "Foundation", icon: Layers, count: 5 },
    { id: "display", name: "Data Display", icon: CheckCircle, count: 4 },
    { id: "navigation", name: "Navigation", icon: Search, count: 3 },
    { id: "content", name: "Content", icon: Edit, count: 3 }
  ];

  const educationalVariants = ["lesson", "progress", "admin", "student"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with Universal Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vedic LMS Design System</h1>
              <p className="text-sm text-gray-600">15 components • 12 colors • Production ready</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Active Color:</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300" 
                  style={{ backgroundColor: colorMap[selectedVariant] }}
                ></div>
                <span className="text-sm font-medium capitalize">{selectedVariant}</span>
              </div>
            </div>
          </div>
          
          {/* Compact Color Picker */}
          <div className="flex flex-wrap gap-2">
            {colorVariants.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedVariant === variant 
                    ? 'border-gray-800 ring-2 ring-gray-300 scale-110' 
                    : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                }`}
                style={{ backgroundColor: colorMap[variant] }}
                title={variant}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Component Group Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {componentGroups.map((group) => {
              const IconComponent = group.icon;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    activeGroup === group.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{group.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Foundation Group */}
        {activeGroup === "foundation" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Foundation Components</h2>
              <span className="text-sm text-gray-500">Core building blocks</span>
            </div>

            {/* Cards */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Card Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card variant={selectedVariant} educational="lesson">
                  <CardHeader>
                    <CardTitle>Chapter 1: Introduction</CardTitle>
                    <CardDescription>Begin your Vedic learning journey</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">5 lessons • 45 min</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card variant={selectedVariant} educational="progress">
                  <CardHeader>
                    <CardTitle>Learning Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={75} variant={selectedVariant} educational="progress" />
                    <p className="text-sm text-gray-600 mt-2">3 of 4 chapters completed</p>
                  </CardContent>
                </Card>
                
                <Card variant={selectedVariant} educational="admin">
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">125 active students</span>
                      <Badge variant={selectedVariant} educational="admin">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Button Family
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["lesson", "progress", "admin", "student"].map((context) => (
                  <div key={context} className="space-y-3">
                    <p className="text-sm font-medium capitalize text-gray-700">{context}</p>
                    <div className="space-y-2">
                      <Button variant={selectedVariant} educational={context} size="sm">
                        {context === "lesson" && <BookOpen className="w-4 h-4 mr-2" />}
                        {context === "progress" && <CheckCircle className="w-4 h-4 mr-2" />}
                        {context === "admin" && <Shield className="w-4 h-4 mr-2" />}
                        {context === "student" && <User className="w-4 h-4 mr-2" />}
                        {context === "lesson" ? "Start Lesson" : 
                         context === "progress" ? "Continue" :
                         context === "admin" ? "Manage" : "Study"}
                      </Button>
                      <Button variant={selectedVariant} educational={context} size="sm" outline>
                        Secondary
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Input Family
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Student Name</label>
                    <Input variant={selectedVariant} educational="student" placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Course Search</label>
                    <Input variant={selectedVariant} educational="lesson" placeholder="Search courses..." icon={Search} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Admin Email</label>
                    <Input variant={selectedVariant} educational="admin" placeholder="admin@vedic-lms.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Progress Notes</label>
                    <Input variant={selectedVariant} educational="progress" placeholder="Add learning notes..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Badges & Avatars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Badge Family
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedVariant} educational="lesson">New Lesson</Badge>
                    <Badge variant={selectedVariant} educational="progress">75% Complete</Badge>
                    <Badge variant={selectedVariant} educational="admin">Admin</Badge>
                    <Badge variant={selectedVariant} educational="student">Student</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedVariant} educational="lesson" outline>Draft</Badge>
                    <Badge variant={selectedVariant} educational="progress" outline>In Progress</Badge>
                    <Badge variant={selectedVariant} educational="admin" outline>Pending</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Avatar Family
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name="Dr. Raghuram" educational="admin" showStatus status="online" />
                    <Avatar name="Priya Sharma" educational="student" showStatus status="away" />
                    <Avatar name="Sanskrit Class" educational="lesson" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar name="Admin" educational="admin" size="sm" />
                    <Avatar name="Student" educational="student" size="sm" />
                    <Avatar name="Instructor" educational="progress" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Component Integration Guide */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-12">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Integration Ready
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• All components follow consistent naming: Button, ButtonIcon, ButtonGroup</p>
            <p>• Universal color prop: variant="{selectedVariant}" applies to all components</p>
            <p>• Educational context: educational="lesson|progress|admin|student"</p>
            <p>• Copy component code directly from examples above</p>
          </div>
        </div>
      </div>
    </div>
  );
}