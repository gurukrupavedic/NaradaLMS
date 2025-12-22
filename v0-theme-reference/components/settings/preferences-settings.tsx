"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Settings, Palette, Globe, Type } from "lucide-react"

export default function PreferencesSettings() {
  const [appearance, setAppearance] = useState({
    theme: "system",
    compactMode: false,
    animations: true,
    highContrast: false,
  })

  const [language, setLanguage] = useState({
    interface: "en",
    content: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  })

  const [content, setContent] = useState({
    autoSave: true,
    spellCheck: true,
    wordWrap: true,
    lineNumbers: false,
    fontSize: [14],
    autoPreview: true,
  })

  const [behavior, setBehavior] = useState({
    confirmDelete: true,
    autoLogout: false,
    logoutTime: 30,
    keyboardShortcuts: true,
    soundEffects: false,
  })

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Customize your application experience and behavior
        </p>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={appearance.theme}
                onValueChange={(value) => setAppearance({ ...appearance, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compactMode" className="text-sm font-medium">
                Compact Mode
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Reduce spacing and padding for a more compact interface
              </p>
            </div>
            <Switch
              id="compactMode"
              checked={appearance.compactMode}
              onCheckedChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="animations" className="text-sm font-medium">
                Animations
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Enable smooth transitions and animations</p>
            </div>
            <Switch
              id="animations"
              checked={appearance.animations}
              onCheckedChange={(checked) => setAppearance({ ...appearance, animations: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="highContrast" className="text-sm font-medium">
                High Contrast
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Increase contrast for better accessibility</p>
            </div>
            <Switch
              id="highContrast"
              checked={appearance.highContrast}
              onCheckedChange={(checked) => setAppearance({ ...appearance, highContrast: checked })}
            />
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Language & Region</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="interfaceLanguage">Interface Language</Label>
              <Select
                value={language.interface}
                onValueChange={(value) => setLanguage({ ...language, interface: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentLanguage">Content Language</Label>
              <Select value={language.content} onValueChange={(value) => setLanguage({ ...language, content: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={language.dateFormat}
                onValueChange={(value) => setLanguage({ ...language, dateFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select
                value={language.timeFormat}
                onValueChange={(value) => setLanguage({ ...language, timeFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12 Hour</SelectItem>
                  <SelectItem value="24h">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Type className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Content Editor</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoSave" className="text-sm font-medium">
                Auto Save
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Automatically save your work as you type</p>
            </div>
            <Switch
              id="autoSave"
              checked={content.autoSave}
              onCheckedChange={(checked) => setContent({ ...content, autoSave: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="spellCheck" className="text-sm font-medium">
                Spell Check
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Enable spell checking while writing</p>
            </div>
            <Switch
              id="spellCheck"
              checked={content.spellCheck}
              onCheckedChange={(checked) => setContent({ ...content, spellCheck: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="wordWrap" className="text-sm font-medium">
                Word Wrap
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Wrap long lines in the editor</p>
            </div>
            <Switch
              id="wordWrap"
              checked={content.wordWrap}
              onCheckedChange={(checked) => setContent({ ...content, wordWrap: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lineNumbers" className="text-sm font-medium">
                Line Numbers
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Show line numbers in the editor</p>
            </div>
            <Switch
              id="lineNumbers"
              checked={content.lineNumbers}
              onCheckedChange={(checked) => setContent({ ...content, lineNumbers: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size: {content.fontSize[0]}px</Label>
            <Slider
              id="fontSize"
              value={content.fontSize}
              onValueChange={(value) => setContent({ ...content, fontSize: value })}
              max={24}
              min={10}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoPreview" className="text-sm font-medium">
                Auto Preview
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Automatically update preview as you type</p>
            </div>
            <Switch
              id="autoPreview"
              checked={content.autoPreview}
              onCheckedChange={(checked) => setContent({ ...content, autoPreview: checked })}
            />
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Behavior</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirmDelete" className="text-sm font-medium">
                Confirm Deletions
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Show confirmation dialog before deleting items</p>
            </div>
            <Switch
              id="confirmDelete"
              checked={behavior.confirmDelete}
              onCheckedChange={(checked) => setBehavior({ ...behavior, confirmDelete: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="keyboardShortcuts" className="text-sm font-medium">
                Keyboard Shortcuts
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Enable keyboard shortcuts for faster navigation
              </p>
            </div>
            <Switch
              id="keyboardShortcuts"
              checked={behavior.keyboardShortcuts}
              onCheckedChange={(checked) => setBehavior({ ...behavior, keyboardShortcuts: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="soundEffects" className="text-sm font-medium">
                Sound Effects
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Play sounds for notifications and interactions</p>
            </div>
            <Switch
              id="soundEffects"
              checked={behavior.soundEffects}
              onCheckedChange={(checked) => setBehavior({ ...behavior, soundEffects: checked })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoLogout" className="text-sm font-medium">
                  Auto Logout
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically log out after period of inactivity
                </p>
              </div>
              <Switch
                id="autoLogout"
                checked={behavior.autoLogout}
                onCheckedChange={(checked) => setBehavior({ ...behavior, autoLogout: checked })}
              />
            </div>

            {behavior.autoLogout && (
              <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <Label htmlFor="logoutTime">Logout after (minutes)</Label>
                  <Select
                    value={behavior.logoutTime.toString()}
                    onValueChange={(value) => setBehavior({ ...behavior, logoutTime: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button className="bg-primary text-primary-foreground">Save Preferences</Button>
      </div>
    </div>
  )
}
