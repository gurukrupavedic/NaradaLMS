/**
 * Design System Showcase - Live Component Testing
 * 
 * Interactive showcase for testing design system components in isolation
 * before integrating into the main LMS application.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";
import { Button } from "./Button.new";
import { Input } from "./Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import { Progress, CircularProgress } from "./Progress";
import { Badge } from "./Badge";
import { Alert, AlertTitle, AlertDescription } from "./Alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { Avatar } from "./Avatar";
import { TextSegment } from "./TextSegment";
import { RichTextEditor } from "./RichTextEditor";
import { Switch } from "./Switch";
import { Tooltip, SimpleTooltip } from "./Tooltip";
import { Loading } from "./Loading";
import { Textarea } from "./Textarea";
import { Dialog, ConfirmDialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "./Dialog";
import { Checkbox, CheckboxGroup } from "./Checkbox";
import { Radio, RadioGroup, CommonRadioOptions } from "./Radio";
// Table import removed - component will be redesigned
import { Slider, AudioSlider, ProgressSlider } from "./Slider";
import { Breadcrumb, LMSBreadcrumbs } from "./Breadcrumb";
import { AudioControls } from "./AudioControls";
import { ComponentCard, ComponentInspector } from "./ComponentInspector";
import { colorVariants, componentConfigs, getComponentConfig } from "./utils/componentMeta";
import { BookOpen, Edit, Music, Play, Save, Trash2, Search, User, Mail, FileText, Headphones, Layers, CheckCircle, AlertCircle, Info, XCircle, Star, Crown, Shield, HelpCircle, Settings, Upload, Type, Volume2, Zap, X } from "lucide-react";

export function DesignSystemShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string>("blue");
  const [showDialog, setShowDialog] = useState(false);
  const [showComponentDialog, setShowComponentDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState<string[]>([]);
  const [radioValue, setRadioValue] = useState<string>("student");
  const [sliderValue, setSliderValue] = useState(50);
  const [audioCurrentTime, setAudioCurrentTime] = useState(30);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  // Table selection state removed
  
  // Enhanced state for component variants
  const [buttonVariant, setButtonVariant] = useState("blue");
  const [buttonSize, setButtonSize] = useState("default");
  // Table state removed - component will be redesigned
  const [sliderVariant, setSliderVariant] = useState("orange");
  const [sliderSize, setSliderSize] = useState("md");
  const [breadcrumbVariant, setBreadcrumbVariant] = useState("blue");
  const [breadcrumbSize, setBreadcrumbSize] = useState("md");
  
  // Additional component states
  const [inputVariant, setInputVariant] = useState("blue");
  const [inputSize, setInputSize] = useState("md");
  const [cardVariant, setCardVariant] = useState("blue");
  const [badgeVariant, setBadgeVariant] = useState("blue");
  const [badgeSize, setBadgeSize] = useState("md");
  const [progressVariant, setProgressVariant] = useState("blue");
  const [radioVariant, setRadioVariant] = useState("blue");
  const [radioSize, setRadioSize] = useState("md");
  const [priorityValue, setPriorityValue] = useState("medium");
  const [progressSize, setProgressSize] = useState("md");
  const [checkboxVariant, setCheckboxVariant] = useState("blue");
  const [checkboxSize, setCheckboxSize] = useState("md");
  const [switchVariant, setSwitchVariant] = useState("blue");
  const [switchSize, setSwitchSize] = useState("md");
  const [textareaVariant, setTextareaVariant] = useState("blue");
  const [textareaSize, setTextareaSize] = useState("md");
  const [tabsVariant, setTabsVariant] = useState("blue");
  const [tabsSize, setTabsSize] = useState("md");
  const [tooltipVariant, setTooltipVariant] = useState("blue");
  const [tooltipSize, setTooltipSize] = useState("md");
  const [loadingVariant, setLoadingVariant] = useState("blue");
  const [loadingSize, setLoadingSize] = useState("md");
  const [basicSliderVariant, setBasicSliderVariant] = useState("blue");
  const [basicSliderSize, setBasicSliderSize] = useState("md");
  const [progressSliderVariant, setProgressSliderVariant] = useState("green");
  
  // Slider props state management
  const [sliderProps, setSliderProps] = useState({ showValue: true, disabled: false });
  const [progressSliderProps, setProgressSliderProps] = useState({ showPercentage: true });
  
  // Additional states for remaining components
  const [dialogVariant, setDialogVariant] = useState("blue");
  const [dialogSize, setDialogSize] = useState("md");
  const [alertVariant, setAlertVariant] = useState("info");
  const [selectVariant, setSelectVariant] = useState("blue");
  const [selectSize, setSelectSize] = useState("md");
  const [avatarVariant, setAvatarVariant] = useState("blue");
  const [avatarSize, setAvatarSize] = useState("md");
  const [textSegmentVariant, setTextSegmentVariant] = useState("blue");

  // Complete 24-color system (12 primary + 12 fluorescent)
  const allColorVariants = [
    // Primary colors
    { name: "Blue", value: "blue", primary: "#3b82f6", fluorescent: "#00bfff" },
    { name: "Green", value: "green", primary: "#10b981", fluorescent: "#00ff7f" },
    { name: "Purple", value: "purple", primary: "#8b5cf6", fluorescent: "#9d4edd" },
    { name: "Orange", value: "orange", primary: "#f59e0b", fluorescent: "#ff6b35" },
    { name: "Pink", value: "pink", primary: "#ec4899", fluorescent: "#ff1493" },
    { name: "Indigo", value: "indigo", primary: "#6366f1", fluorescent: "#4169e1" },
    { name: "Teal", value: "teal", primary: "#14b8a6", fluorescent: "#00ced1" },
    { name: "Cyan", value: "cyan", primary: "#06b6d4", fluorescent: "#00ffff" },
    { name: "Yellow", value: "yellow", primary: "#eab308", fluorescent: "#ffff00" },
    { name: "Lime", value: "lime", primary: "#65a30d", fluorescent: "#9aff00" },
    { name: "Rose", value: "rose", primary: "#f43f5e", fluorescent: "#ff073a" },
    { name: "Emerald", value: "emerald", primary: "#059669", fluorescent: "#00ff80" }
  ];

  // Color mapping for swatches (using actual hex values)
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e", 
    purple: "#a855f7",
    orange: "#f97316",
    pink: "#ec4899",
    indigo: "#6366f1",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    yellow: "#eab308",
    lime: "#84cc16",
    rose: "#f43f5e",
    emerald: "#10b981"
  };

  const educationalVariants = [
    "lesson", "progress", "content", "feature", "audio", "text", "assessment", "track"
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Vedic LMS Design System
          </h1>
          <p className="text-lg text-gray-600">
            Modern colorful components for educational experiences
          </p>
        </div>

        {/* Color Variant Selector */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Color Variants</h2>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {colorVariants.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`p-3 rounded-lg border-2 transition-all capitalize ${
                  selectedVariant === variant 
                    ? 'border-gray-800 ring-2 ring-gray-300' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div 
                  className="w-full h-8 rounded mb-2" 
                  style={{ backgroundColor: colorMap[variant] }}
                ></div>
                <div className="text-xs font-medium">{variant}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card Components Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Card Components</h2>
          
          {/* Feature Cards (like SimpleDashboard) */}
          <div>
            <h3 className="text-xl font-medium mb-4">Feature Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <BookOpen 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Learning</CardTitle>
                  <CardDescription>
                    Browse and study learning tracks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Edit 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Manage Content</CardTitle>
                  <CardDescription>
                    Create and edit learning content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card variant={selectedVariant as any} interactive glow="subtle">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Music 
                      className="h-12 w-12" 
                      style={{ color: colorMap[selectedVariant] }}
                    />
                  </div>
                  <CardTitle className="text-lg">Audio Content</CardTitle>
                  <CardDescription>
                    Manage audio-text synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${selectedVariant}` as any}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Educational Variants */}
          <div>
            <h3 className="text-xl font-medium mb-4">Educational Variants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {educationalVariants.map((variant) => (
                <Card key={variant} educational={variant as any} glow="subtle">
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{variant}</CardTitle>
                    <CardDescription>
                      {variant} content card variant
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* NEW: Complete 24-Color System */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Complete 24-Color System</h2>
          <p className="text-gray-600">12 primary colors + 12 fluorescent glow variants</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allColorVariants.map((color) => (
              <div key={color.value} className="bg-white rounded-lg p-4 border text-center">
                <div className="space-y-2">
                  <div 
                    className="w-full h-12 rounded-lg border"
                    style={{ backgroundColor: color.primary }}
                  ></div>
                  <div 
                    className="w-full h-4 rounded border"
                    style={{ backgroundColor: color.fluorescent }}
                  ></div>
                  <div>
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs text-gray-500">Primary + Glow</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Dialogs */}
        <Dialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          title="User Invitation"
          description="Invite a new user to join your learning track"
          variant={selectedVariant as any}
        >
          <div className="space-y-4">
            <Input 
              placeholder="Enter email address" 
              variant={selectedVariant as any}
            />
            <RadioGroup
              name="invite-role"
              label="Assign Role"
              options={CommonRadioOptions.userRoles}
              value="student"
              onChange={() => {}}
              variant={selectedVariant as any}
              size="sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button variant={selectedVariant as any} onClick={() => setShowDialog(false)}>
              Send Invitation
            </Button>
          </DialogFooter>
        </Dialog>

        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={() => console.log("Deleted!")}
          title="Delete Chapter"
          description="Are you sure you want to delete this chapter? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          destructive={true}
        />

        {/* ENHANCED: Interactive Button Showcase */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Interactive Components</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="Action Buttons - Final Designs"
              description="2 refined styling approaches for our design system"
              componentName="Button"
              variant={buttonVariant}
              size={buttonSize}
              props={{ destructive: false, loading: false }}
              onVariantChange={setButtonVariant}
              onSizeChange={setButtonSize}
            >
              <div className="space-y-6">
                {/* Style 1: Fluorescent Glow */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">1. Fluorescent Glow (Default)</h4>
                  <p className="text-xs text-gray-500">Dashboard tile-inspired glow effects with scale transforms</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="solid" color={buttonVariant} size={buttonSize} styleApproach="fluorescent">
                      Primary
                    </Button>
                    <Button variant="outline" color={buttonVariant} size={buttonSize} styleApproach="fluorescent">
                      Secondary
                    </Button>
                    <Button variant="ghost" color={buttonVariant} size={buttonSize} styleApproach="fluorescent">
                      Ghost
                    </Button>
                  </div>
                </div>

                {/* Style 2: Card-Inspired */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">2. Card-Inspired</h4>
                  <p className="text-xs text-gray-500">Feature card hover mechanics with multi-layer glow system</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="solid" color={buttonVariant} size={buttonSize} styleApproach="card">
                      Primary
                    </Button>
                    <Button variant="outline" color={buttonVariant} size={buttonSize} styleApproach="card">
                      Secondary
                    </Button>
                    <Button variant="ghost" color={buttonVariant} size={buttonSize} styleApproach="card">
                      Ghost
                    </Button>
                  </div>
                </div>

                {/* Additional Examples */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Interactive Examples</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="solid" color={buttonVariant} size={buttonSize} styleApproach="fluorescent" loading>
                      Loading
                    </Button>
                    <Button variant="solid" color={buttonVariant} size={buttonSize} styleApproach="card" icon={<Edit className="h-4 w-4" />}>
                      With Icon
                    </Button>
                    <Button variant="solid" color="rose" size={buttonSize} styleApproach="fluorescent">
                      Delete
                    </Button>
                    <Button variant="outline" color={buttonVariant} size={buttonSize} styleApproach="card" fullWidth>
                      Full Width Card Style
                    </Button>
                  </div>
                </div>

                {/* Size Demonstration */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Size Progression</h4>
                  <div className="flex gap-2 items-center flex-wrap">
                    <Button variant="solid" color={buttonVariant} size="sm" styleApproach="fluorescent">Small</Button>
                    <Button variant="solid" color={buttonVariant} size="default" styleApproach="fluorescent">Default</Button>
                    <Button variant="solid" color={buttonVariant} size="lg" styleApproach="fluorescent">Large</Button>
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Form Controls"
              description="Checkbox and radio selections with inspector"
              componentName="CheckboxGroup"
              variant={checkboxVariant}
              size={checkboxSize}
              props={{ disabled: false, indeterminate: false }}
              onVariantChange={setCheckboxVariant}
              onSizeChange={setCheckboxSize}
            >
              <div className="space-y-4">
                <CheckboxGroup
                  label="Content Selection"
                  options={[
                    { id: "ch1", label: "Chapter 1" },
                    { id: "ch2", label: "Chapter 2" }
                  ]}
                  value={checkboxValue}
                  onChange={setCheckboxValue}
                  variant={checkboxVariant as any}
                  size={checkboxSize as any}
                />
                <RadioGroup
                  name="role"
                  label="User Role"
                  options={CommonRadioOptions.userRoles.slice(0, 2)}
                  value={radioValue}
                  onChange={setRadioValue}
                  variant={radioVariant as any}
                  size={radioSize as any}
                />
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* Data Management section removed - Table component will be redesigned with clear requirements */}

        {/* ENHANCED: Audio & Progress Controls with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Audio & Progress Controls</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="Audio Timeline"
              description="Perfect for audio-text synchronization"
              componentName="AudioSlider"
              variant={sliderVariant}
              props={{ showVolume: true }}
              onVariantChange={setSliderVariant}
              allSizes={[]}
            >
              <AudioSlider
                currentTime={audioCurrentTime}
                duration={120}
                onSeek={setAudioCurrentTime}
                isPlaying={isAudioPlaying}
                onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)}
                variant={sliderVariant as any}
                showVolume={true}
              />
            </ComponentCard>

            <ComponentCard
              title="Full Audio Controls"
              description="Complete audio player with timeline and controls"
              componentName="AudioControls"
              variant={sliderVariant}
              size={sliderSize}
              props={{ 
                isPlaying: isAudioPlaying, 
                showSkipButtons: true,
                showPlaybackRate: true,
                showVolumeControl: true
              }}
              onVariantChange={setSliderVariant}
              onSizeChange={setSliderSize}
            >
              <AudioControls
                variant={sliderVariant as any}
                size={sliderSize as any}
                title="Chapter 1: Vedic Foundations"
                isPlaying={isAudioPlaying}
                currentTime={audioCurrentTime}
                duration={120.7}
                volume={75}
                playbackRate={1}
                bufferedProgress={85.3}
                onPlay={() => setIsAudioPlaying(true)}
                onPause={() => setIsAudioPlaying(false)}
                onStop={() => {
                  setIsAudioPlaying(false);
                  setAudioCurrentTime(0);
                }}
                onSeek={(time) => setAudioCurrentTime(time)}
                onSkipBackward={() => setAudioCurrentTime(Math.max(0, audioCurrentTime - 10.0))}
                onSkipForward={() => setAudioCurrentTime(Math.min(120.7, audioCurrentTime + 10.0))}
              />
            </ComponentCard>

            <ComponentCard
              title="Learning Progress"
              description="Track student completion"
              componentName="ProgressSlider"
              variant={progressSliderVariant}
              props={progressSliderProps}
              onVariantChange={setProgressSliderVariant}
              onPropsChange={setProgressSliderProps}
              allSizes={[]}
            >
              <div className="space-y-4">
                <ProgressSlider
                  progress={75}
                  total={100}
                  label="Chapter Progress"
                  variant={progressSliderVariant as any}
                  showPercentage={progressSliderProps.showPercentage}
                />
                <ProgressSlider
                  progress={45}
                  total={100}
                  label="Overall Track"
                  variant="emerald"
                  showPercentage={progressSliderProps.showPercentage}
                />
                <Slider
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={setSliderValue}
                  variant={basicSliderVariant as any}
                  label="Custom Slider"
                  showValue
                />
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Navigation System with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Navigation System</h2>
          
          <ComponentCard
            title="Content Navigation"
            description="Hierarchical breadcrumb navigation"
            componentName="Breadcrumb"
            variant={breadcrumbVariant}
            size={breadcrumbSize}
            props={{ showHome: true, maxItems: 4 }}
            onVariantChange={setBreadcrumbVariant}
            onSizeChange={setBreadcrumbSize}
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Content Management</h4>
                <Breadcrumb
                  items={LMSBreadcrumbs.chapterManagement("1", "Vedic Fundamentals", "1", "Introduction to Sanskrit")}
                  variant={breadcrumbVariant as any}
                  size={breadcrumbSize as any}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Student Learning Path</h4>
                <Breadcrumb
                  items={[
                    { label: "My Learning", href: "/dashboard" },
                    { label: "Advanced Sanskrit" },
                    { label: "Chapter 3: Compound Words" }
                  ]}
                  variant={breadcrumbVariant as any}
                  size={breadcrumbSize as any}
                  maxItems={4}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Administration</h4>
                <Breadcrumb
                  items={[
                    { label: "Admin", href: "/admin" },
                    { label: "User Management", href: "/admin/users" },
                    { label: "Teacher Permissions" }
                  ]}
                  variant={breadcrumbVariant as any}
                  size={breadcrumbSize as any}
                />
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* ENHANCED: Input Components with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Input Components</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="Text Inputs"
              description="Form inputs with focus color variants"
              componentName="Input"
              variant={inputVariant}
              size={inputSize}
              props={{ disabled: false, required: false }}
              onVariantChange={setInputVariant}
              onSizeChange={setInputSize}
            >
              <div className="space-y-4">
                <Input 
                  variant={inputVariant as any}
                  size={inputSize as any}
                  placeholder="Enter text here..." 
                />
                <Input 
                  variant={inputVariant as any}
                  size={inputSize as any}
                  placeholder="Disabled input" 
                  disabled 
                />
                <Input 
                  variant={inputVariant as any}
                  size={inputSize as any}
                  placeholder="Required field" 
                  required 
                />
              </div>
            </ComponentCard>

            <ComponentCard
              title="Textarea Fields"
              description="Multi-line text input areas"
              componentName="Textarea"
              variant={textareaVariant}
              size={textareaSize}
              props={{ disabled: false, required: false }}
              onVariantChange={setTextareaVariant}
              onSizeChange={setTextareaSize}
            >
              <div className="space-y-4">
                <Textarea
                  variant={textareaVariant as any}
                  size={textareaSize as any}
                  placeholder="Enter description..."
                  rows={3}
                />
                <Textarea
                  variant={textareaVariant as any}
                  size={textareaSize as any}
                  placeholder="Disabled textarea"
                  disabled
                  rows={2}
                />
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: UI Elements with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">UI Elements</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ComponentCard
              title="Status Badges"
              description="Labels and status indicators with multiple styles"
              componentName="Badge"
              variant={badgeVariant}
              size={badgeSize}
              props={{ style: "classic" }}
              onVariantChange={setBadgeVariant}
              onSizeChange={setBadgeSize}
            >
              <div className="space-y-4">
                {/* Classic Style */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Classic Style</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badgeVariant as any} style="classic" size={badgeSize as any}>
                      Interactive
                    </Badge>
                    <Badge variant="green" style="classic" size={badgeSize as any}>Published</Badge>
                    <Badge variant="orange" style="classic" size={badgeSize as any}>Draft</Badge>
                    <Badge variant="purple" style="classic" size={badgeSize as any}>Review</Badge>
                  </div>
                </div>

                {/* Modern Style with Gradients */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Modern Gradient Style</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badgeVariant as any} style="modern" size={badgeSize as any}>
                      Premium
                    </Badge>
                    <Badge variant="green" style="modern" size={badgeSize as any}>Success</Badge>
                    <Badge variant="purple" style="modern" size={badgeSize as any}>Featured</Badge>
                    <Badge variant="cyan" style="modern" size={badgeSize as any}>New</Badge>
                  </div>
                </div>

                {/* Sharp Style with Accent Borders */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sharp Accent Style</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badgeVariant as any} style="sharp" size={badgeSize as any} dotColor="#3b82f6">
                      Status
                    </Badge>
                    <Badge variant="emerald" style="sharp" size={badgeSize as any} icon={<div className="w-2 h-2 bg-green-400 rounded-full" />}>
                      Active
                    </Badge>
                    <Badge variant="rose" style="sharp" size={badgeSize as any}>Priority</Badge>
                    <Badge variant="yellow" style="sharp" size={badgeSize as any}>Warning</Badge>
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Progress Bars"
              description="Linear progress indicators"
              componentName="Progress"
              variant={progressVariant}
              size={progressSize}
              props={{ animated: false, showPercentage: true }}
              onVariantChange={setProgressVariant}
              onSizeChange={setProgressSize}
            >
              <div className="space-y-4">
                <Progress
                  value={75}
                  variant={progressVariant as any}
                  size={progressSize as any}
                  label="Chapter Progress"
                  showPercentage
                />
                <Progress
                  value={45}
                  variant="emerald"
                  size={progressSize as any}
                  label="Overall Completion"
                  animated
                />
              </div>
            </ComponentCard>

            <ComponentCard
              title="Toggle Switches"
              description="Binary choice controls"
              componentName="Switch"
              variant={switchVariant}
              size={switchSize}
              props={{ disabled: false }}
              onVariantChange={setSwitchVariant}
              onSizeChange={setSwitchSize}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Switch variant={switchVariant as any} size={switchSize as any} />
                  <label className="text-sm font-medium">Enable notifications</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch variant="green" size={switchSize as any} defaultChecked />
                  <label className="text-sm font-medium">Auto-save content</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch variant="purple" size={switchSize as any} disabled />
                  <label className="text-sm font-medium text-gray-400">Disabled option</label>
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Interactive Controls with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Interactive Controls</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="Range Sliders"
              description="Numeric input sliders"
              componentName="Slider"
              variant={basicSliderVariant}
              size={basicSliderSize}
              props={sliderProps}
              onVariantChange={setBasicSliderVariant}
              onSizeChange={setBasicSliderSize}
              onPropsChange={setSliderProps}
            >
              <div className="space-y-6">
                <Slider
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={setSliderValue}
                  variant={basicSliderVariant as any}
                  size={basicSliderSize as any}
                  label="Volume Control"
                  showValue={sliderProps.showValue}
                  disabled={sliderProps.disabled}
                />
                <Slider
                  min={1}
                  max={10}
                  value={5}
                  onChange={() => {}}
                  variant="purple"
                  size={basicSliderSize as any}
                  label="Difficulty Level"
                  showValue={sliderProps.showValue}
                  disabled={sliderProps.disabled}
                  formatValue={(val) => `Level ${val}`}
                />
              </div>
            </ComponentCard>

            <ComponentCard
              title="Tab Navigation"
              description="Content section tabs"
              componentName="Tabs"
              variant={tabsVariant}
              size={tabsSize}
              props={{}}
              onVariantChange={setTabsVariant}
              onSizeChange={setTabsSize}
            >
              <Tabs defaultValue="content" className="w-full">
                <TabsList variant={tabsVariant as any} size={tabsSize as any}>
                  <TabsTrigger value="content" variant={tabsVariant as any} size={tabsSize as any}>
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="audio" variant={tabsVariant as any} size={tabsSize as any}>
                    Audio
                  </TabsTrigger>
                  <TabsTrigger value="settings" variant={tabsVariant as any} size={tabsSize as any}>
                    Settings
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="mt-4">
                  <p className="text-sm text-gray-600">Content management panel would appear here.</p>
                </TabsContent>
                <TabsContent value="audio" className="mt-4">
                  <p className="text-sm text-gray-600">Audio controls and timeline would appear here.</p>
                </TabsContent>
                <TabsContent value="settings" className="mt-4">
                  <p className="text-sm text-gray-600">Configuration options would appear here.</p>
                </TabsContent>
              </Tabs>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Card Layouts with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Card Layouts</h2>
          
          <ComponentCard
            title="Content Cards"
            description="Container cards with glow effects"
            componentName="Card"
            variant={cardVariant}
            props={{ glow: "subtle", interactive: true }}
            onVariantChange={setCardVariant}
            allSizes={[]}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant={cardVariant as any} glow="subtle" interactive>
                <CardHeader className="text-center">
                  <BookOpen className={`h-8 w-8 mx-auto mb-2 text-${cardVariant}-600`} />
                  <CardTitle className={`text-base text-${cardVariant}-700 font-semibold`}>Learning Track</CardTitle>
                  <CardDescription className={`text-${cardVariant}-500`}>Sanskrit Fundamentals</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant={`outline-${cardVariant}` as any}>
                    Continue Learning
                  </Button>
                </CardContent>
              </Card>

              <Card variant="green" glow="subtle" interactive>
                <CardHeader className="text-center">
                  <Music className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <CardTitle className="text-base text-green-700 font-semibold">Audio Content</CardTitle>
                  <CardDescription className="text-green-500">Chapter Recordings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline-green">
                    Play Audio
                  </Button>
                </CardContent>
              </Card>

              <Card variant="purple" glow="subtle" interactive>
                <CardHeader className="text-center">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <CardTitle className="text-base text-purple-700 font-semibold">Settings</CardTitle>
                  <CardDescription className="text-purple-500">Preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline-purple">
                    Configure
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ComponentCard>
        </div>

        {/* ENHANCED: Specialized Components with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Specialized Components</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ComponentCard
              title="Loading States"
              description="Loading spinners and indicators"
              componentName="Loading"
              variant={loadingVariant}
              size={loadingSize}
              props={{ message: "Loading content..." }}
              allSizes={getComponentConfig("Loading")?.sizes || ["sm", "md", "lg", "xl"]}
              onVariantChange={setLoadingVariant}
              onSizeChange={setLoadingSize}
            >
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Interactive Loading (changes with inspector)</p>
                  <Loading variant={loadingVariant as any} size={loadingSize as any} message="Processing chapter..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">Size Comparison</p>
                    <div className="flex items-center justify-center gap-3">
                      <Loading.Spinner variant="blue" size="sm" />
                      <Loading.Spinner variant="green" size="md" />
                      <Loading.Spinner variant="purple" size="lg" />
                      <Loading.Spinner variant="orange" size="xl" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">Skeleton Loading</p>
                    <Loading.Content variant={loadingVariant as any} />
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Help Tooltips"
              description="Contextual information and guidance tooltips"
              componentName="Tooltip"
              variant={tooltipVariant}
              size={tooltipSize}
              props={{ delayDuration: 400, educational: "help" }}
              allSizes={getComponentConfig("Tooltip")?.sizes || ["top", "right", "bottom", "left"]}
              onVariantChange={setTooltipVariant}
              onSizeChange={setTooltipSize}
            >
              <div className="space-y-6">
                {/* Interactive Tooltip with Inspector */}
                <div className="text-center space-y-3">
                  <SimpleTooltip
                    content={`Dynamic tooltip: ${tooltipVariant} variant, ${tooltipSize} position`}
                    variant={tooltipVariant as any}
                    side={tooltipSize as any}
                  >
                    <div className="inline-block p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-200 cursor-help">
                      <div className="text-sm font-medium text-gray-700">Interactive Element</div>
                      <div className="text-xs text-gray-500 mt-1">Hover: {tooltipVariant} color, {tooltipSize} position</div>
                    </div>
                  </SimpleTooltip>
                </div>

                {/* Elegant LMS Context Examples */}
                <div className="grid grid-cols-2 gap-3">
                  <SimpleTooltip
                    content="Upload audio for chapter synchronization"
                    educational="audio"
                    side="top"
                  >
                    <div className="p-3 bg-orange-50 hover:bg-orange-100/70 rounded-lg border border-orange-200/60 hover:border-orange-300/80 transition-all duration-200 cursor-pointer hover:shadow-[0_4px_14px_rgba(251,146,60,0.15)]">
                      <div className="text-sm font-medium text-orange-700">Audio Upload</div>
                    </div>
                  </SimpleTooltip>
                  
                  <SimpleTooltip
                    content="Beta feature - provide feedback"
                    educational="beta"
                    side="top"
                  >
                    <div className="p-3 bg-orange-50 hover:bg-orange-100/70 rounded-lg border border-orange-200/60 hover:border-orange-300/80 transition-all duration-200 cursor-pointer hover:shadow-[0_4px_14px_rgba(251,146,60,0.15)]">
                      <div className="text-sm font-medium text-orange-700">Auto-Sync (Beta)</div>
                    </div>
                  </SimpleTooltip>
                  
                  <SimpleTooltip
                    content="Keyboard shortcut: Ctrl+S"
                    educational="shortcut"
                    side="bottom"
                  >
                    <div className="p-3 bg-indigo-50 hover:bg-indigo-100/70 rounded-lg border border-indigo-200/60 hover:border-indigo-300/80 transition-all duration-200 cursor-pointer hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]">
                      <div className="text-sm font-medium text-indigo-700">Save Chapter</div>
                    </div>
                  </SimpleTooltip>
                  
                  <SimpleTooltip
                    content="Warning: Makes content public instantly"
                    educational="warning"
                    side="bottom"
                  >
                    <div className="p-3 bg-yellow-50 hover:bg-yellow-100/70 rounded-lg border border-yellow-200/60 hover:border-yellow-300/80 transition-all duration-200 cursor-pointer hover:shadow-[0_4px_14px_rgba(234,179,8,0.15)]">
                      <div className="text-sm font-medium text-yellow-700">Publish Content</div>
                    </div>
                  </SimpleTooltip>
                </div>

                {/* Clean Positioning Demo */}
                <div className="relative">
                  <div className="text-center space-y-3">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Positioning Demo</div>
                    <div className="flex justify-center gap-4">
                      <SimpleTooltip content="Top positioned" variant="purple" side="top">
                        <Badge variant="purple" className="cursor-help">Top</Badge>
                      </SimpleTooltip>
                      <SimpleTooltip content="Right positioned" variant="teal" side="right">
                        <Badge variant="teal" className="cursor-help">Right</Badge>
                      </SimpleTooltip>
                      <SimpleTooltip content="Bottom positioned" variant="pink" side="bottom">
                        <Badge variant="pink" className="cursor-help">Bottom</Badge>
                      </SimpleTooltip>
                      <SimpleTooltip content="Left positioned" variant="cyan" side="left">
                        <Badge variant="cyan" className="cursor-help">Left</Badge>
                      </SimpleTooltip>
                    </div>
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Radio Selection"
              description="Single choice radio buttons"
              componentName="Radio"
              variant={radioVariant}
              size={radioSize}
              props={{ disabled: false, direction: "vertical" }}
              allSizes={getComponentConfig("Radio")?.sizes || ["sm", "md", "lg"]}
              onVariantChange={setRadioVariant}
              onSizeChange={setRadioSize}
            >
              <div className="space-y-6">
                <RadioGroup
                  name="priority"
                  label="Priority Level"
                  description="Select task priority for chapter editing"
                  options={[
                    { value: "low", label: "Low Priority", description: "Non-urgent content updates" },
                    { value: "medium", label: "Medium Priority", description: "Standard content review" },
                    { value: "high", label: "High Priority", description: "Critical content fixes" }
                  ]}
                  value={priorityValue}
                  onChange={setPriorityValue}
                  variant={radioVariant as any}
                  size={radioSize as any}
                />
                
                <RadioGroup
                  name="difficulty"
                  label="Content Difficulty"
                  options={CommonRadioOptions.difficultyLevels}
                  value={radioValue}
                  onChange={setRadioValue}
                  variant={radioVariant as any}
                  size={radioSize as any}
                  direction="horizontal"
                />
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Alert & Dialog Components with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Alert & Dialog Components</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="System Alerts"
              description="Notifications and feedback messages"
              componentName="Alert"
              variant={alertVariant}
              props={{ dismissible: true, icon: "Info" }}
              onVariantChange={setAlertVariant}
              allSizes={[]}
            >
              <div className="space-y-4">
                <Alert variant={alertVariant as any} dismissible>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Interactive Alert</AlertTitle>
                  <AlertDescription>
                    This alert changes color when you select different variants. Click the X to dismiss it.
                  </AlertDescription>
                </Alert>

                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Your chapter has been successfully published and is now live for students.
                  </AlertDescription>
                </Alert>

                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Please review your content before publishing. Some audio mappings may be incomplete.
                  </AlertDescription>
                </Alert>

                <Alert variant="error">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to save changes. Please check your connection and try again.
                  </AlertDescription>
                </Alert>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Dialog Modals"
              description="Modal dialogs for confirmations"
              componentName="Dialog"
              variant={dialogVariant}
              size={dialogSize}
              props={{ showCloseButton: true, destructive: false }}
              allSizes={getComponentConfig("Dialog")?.sizes || ["sm", "md", "lg", "xl"]}
              onVariantChange={setDialogVariant}
              onSizeChange={setDialogSize}
            >
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button onClick={() => setShowComponentDialog(true)} variant={dialogVariant as any}>
                    Open Dialog
                  </Button>
                  <Button variant="rose" onClick={() => setShowConfirmDialog(true)}>
                    Delete Confirmation
                  </Button>
                </div>
                
                <Dialog 
                  isOpen={showComponentDialog} 
                  onClose={() => setShowComponentDialog(false)} 
                  title="Edit Chapter" 
                  description="Update chapter content and settings"
                  variant={dialogVariant as any} 
                  size={dialogSize as any}
                >
                  <p>This is a sample dialog content where you would edit chapter details. The dialog adapts to different variants and sizes based on your selection.</p>
                  
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Title</label>
                      <input 
                        type="text" 
                        defaultValue="Introduction to Vedic Mathematics"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Published</option>
                        <option>Draft</option>
                        <option>Review</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowComponentDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant={dialogVariant as any} onClick={() => setShowComponentDialog(false)}>
                      Save Changes
                    </Button>
                  </div>
                </Dialog>

                <ConfirmDialog
                  isOpen={showConfirmDialog}
                  onClose={() => setShowConfirmDialog(false)}
                  onConfirm={() => setShowConfirmDialog(false)}
                  title="Delete Chapter"
                  description="Are you sure you want to delete this chapter? This action cannot be undone."
                  confirmText="Delete"
                  cancelText="Cancel"
                  variant="rose"
                  destructive={true}
                />
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Selection Components with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Selection Components</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentCard
              title="Select Dropdowns"
              description="Dropdown selection menus"
              componentName="Select"
              variant={selectVariant}
              size={selectSize}
              props={{ disabled: false, required: false }}
              allSizes={getComponentConfig("Select")?.sizes || ["sm", "md", "lg"]}
              onVariantChange={setSelectVariant}
              onSizeChange={setSelectSize}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Language</label>
                  <Select>
                    <SelectTrigger variant={selectVariant as any} size={selectSize as any}>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent variant={selectVariant as any} size={selectSize as any}>
                      <SelectItem value="te">Telugu</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sa">Sanskrit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Role</label>
                  <Select>
                    <SelectTrigger variant={selectVariant as any} size={selectSize as any}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent variant={selectVariant as any} size={selectSize as any}>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="Avatar Display"
              description="User profile avatars"
              componentName="Avatar"
              variant={avatarVariant}
              size={avatarSize}
              props={{ showStatus: true, name: "John Doe" }}
              allSizes={getComponentConfig("Avatar")?.sizes || ["sm", "md", "lg"]}
              onVariantChange={setAvatarVariant}
              onSizeChange={setAvatarSize}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar 
                    variant={avatarVariant as any} 
                    size={avatarSize as any} 
                    name="John Doe"
                    showStatus
                    status="online"
                  />
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-gray-500">Administrator</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Avatar variant="green" size="sm" name="Alice Smith" showStatus status="away" />
                  <Avatar variant="purple" size="md" name="Bob Wilson" showStatus status="busy" />
                  <Avatar variant="orange" size="lg" name="Carol Johnson" showStatus status="offline" />
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* ENHANCED: Text Segment Components with Inspector */}
        <div className="space-y-8">
          <h2 className="text-3xl font-semibold text-gray-900">Text Segment Components</h2>
          
          <ComponentCard
            title="Content Segments"
            description="LMS text segmentation components"
            componentName="TextSegment"
            variant={textSegmentVariant}
            size="md"
            props={{ isMapped: false, showActions: true }}
            onVariantChange={setTextSegmentVariant}
            allSizes={["sm", "md", "lg"]}
          >
            <div className="space-y-4">
              <div className="grid gap-4">
                <TextSegment
                  variant={textSegmentVariant as any}
                  content="ॐ गं गणपतये नमः। शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम्। प्रसन्नवदनं ध्यायेत् सर्वविघ्नोपशान्तये॥

This is a longer Sanskrit verse that demonstrates the responsive text wrapping capability. The segment automatically adjusts its height to accommodate all content without truncation."
                  segmentNumber={1}
                  isMapped={true}
                  isSelected={false}
                />
                
                <TextSegment
                  variant={textSegmentVariant as any}
                  content="मूकं करोति वाचालं पङ्गुं लङ्घयते गिरिम्। यत्कृपा तमहं वन्दे परमानन्दमाधवम्॥

Short segment that shows how content adapts naturally to available space without artificial limitations."
                  segmentNumber={2}
                  isMapped={false}
                  isSelected={true}
                />
                
                <TextSegment
                  variant={textSegmentVariant as any}
                  content="सत्यं ज्ञानमनन्तं ब्रह्म। विज्ञानं आनन्दं ब्रह्म। सत्यं ब्रह्म। ज्ञानं ब्रह्म। आनन्दं ब्रह्म॥

That which is the finest essence - this whole world has that as its Self. That is Reality. That is the Self. That thou art, O Śvetaketu.

This bilingual segment demonstrates how the component handles mixed languages and longer content with proper line breaks and responsive height adjustment."
                  segmentNumber={3}
                  isMapped={true}
                  isSelected={false}
                />
                
                <TextSegment
                  variant={textSegmentVariant as any}
                  content="A very long educational text segment that would typically be used in the Vedic LMS for comprehensive content delivery. This demonstrates how the component handles extensive content without truncation, maintaining readability and proper formatting across multiple lines. The text wraps naturally and the segment height adjusts automatically to accommodate all content."
                  segmentNumber={4}
                  isMapped={false}
                  isSelected={false}
                  state="dragging"
                />
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4 mt-6 border border-gray-200/60">
                <h4 className="text-sm font-medium mb-3 text-gray-700">Interactive States Demo:</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 font-medium">Static:</span>
                    <div className="flex-1">
                      <TextSegment
                        variant="blue"
                        content="Default appearance with grab cursor, hover for actions"
                        segmentNumber={1}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 font-medium">Selected:</span>
                    <div className="flex-1">
                      <TextSegment
                        variant="green"
                        content="Clean selection with gradient background"
                        segmentNumber={2}
                        isSelected={true}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 font-medium">Mapped:</span>
                    <div className="flex-1">
                      <TextSegment
                        variant="blue"
                        content="Mapped status shown via green link icon"
                        segmentNumber={4}
                        isMapped={true}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 font-medium">Dragging:</span>
                    <div className="flex-1">
                      <TextSegment
                        variant="purple"
                        content="Rotated and scaled during drag operation"
                        segmentNumber={3}
                        isDragging={true}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>



      </div>
    </div>
  );
}
