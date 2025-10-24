/**
 * Design System Showcase - Live Component Testing
 * 
 * Interactive showcase for testing design system components in isolation
 * before integrating into the main LMS application.
 * 
 * @author LMS Design System v1.0
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
  const [featureCardVariant, setFeatureCardVariant] = useState("blue");
  const [buttonVariant, setButtonVariant] = useState("blue");
  const [buttonSize, setButtonSize] = useState("default");
  // Table state removed - component will be redesigned
  const [sliderVariant, setSliderVariant] = useState("orange");
  const [sliderSize, setSliderSize] = useState("md");
  const [audioSliderProps, setAudioSliderProps] = useState({ showVolume: true });
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
  const [textSegmentScript, setTextSegmentScript] = useState<'te' | 'hi' | 'en'>('te');
  const [textSegmentFontSize, setTextSegmentFontSize] = useState("28px");

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
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LMS Design System v1.0
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Modern colorful components for educational experiences
          </p>
        </div>

        {/* Component 1 */}
            <ComponentCard
              title="1. Feature Cards"
              description="Interactive dashboard cards designed for primary application navigation and feature discovery. Built with vibrant 12-color variants, subtle glow effects, and smooth hover animations that lift cards 2px for elegant visual feedback. Essential for creating engaging landing pages and feature showcases where users need clear visual hierarchy and intuitive navigation paths. Each card supports custom icons, titles, descriptions, and action buttons with consistent styling across the design system. Features responsive grid layouts that adapt from single-column mobile displays to multi-column desktop arrangements. Integrates seamlessly with the broader card ecosystem while maintaining distinctive visual prominence through enhanced shadows and interactive states. Perfect for onboarding flows, feature tours, and main navigation interfaces where visual appeal drives user engagement and discovery."
              componentName="FeatureCard"
              variant={featureCardVariant}
              props={{ interactive: true, glow: "subtle" }}
              allSizes={[]}
              onVariantChange={setFeatureCardVariant}
            >
              <div className="grid grid-cols-1 gap-6">
                <Card variant={featureCardVariant as any} interactive glow="subtle">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                      <BookOpen 
                        className={`h-12 w-12 text-${featureCardVariant}-600`}
                      />
                    </div>
                    <CardTitle className="text-lg">Learning</CardTitle>
                    <CardDescription>
                      Browse and study learning tracks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" color={featureCardVariant as any}>
                      Get Started
                    </Button>
                  </CardContent>
                </Card>

                <Card variant="green" interactive glow="subtle">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                      <Edit 
                        className="h-12 w-12 text-green-600"
                      />
                    </div>
                    <CardTitle className="text-lg">Manage Content</CardTitle>
                    <CardDescription>
                      Create and edit learning content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" color="green">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>

                <Card variant="purple" interactive glow="subtle">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                      <Music 
                        className="h-12 w-12 text-purple-600"
                      />
                    </div>
                    <CardTitle className="text-lg">Audio Content</CardTitle>
                    <CardDescription>
                      Manage audio-text synchronization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" color="purple">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ComponentCard>

            <ComponentCard
              title="2. Educational Variants"
              description="Specialized card variants semantically designed for educational content organization and learning management. Features dedicated variants for lessons, chapters, tracks, quizzes, assignments, and progress indicators, each with purposeful visual styling that communicates content type at a glance. Built specifically for LMS environments where content categorization is critical for student navigation and instructor management. Each variant maintains consistent interaction patterns while providing unique visual identities through color-coded borders, backgrounds, and typography hierarchies. Supports educational metadata display including completion status, difficulty levels, estimated time, and prerequisites. Integrates with learning analytics and progress tracking systems to provide real-time visual feedback on student advancement. Essential for course builders, student dashboards, and content libraries where instant content recognition improves learning efficiency and reduces cognitive load during educational navigation."
              componentName="EducationalCard"
              variant="purple"
              props={{ educational: "chapter", glow: "subtle" }}
              allSizes={[]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </ComponentCard>

        {/* Component 3 */}
        <ComponentCard
            title="3. Typography System"
            description="Comprehensive typography foundation supporting multilingual Vedic educational content with three specialized font families: Inter for modern English interfaces, Tiro Devanagari Sanskrit for authentic Sanskrit text rendering, and Tiro Telugu for traditional Telugu scripts. Built on mathematical 8px grid system ensuring precise vertical rhythm and visual consistency across all text elements. Includes four heading levels (Display Large through Heading 3) and four body text sizes, all maintaining WCAG AA compliance with 4.5:1 contrast ratios minimum. Essential for establishing clear information hierarchy in educational content where text clarity directly impacts learning comprehension. Responsive design ensures readability across devices from mobile study sessions to classroom displays. Language-specific fonts preserve cultural authenticity for Sanskrit mantras, Telugu verses, and English instruction. Integrates seamlessly with audio synchronization components for multilingual learning experiences where text and speech must maintain visual and auditory harmony."
            componentName="Typography"
            variant="blue"
            props={{ showSizes: true, showWeights: true }}
            allSizes={[]}
          >
            <div className="space-y-8">
              {/* Display and Headings */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Display & Headings</h4>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-4xl font-bold text-gray-900">Display Large</span>
                    <span className="text-xs text-gray-500">36px / 700</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-3xl font-semibold text-gray-900">Heading 1</span>
                    <span className="text-xs text-gray-500">30px / 600</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-2xl font-semibold text-gray-900">Heading 2</span>
                    <span className="text-xs text-gray-500">24px / 600</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-xl font-medium text-gray-900">Heading 3</span>
                    <span className="text-xs text-gray-500">20px / 500</span>
                  </div>
                </div>
              </div>

              {/* Body Text */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Body Text</h4>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-lg text-gray-800">Body Large</span>
                    <span className="text-xs text-gray-500">18px / 400</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-base text-gray-800">Body Base</span>
                    <span className="text-xs text-gray-500">16px / 400</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-600">Body Small</span>
                    <span className="text-xs text-gray-500">14px / 400</span>
                  </div>
                  <div className="flex items-baseline justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-xs font-medium text-gray-600">Caption</span>
                    <span className="text-xs text-gray-500">12px / 500</span>
                  </div>
                </div>
              </div>

              {/* Multi-language Support */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Multi-language Typography</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="text-lg font-medium text-blue-900 mb-1">English (Inter)</div>
                    <div className="text-base text-blue-800">The quick brown fox jumps over the lazy dog</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-md" style={{ fontFamily: 'Tiro Devanagari Sanskrit, serif' }}>
                    <div className="text-lg font-medium text-green-900 mb-1">Sanskrit (Tiro Devanagari)</div>
                    <div className="text-base text-green-800">ॐ गं गणपतये नमः शुक्लाम्बरधरं विष्णुम्</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-md" style={{ fontFamily: 'Tiro Telugu, serif' }}>
                    <div className="text-lg font-medium text-purple-900 mb-1">Telugu (Tiro Telugu)</div>
                    <div className="text-base text-purple-800">వేదాలు మానవత్వానికి అత్యంత పవిత్రమైన గ్రంథాలు</div>
                  </div>
                </div>
              </div>
            </div>
          </ComponentCard>

        {/* Component 4 */}
        <ComponentCard
            title="4. Design System Color Palette"
            description="Comprehensive 24-color foundation featuring 12 primary vibrant colors paired with 12 fluorescent glow variants for creating sophisticated visual hierarchies and interactive states. Each color maintains consistent semantic meaning across the system: blue for primary actions, green for success states, purple for premium features, orange for warnings, and specialized educational colors for content categorization. Fluorescent variants provide subtle lighting effects for hover states, focus indicators, and emphasis without overwhelming the interface. Built with accessibility as core principle, ensuring all color combinations meet WCAG contrast requirements while maintaining visual vibrancy. Developer-friendly implementation includes copy-ready hex codes, CSS custom properties, and Tailwind class utilities. Essential reference for designers and developers to maintain color consistency across components, features, and user flows. Replaces traditional neutral color schemes with energetic, modern palette that enhances user engagement while preserving professional educational standards."
            componentName="ColorSystem"
            variant="blue"
            props={{ showHexCodes: true, showNames: true }}
            allSizes={[]}
          >
            <div className="space-y-4">
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
          </ComponentCard>

        {/* Demo Dialogs */}
        <Dialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          title="User Invitation"
          description="Invite a new user to join your learning track"
          variant="blue"
        >
          <div className="space-y-4">
            <Input 
              placeholder="Enter email address" 
              variant="blue"
            />
            <RadioGroup
              name="invite-role"
              label="Assign Role"
              options={CommonRadioOptions.userRoles}
              value="student"
              onChange={() => {}}
              variant="blue"
              size="sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button variant="solid" color="blue" onClick={() => setShowDialog(false)}>
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

        {/* Component 4 */}
        <ComponentCard
              title="5. Action Buttons - Sophisticated Design"
              description="Advanced button system with five sophisticated styling approaches: classic baseline, fluorescent dashboard-inspired glows, modern gradient backgrounds, enhanced depth shadows, and card-like hover mechanics. Each style maintains consistent interaction patterns while offering distinct visual personalities for different interface contexts. Built with refined proportions, elegant transitions, and sophisticated color treatments that elevate standard button interactions into premium user experiences. Features comprehensive variant system including solid, outline, ghost, and destructive states across all 12 design system colors. Size variants accommodate everything from compact icon buttons to prominent call-to-action elements. Loading states, disabled styling, and keyboard navigation ensure complete accessibility coverage. Essential for creating cohesive interaction patterns across forms, navigation, content actions, and critical user flows. Fluorescent hover effects provide subtle visual feedback that enhances perceived quality without overwhelming the interface or compromising professional educational standards."
              componentName="Button"
              variant={buttonVariant}
              size={buttonSize}
              props={{ destructive: false, loading: false }}
              onVariantChange={setButtonVariant}
              onSizeChange={setButtonSize}
            >
              <div className="space-y-6">
                {/* Fluorescent Glow Style */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Refined Fluorescent Design</h4>
                  <p className="text-xs text-gray-500">Classy, sophisticated styling with elegant hover effects</p>
                  <div className="flex gap-4 flex-wrap">
                    <Button variant="solid" color={buttonVariant} size={buttonSize}>
                      Primary
                    </Button>
                    <Button variant="outline" color={buttonVariant} size={buttonSize}>
                      Secondary
                    </Button>
                    <Button variant="ghost" color={buttonVariant} size={buttonSize}>
                      Ghost
                    </Button>
                  </div>
                </div>

                {/* Interactive Examples */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Interactive Examples</h4>
                  <div className="flex gap-4 flex-wrap">
                    <Button variant="solid" color={buttonVariant} size={buttonSize} loading>
                      Loading
                    </Button>
                    <Button variant="solid" color={buttonVariant} size={buttonSize} icon={<Edit className="h-4 w-4" />}>
                      With Icon
                    </Button>
                    <Button variant="solid" color="rose" size={buttonSize}>
                      Delete
                    </Button>
                    <Button variant="outline" color={buttonVariant} size={buttonSize} fullWidth>
                      Full Width Button
                    </Button>
                  </div>
                </div>

                {/* Size Demonstration */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Size Progression</h4>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button variant="solid" color={buttonVariant} size="sm">Small</Button>
                    <Button variant="solid" color={buttonVariant} size="default">Default</Button>
                    <Button variant="solid" color={buttonVariant} size="lg">Large</Button>
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard
              title="6. Checkbox Selection"
              description="Multi-selection checkbox controls designed for educational content management and user preference settings. Features vibrant color variants that provide clear visual feedback for selection states while maintaining accessibility standards for colorblind users. Built with educational semantics including variants for lesson completion tracking, quiz answer selection, permission management, and content filtering. Each checkbox includes smooth transition animations, focus states for keyboard navigation, and proper ARIA labels for screen reader compatibility. Supports grouped selections with master toggle functionality essential for bulk content operations. Indeterminate states handle partial selections in hierarchical content structures like course outlines with chapters and lessons. Size variants accommodate dense data tables, spacious forms, and compact inline selections. Integrates seamlessly with form validation systems and real-time data binding. Essential for content curation interfaces, student assessment tools, administrative dashboards, and any interface requiring clear multi-selection patterns with immediate visual confirmation."
              componentName="CheckboxGroup"
              variant={checkboxVariant}
              size={checkboxSize}
              props={{ disabled: false, indeterminate: false }}
              onVariantChange={setCheckboxVariant}
              onSizeChange={setCheckboxSize}
            >
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
            </ComponentCard>

            <ComponentCard
              title="7. Radio Selection"
              description="Single-choice radio button controls optimized for educational assessments, preferences, and exclusive option selection. Designed with clear visual hierarchy and immediate selection feedback essential for quiz interfaces, survey forms, and configuration settings where only one option can be active. Features vibrant color coding that aids quick visual scanning while maintaining semantic meaning across the educational interface. Built with smooth selection animations and proper keyboard navigation supporting arrow key traversal between options. Educational variants include assessment answer choices, difficulty level selection, language preferences, and content format options. Supports grouped radio sets with clear visual boundaries and descriptive labels that enhance comprehension during high-stakes assessments. Size variants accommodate everything from compact preference panels to spacious quiz interfaces. Integrates with validation systems to provide immediate feedback on required selections. Essential for creating clear decision points in learning flows where exclusive choices drive personalized educational experiences and accurate assessment scoring."
              componentName="Radio"
              variant={radioVariant}
              size={radioSize}
              props={{ disabled: false, direction: "vertical" }}
              allSizes={getComponentConfig("Radio")?.sizes || ["sm", "md", "lg"]}
              onVariantChange={setRadioVariant}
              onSizeChange={setRadioSize}
            >
              <RadioGroup
                name="role"
                label="User Role"
                options={CommonRadioOptions.userRoles.slice(0, 2)}
                value={radioValue}
                onChange={setRadioValue}
                variant={radioVariant as any}
                size={radioSize as any}
              />
            </ComponentCard>
        {/* Component 7 */}
        <ComponentCard
              title="8. Audio Timeline"
              description="Specialized audio timeline slider designed for precise audio-text synchronization in educational content. Essential for Vedic LMS where Sanskrit chants, Telugu verses, and English instruction require exact timing alignment with written text for effective learning. Features smooth scrubbing controls, precise time indicators, and visual waveform representation that helps instructors and students navigate audio content efficiently. Built with educational semantics including chapter markers, verse boundaries, and pronunciation guide timing. Supports both instructor content creation workflows and student learning interfaces with different interaction patterns for each use case. Volume controls and playback speed adjustment enable personalized learning experiences. Color variants provide visual feedback for different audio content types and learning states. Integrates seamlessly with text segmentation components to create synchronized multimedia learning experiences. Progress indicators show completion status across lengthy audio content. Essential for language learning, pronunciation training, meditation guidance, and any educational context where audio timing precision directly impacts learning effectiveness and comprehension."
              componentName="AudioSlider"
              variant={sliderVariant}
              props={{ showVolume: audioSliderProps.showVolume }}
              onVariantChange={setSliderVariant}
              onPropsChange={setAudioSliderProps}
              allSizes={[]}
            >
              <AudioSlider
                currentTime={audioCurrentTime}
                duration={120}
                onSeek={setAudioCurrentTime}
                isPlaying={isAudioPlaying}
                onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)}
                variant={sliderVariant as any}
                showVolume={audioSliderProps.showVolume}
                onVolumeChange={(vol) => console.log('Volume:', vol)}
                volume={0.8}
              />
            </ComponentCard>

            <ComponentCard
              title="9. Full Audio Controls"
              description="Comprehensive audio player combining timeline controls with complete playback management for educational media content. Features play/pause, skip controls, volume adjustment, playback speed modification, and chapter navigation essential for structured learning content. Built specifically for educational contexts where students need full control over audio pacing, repetition, and focus areas. Timeline integration provides visual progress tracking with clickable segments for quick navigation to specific content sections. Volume controls accommodate different learning environments from quiet personal study to classroom presentations. Playback speed adjustment supports language learning where slower speeds aid pronunciation practice and faster speeds enable review. Chapter markers help organize lengthy lectures or meditation sessions into digestible segments. Color variants distinguish between different content types and learning states. Keyboard shortcuts enable hands-free operation during note-taking or practice sessions. Integrates with text synchronization for multimedia learning experiences where audio and visual content must remain perfectly aligned throughout user interactions and content navigation."
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
              title="10. Learning Progress"
              description="Educational progress tracking sliders designed for visualizing student advancement through learning materials and course content. Features percentage indicators, milestone markers, and visual completion states that motivate continued learning engagement. Built with educational psychology principles including incremental progress visualization and achievement recognition that encourages consistent study habits. Supports multiple progress types including overall course completion, chapter advancement, skill mastery levels, and daily learning goals. Color-coded variants indicate different progress states: blue for active learning, green for completed sections, orange for areas needing attention, and purple for advanced achievements. Interactive elements allow students to set personal goals and track their pace against recommended schedules. Integrates with learning analytics to provide detailed insights into learning patterns and areas requiring additional focus. Essential for student dashboards, instructor monitoring interfaces, and parent progress reports where clear visual communication of educational advancement builds confidence and maintains motivation throughout extended learning journeys."
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

        {/* Component 10 */}
        <ComponentCard
            title="11. Content Navigation"
            description="Hierarchical breadcrumb navigation system designed for complex educational content structures with multiple levels of organization. Essential for LMS environments where students navigate through institutions, courses, tracks, chapters, lessons, and individual content items. Features clear visual hierarchy with separators, hover states, and clickable elements that enable quick navigation to any level in the content structure. Built with educational context awareness including course codes, chapter numbers, lesson titles, and progress indicators at each navigation level. Color variants provide visual coding for different content types and organizational structures. Responsive design ensures breadcrumbs remain functional and readable across devices while preserving full navigation context. Supports truncation patterns for lengthy hierarchies without losing essential navigation functionality. Integrates with learning management systems to provide real-time context about current location within the broader educational journey. Essential for maintaining student orientation during deep content exploration and enabling quick return to higher-level course organization without losing progress or context in complex learning environments."
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

        {/* Component 11 */}
        <ComponentCard
              title="12. Text Inputs"
              description="Single-line form input fields optimized for educational content creation and student information collection. Features vibrant focus states with color-coded variants that provide immediate visual feedback during data entry while maintaining professional appearance suitable for academic environments. Built with comprehensive validation states including error indicators, success confirmation, and loading states essential for real-time form processing. Supports educational input types including student names, course identifiers, assessment responses, and multilingual text entry with proper character support for Sanskrit and Telugu scripts. Placeholder text and helper labels provide clear guidance for expected input formats and requirements. Size variants accommodate compact inline editing, standard form layouts, and prominent input areas for critical information. Keyboard navigation and accessibility features ensure compatibility with assistive technologies used in educational settings. Integrates seamlessly with form validation systems and real-time collaboration features. Essential for content authoring tools, student registration systems, assessment creation interfaces, and any educational workflow requiring reliable text input with immediate visual feedback and validation."
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
              title="13. Textarea Fields"
              description="Multi-line text input areas designed for educational content creation, student responses, and extended text entry in learning management systems. Features auto-resizing capabilities that adapt to content length while maintaining visual consistency across different input volumes. Built with multilingual support essential for Vedic education including proper handling of Sanskrit Devanagari, Telugu scripts, and English text with appropriate font rendering and character spacing. Supports rich text input including formatting controls, character counting, and real-time validation feedback for educational writing assignments. Resize handles and maximum height constraints prevent layout disruption while accommodating lengthy responses. Focus states with vibrant color coding provide clear visual feedback during active editing sessions. Integrates with spell-checking, grammar assistance, and language detection systems tailored for educational content. Essential for essay submissions, reflection journals, discussion forum posts, content authoring workflows, and any educational interface requiring extended text input with proper formatting, validation, and multilingual character support for comprehensive learning documentation and assessment."
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

        {/* Component 13 */}
        <ComponentCard
              title="14. Status Badges"
              description="Compact status indicators and labels designed for educational content organization and learning progress communication. Features three distinct styling approaches: classic baseline, modern gradients with subtle depth, and sharp accented borders for different interface contexts. Essential for displaying completion status, difficulty levels, content categories, student achievements, and administrative states throughout the LMS. Color variants provide semantic meaning including blue for informational states, green for completed tasks, orange for pending actions, red for critical alerts, and purple for premium content. Size variants accommodate dense data tables, spacious content cards, and inline text labeling. Built with educational semantics including course status, enrollment states, assessment grades, and learning milestones. Supports dynamic content updates with smooth transitions for real-time status changes. Integrates with notification systems and progress tracking to provide immediate visual feedback. Essential for creating scannable interfaces where status information must be quickly understood at a glance while maintaining visual hierarchy and reducing cognitive load during content navigation and learning assessment."
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
              title="15. Progress Bars"
              description="Linear progress indicators designed for educational advancement tracking and task completion visualization across learning management interfaces. Features smooth animations, percentage displays, and color-coded states that communicate different types of progress including course completion, skill development, assignment submission rates, and learning goal achievement. Built with motivational design principles that encourage continued engagement through clear visual feedback and milestone recognition. Supports multiple progress patterns including determinate completion tracking, indeterminate loading states, and segmented progress for multi-part assessments. Color variants provide semantic meaning with blue for active progress, green for completed tasks, orange for approaching deadlines, and purple for advanced achievements. Label integration displays contextual information including time estimates, completion percentages, and next steps. Size variants accommodate compact inline progress indicators and prominent dashboard displays. Essential for student motivation interfaces, instructor monitoring dashboards, administrative reporting views, and any educational context where visual progress communication drives engagement and provides clear feedback on learning advancement and goal achievement."
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
              title="16. Toggle Switches"
              description="Binary choice controls optimized for educational settings and user preference management with smooth animations and clear on/off states. Essential for feature toggles, notification preferences, accessibility options, and learning mode selections where immediate visual feedback prevents confusion during critical educational workflows. Built with vibrant color coding that provides instant state recognition while maintaining professional appearance suitable for academic environments. Features include disabled states for restricted settings, loading indicators for real-time updates, and proper keyboard navigation for accessibility compliance. Educational variants support learning preferences including audio enabled/disabled, text highlighting on/off, difficulty mode selection, and collaborative features activation. Size variants accommodate compact preference panels and prominent setting interfaces. Integrates with user profile systems and learning analytics to persist preferences across sessions and devices. Label positioning and descriptive text ensure clear understanding of toggle functionality. Essential for personalized learning environments, instructor dashboard controls, accessibility accommodation settings, and any educational interface requiring clear binary choices with immediate visual confirmation and reliable state management."
              componentName="Switch"
              variant={switchVariant}
              size={switchSize}
              props={{ disabled: false }}
              onVariantChange={setSwitchVariant}
              onSizeChange={setSwitchSize}
            >
              <div className="space-y-6">
                {/* Basic Switches */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Basic Toggle Switches</h4>
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

                {/* Enhanced Switches with Status Text */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Enhanced with Status Text</h4>
                  <div className="flex items-center space-x-3">
                    <Switch 
                      variant="blue" 
                      size={switchSize as any} 
                      showStatusText 
                      defaultChecked 
                    />
                    <label className="text-sm font-medium">Audio Controls</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch 
                      variant="orange" 
                      size={switchSize as any} 
                      showStatusText 
                      onText="LIVE" 
                      offText="OFF" 
                    />
                    <label className="text-sm font-medium">Live Mode</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch 
                      variant="teal" 
                      size={switchSize as any} 
                      showStatusText 
                      onText="AUTO" 
                      offText="MANUAL" 
                      defaultChecked 
                    />
                    <label className="text-sm font-medium">Auto-sync</label>
                  </div>
                </div>

                {/* Educational Semantic Variants */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Educational Semantics</h4>
                  <div className="flex items-center space-x-3">
                    <Switch educational="published" size={switchSize as any} defaultChecked />
                    <label className="text-sm font-medium">Published Content</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch educational="notifications" size={switchSize as any} />
                    <label className="text-sm font-medium">Learning Alerts</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch educational="darkmode" size={switchSize as any} />
                    <label className="text-sm font-medium">Dark Theme</label>
                  </div>
                </div>
              </div>
            </ComponentCard>

        {/* Component 16 */}
        <ComponentCard
              title="17. Range Sliders"
              description="Numeric input sliders designed for educational parameter adjustment and value selection with smooth interaction patterns and real-time feedback. Essential for learning customization including volume control, playback speed, difficulty levels, font size adjustment, and timer settings where precise numeric input enhances educational experience. Features visual value indicators, step controls, and range constraints that prevent invalid selections while providing clear feedback during adjustment. Built with educational semantics supporting assessment scoring, learning pace adjustment, content filtering, and accessibility accommodations. Color variants provide visual coding for different parameter types and interaction states. Keyboard navigation supports arrow keys and numeric input for precise control essential during educational activities requiring exact values. Label formatting includes units, ranges, and contextual descriptions that guide appropriate usage. Integrates with learning analytics to track preference patterns and optimize default settings. Essential for personalized learning interfaces, instructor content configuration, accessibility tools, assessment creation workflows, and any educational context requiring precise numeric input with immediate visual feedback and constrained value ranges."
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
              title="18. Tab Navigation"
              description="Content section navigation designed for organizing complex educational interfaces into focused, accessible areas without overwhelming users with simultaneous information display. Essential for LMS environments where content editing, progress tracking, resource management, and communication tools require clear separation while maintaining workflow continuity. Features smooth transitions, keyboard navigation, and visual indicators for active sections that enhance usability during extended educational sessions. Built with educational context awareness including content tabs, resource tabs, discussion tabs, and assessment tabs each with appropriate semantic styling. Supports nested tab structures for complex educational workflows while maintaining clear visual hierarchy. Color variants provide coding for different content types and functional areas. Badge integration displays notification counts, completion status, and activity indicators without disrupting navigation flow. Responsive design ensures tab functionality across devices from mobile content review to desktop content creation. Essential for content authoring interfaces, student learning dashboards, instructor management panels, and any educational workflow requiring organized information architecture with quick context switching and preserved user focus."
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
        {/* Component 18 */}
        <ComponentCard
            title="19. Content Cards"
            description="Versatile container cards with subtle glow effects designed for displaying educational content, resources, and learning materials with elegant visual hierarchy. Features responsive layouts, hover animations, and color-coded variants that organize different content types while maintaining consistent interaction patterns across the educational interface. Built with educational semantics including lesson cards, resource cards, assignment cards, and announcement cards each with appropriate visual styling and information architecture. Glow effects provide sophisticated visual feedback during interaction without overwhelming the professional educational environment. Supports flexible content layouts including images, text, metadata, action buttons, and progress indicators essential for comprehensive content display. Size variants accommodate everything from compact resource listings to prominent featured content displays. Interactive states include hover elevation, selection highlighting, and loading placeholders for dynamic content updates. Integrates seamlessly with content management systems and learning analytics. Essential for course catalogs, resource libraries, student portfolios, instructor dashboards, and any educational interface requiring attractive, organized content presentation with clear visual hierarchy and intuitive interaction patterns."
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
                  <Button variant="outline" color={cardVariant as any} className="w-full">
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
                  <Button variant="outline" color="green" className="w-full">
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
                  <Button variant="outline" color="purple" className="w-full">
                    Configure
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ComponentCard>

        {/* Component 19 */}
        <ComponentCard
              title="20. Loading States"
              description="Comprehensive loading indicators and skeleton states designed for educational interfaces where content loading times directly impact learning flow and user engagement. Features multiple loading patterns including spinners for quick actions, progress bars for determinate processes, and skeleton screens for content preview during longer load times. Built with educational context awareness providing appropriate messaging for content loading, assessment processing, video streaming, and collaborative feature synchronization. Color variants align with semantic meaning including blue for general loading, green for successful processing, orange for slower operations requiring patience, and purple for premium content access. Size variants accommodate inline loading indicators, modal overlays, and full-screen loading experiences. Educational messaging includes estimated time remaining, process descriptions, and helpful tips that maintain engagement during necessary waiting periods. Integrates with error handling to provide graceful fallbacks when loading fails. Essential for maintaining positive user experience during content access, assessment submission, video streaming, collaborative editing, and any educational workflow where loading feedback prevents user frustration and abandonment during critical learning activities."
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
              title="21. Help Tooltips"
              description="Contextual help and guidance tooltips designed for educational interfaces where feature discovery and user guidance are essential for effective learning management. Features whisper-light aesthetic with subtle backgrounds, elegant positioning, and educational semantic variants that provide assistance without disrupting learning flow. Built with multiple positioning options, delay controls, and keyboard navigation support essential for accessibility in educational environments. Educational variants include feature explanations, workflow guidance, terminology definitions, and learning tips each with appropriate styling and content structure. Color coding provides semantic meaning with blue for informational guidance, green for success tips, orange for important warnings, and purple for advanced feature explanations. Integrates with user onboarding systems and contextual help frameworks to provide progressive disclosure of complex features. Supports rich content including formatted text, icons, and action links for comprehensive guidance delivery. Essential for reducing learning curves in complex LMS interfaces, providing just-in-time help during content creation, offering assessment guidance, and supporting any educational workflow where contextual assistance enhances user confidence and reduces support requirements while maintaining focus on learning objectives."
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

        {/* Component 21 */}
        <ComponentCard
              title="22. System Alerts"
              description="System notifications and feedback messages designed for educational environments where clear communication of status changes, achievements, warnings, and critical information maintains learning continuity and prevents user confusion. Features semantic color coding with green for success notifications, blue for informational updates, orange for warnings requiring attention, and red for critical alerts demanding immediate action. Built with educational context including assignment submission confirmations, deadline reminders, achievement announcements, system maintenance notices, and collaborative activity updates. Dismissible controls with auto-timeout options prevent interface clutter while ensuring important information reaches users. Icon integration provides immediate visual recognition of message types and severity levels. Supports rich content including action buttons, progress indicators, and formatted text for comprehensive communication. Integrates with notification preference systems allowing users to customize delivery methods and frequency. Essential for maintaining awareness of learning progress, system status, collaborative activities, deadline management, and any educational workflow requiring reliable communication of important information while preserving focus on learning activities and preventing critical information from being overlooked during extended educational sessions."
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
              title="23. Dialog Modals"
              description="Modal dialog system designed for educational workflows requiring focused user attention, confirmations, and complex interactions without losing context in the underlying learning interface. Features backdrop overlays, keyboard navigation, focus trapping, and responsive sizing that maintains usability across devices from mobile content review to desktop content creation. Built with educational semantics including assignment submission confirmations, content deletion warnings, collaboration invitations, assessment completion dialogs, and multimedia upload interfaces. Supports various interaction patterns including simple confirmations, multi-step wizards, form submissions, and media preview overlays. Color variants provide visual coding for different dialog types and severity levels. Accessibility features include proper ARIA labeling, keyboard navigation, and screen reader support essential for inclusive educational environments. Animation states provide smooth entry and exit transitions that maintain professional appearance. Integrates with form validation, file handling, and workflow management systems. Essential for protecting critical educational data through confirmation dialogs, facilitating complex content operations, managing user permissions, and any educational workflow requiring focused interaction while preserving underlying context and preventing accidental data loss."
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
                  <Button onClick={() => setShowComponentDialog(true)} variant="solid" color={dialogVariant as any}>
                    Open Dialog
                  </Button>
                  <Button variant="solid" color="rose" onClick={() => setShowConfirmDialog(true)}>
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
                    <Button variant="outline" color="gray" onClick={() => setShowComponentDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="solid" color={dialogVariant as any} onClick={() => setShowComponentDialog(false)}>
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
        {/* Component 23 */}
        <ComponentCard
              title="24. Select Dropdowns"
              description="Dropdown selection menus optimized for educational content management and user preference selection with search capabilities, multi-select options, and clear visual hierarchy. Essential for course selection, category filtering, user role assignment, language preferences, and any educational workflow requiring selection from predefined option sets. Features include searchable options for large datasets, keyboard navigation for accessibility, and clear visual indicators for selected states. Built with educational semantics supporting course catalogs, student rosters, content categorization, assessment question types, and administrative settings. Color variants provide visual coding for different selection contexts and validation states. Supports grouped options, disabled states, and loading indicators for dynamic content population. Placeholder text and helper labels guide appropriate selection while validation feedback prevents submission errors. Size variants accommodate compact inline selections and prominent form elements. Integrates with form systems, user management, and content organization workflows. Essential for maintaining organized educational data, enabling efficient content discovery, supporting administrative operations, and any educational interface requiring reliable option selection with search capabilities and clear feedback for complex educational workflows requiring precise data entry."
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
              title="25. Avatar Display"
              description="User profile avatars designed for educational environments with role-based visual coding, status indicators, and consistent representation across learning management interfaces. Features automatic initials generation, image fallbacks, and vibrant color backgrounds that provide visual identity while maintaining professional appearance suitable for academic settings. Built with educational role support including student avatars, instructor profiles, administrator accounts, and guest users each with appropriate visual styling and status indicators. Online presence indicators show availability for collaboration and communication essential for educational community building. Size variants accommodate everything from compact comment displays to prominent profile headers. Color variants provide semantic coding for different user types and institutional affiliations. Status indicators include online/offline presence, active learning sessions, and availability for consultation. Integrates with user management systems, messaging platforms, and collaborative tools. Essential for humanizing educational interfaces, building learning communities, enabling instructor-student connections, supporting peer collaboration, and any educational workflow where user identity and availability information enhances communication and creates more engaging, personalized learning experiences."
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
        {/* Component 25 */}
        <ComponentCard
            title="26. Text Segments"
            description="Specialized text segmentation components designed for precise audio-text synchronization in educational content creation and multilingual learning experiences. Essential for Vedic LMS where Sanskrit chants, Telugu verses, and English instruction require exact alignment between spoken and written content for effective pronunciation training and comprehension. Features responsive auto-height with text wrapping, icon-based mapping status indicators, and universal blue selection states that work seamlessly with any color variant. Built with clean visual hierarchy including numbered segment pills, hover-revealed actions, and persistent mapping status icons that maintain clarity during complex content organization workflows. Supports drag-and-drop reordering, bulk operations, and real-time collaboration for instructor content development. Color variants provide semantic coding for different content types while maintaining readability across all language scripts. Script-aware font rendering automatically applies JIMS for Telugu/English and Adishila San for Hindi. Custom fontSize support ensures consistent 28px Vedic content display. Integrates with audio timeline components to create synchronized multimedia learning experiences. Essential for language learning applications, pronunciation training systems, meditation guidance platforms, and any educational context where precise timing between audio narration and text display directly impacts learning effectiveness and student comprehension of complex multilingual content."
            componentName="TextSegment"
            variant={textSegmentVariant}
            size="md"
            props={{ isMapped: false, showActions: true, script: textSegmentScript, fontSize: textSegmentFontSize }}
            onVariantChange={setTextSegmentVariant}
            allSizes={["sm", "md", "lg"]}
          >
            <div className="space-y-6">
              {/* Interactive Controls for Script and Font Size */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg p-4 border border-blue-200/60">
                <h4 className="text-sm font-semibold mb-3 text-blue-900">Script & Font Controls</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-blue-700">Script (Font Family)</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={textSegmentScript === 'te' ? 'solid' : 'outline'}
                        color="blue"
                        onClick={() => setTextSegmentScript('te')}
                      >
                        Telugu (JIMS)
                      </Button>
                      <Button
                        size="sm"
                        variant={textSegmentScript === 'hi' ? 'solid' : 'outline'}
                        color="green"
                        onClick={() => setTextSegmentScript('hi')}
                      >
                        Hindi (Adishila)
                      </Button>
                      <Button
                        size="sm"
                        variant={textSegmentScript === 'en' ? 'solid' : 'outline'}
                        color="purple"
                        onClick={() => setTextSegmentScript('en')}
                      >
                        English (JIMS)
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-blue-700">Font Size</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={textSegmentFontSize === '20px' ? 'solid' : 'outline'}
                        color="orange"
                        onClick={() => setTextSegmentFontSize('20px')}
                      >
                        20px
                      </Button>
                      <Button
                        size="sm"
                        variant={textSegmentFontSize === '24px' ? 'solid' : 'outline'}
                        color="orange"
                        onClick={() => setTextSegmentFontSize('24px')}
                      >
                        24px
                      </Button>
                      <Button
                        size="sm"
                        variant={textSegmentFontSize === '28px' ? 'solid' : 'outline'}
                        color="orange"
                        onClick={() => setTextSegmentFontSize('28px')}
                      >
                        28px
                      </Button>
                      <Button
                        size="sm"
                        variant={textSegmentFontSize === '32px' ? 'solid' : 'outline'}
                        color="orange"
                        onClick={() => setTextSegmentFontSize('32px')}
                      >
                        32px
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Demo with Script & Font Size */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200/60">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Interactive Script Demo (changes with controls above)</h4>
                <div className="space-y-3">
                  {textSegmentScript === 'te' && (
                    <TextSegment
                      variant={textSegmentVariant as any}
                      content="వేదం అనగా జ్ఞానం. ఋగ్వేదం, యజుర్వేదం, సామవేదం, అథర్వణవేదం నాలుగు వేదాలు."
                      segmentNumber={1}
                      script="te"
                      fontSize={textSegmentFontSize}
                      isMapped={true}
                    />
                  )}
                  {textSegmentScript === 'hi' && (
                    <TextSegment
                      variant={textSegmentVariant as any}
                      content="ॐ गं गणपतये नमः। शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम्।"
                      segmentNumber={1}
                      script="hi"
                      fontSize={textSegmentFontSize}
                      isMapped={true}
                    />
                  )}
                  {textSegmentScript === 'en' && (
                    <TextSegment
                      variant={textSegmentVariant as any}
                      content="Oṁ gaṁ gaṇapataye namaḥ. Śuklāmbaradharaṁ viṣṇuṁ śaśivarṇaṁ caturbhujam."
                      segmentNumber={1}
                      script="en"
                      fontSize={textSegmentFontSize}
                      isMapped={true}
                    />
                  )}
                </div>
              </div>

              {/* Script Comparison Demo */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-lg p-4 border border-purple-200/60">
                <h4 className="text-sm font-semibold mb-3 text-purple-900">Script-Aware Font Rendering (28px)</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-purple-700 mb-1">Telugu - JIMS Font</div>
                    <TextSegment
                      variant="blue"
                      content="వేదం అనగా జ్ఞానం. ఋగ్వేదం, యజుర్వేదం, సామవేదం"
                      segmentNumber={1}
                      script="te"
                      fontSize="28px"
                      size="sm"
                      isMapped={true}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">Hindi/Devanagari - Adishila San Font</div>
                    <TextSegment
                      variant="green"
                      content="ॐ गं गणपतये नमः। शुक्लाम्बरधरं विष्णुं"
                      segmentNumber={2}
                      script="hi"
                      fontSize="28px"
                      size="sm"
                      isMapped={false}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-purple-700 mb-1">English/IAST - JIMS Font</div>
                    <TextSegment
                      variant="purple"
                      content="Oṁ gaṁ gaṇapataye namaḥ. Śuklāmbaradharaṁ viṣṇuṁ"
                      segmentNumber={3}
                      script="en"
                      fontSize="28px"
                      size="sm"
                      isSelected={true}
                    />
                  </div>
                </div>
              </div>

              {/* Font Size Comparison */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50/50 rounded-lg p-4 border border-orange-200/60">
                <h4 className="text-sm font-semibold mb-3 text-orange-900">Font Size Variants (Telugu/JIMS)</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-orange-700 mb-1">20px - Small</div>
                    <TextSegment
                      variant="orange"
                      content="వేదం అనగా జ్ఞానం"
                      script="te"
                      fontSize="20px"
                      size="sm"
                      showActions={false}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-orange-700 mb-1">24px - Medium</div>
                    <TextSegment
                      variant="orange"
                      content="వేదం అనగా జ్ఞానం"
                      script="te"
                      fontSize="24px"
                      size="sm"
                      showActions={false}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-orange-700 mb-1">28px - Vedic Standard</div>
                    <TextSegment
                      variant="orange"
                      content="వేదం అనగా జ్ఞానం"
                      script="te"
                      fontSize="28px"
                      size="sm"
                      showActions={false}
                      isMapped={true}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-orange-700 mb-1">32px - Large</div>
                    <TextSegment
                      variant="orange"
                      content="వేదం అనగా జ్ఞానం"
                      script="te"
                      fontSize="32px"
                      size="sm"
                      showActions={false}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive States Demo */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200/60">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Interactive States Demo:</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 font-medium">Static:</span>
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
                    <span className="text-xs text-gray-600 w-20 font-medium">Selected:</span>
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
                    <span className="text-xs text-gray-600 w-20 font-medium">Mapped:</span>
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
                    <span className="text-xs text-gray-600 w-20 font-medium">Dragging:</span>
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
    );
  }
