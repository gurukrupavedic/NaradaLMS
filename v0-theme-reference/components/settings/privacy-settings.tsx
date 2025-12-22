"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, Shield, Download, Trash2, AlertTriangle, Lock } from "lucide-react"

export default function PrivacySettings() {
  const [profileVisibility, setProfileVisibility] = useState({
    publicProfile: true,
    showEmail: false,
    showLocation: true,
    showActivity: false,
    searchable: true,
  })

  const [dataSettings, setDataSettings] = useState({
    analytics: true,
    personalization: true,
    thirdPartySharing: false,
    marketingData: false,
  })

  const [activitySettings, setActivitySettings] = useState({
    readingHistory: true,
    searchHistory: false,
    commentHistory: true,
    shareActivity: false,
  })

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Control your privacy and data sharing preferences
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Visibility</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="publicProfile" className="text-sm font-medium">
                Public Profile
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Make your profile visible to other users</p>
            </div>
            <Switch
              id="publicProfile"
              checked={profileVisibility.publicProfile}
              onCheckedChange={(checked) => setProfileVisibility({ ...profileVisibility, publicProfile: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showEmail" className="text-sm font-medium">
                Show Email Address
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Display your email address on your public profile
              </p>
            </div>
            <Switch
              id="showEmail"
              checked={profileVisibility.showEmail}
              onCheckedChange={(checked) => setProfileVisibility({ ...profileVisibility, showEmail: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showLocation" className="text-sm font-medium">
                Show Location
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Display your location on your profile</p>
            </div>
            <Switch
              id="showLocation"
              checked={profileVisibility.showLocation}
              onCheckedChange={(checked) => setProfileVisibility({ ...profileVisibility, showLocation: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showActivity" className="text-sm font-medium">
                Show Activity Status
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Let others see when you're online or recently active
              </p>
            </div>
            <Switch
              id="showActivity"
              checked={profileVisibility.showActivity}
              onCheckedChange={(checked) => setProfileVisibility({ ...profileVisibility, showActivity: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="searchable" className="text-sm font-medium">
                Searchable Profile
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Allow your profile to appear in search results</p>
            </div>
            <Switch
              id="searchable"
              checked={profileVisibility.searchable}
              onCheckedChange={(checked) => setProfileVisibility({ ...profileVisibility, searchable: checked })}
            />
          </div>
        </div>
      </div>

      {/* Data & Analytics */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data & Analytics</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="analytics" className="text-sm font-medium">
                Usage Analytics
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Help improve our service by sharing anonymous usage data
              </p>
            </div>
            <Switch
              id="analytics"
              checked={dataSettings.analytics}
              onCheckedChange={(checked) => setDataSettings({ ...dataSettings, analytics: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="personalization" className="text-sm font-medium">
                Personalization
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Use your data to personalize content and recommendations
              </p>
            </div>
            <Switch
              id="personalization"
              checked={dataSettings.personalization}
              onCheckedChange={(checked) => setDataSettings({ ...dataSettings, personalization: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="thirdPartySharing" className="text-sm font-medium">
                Third-party Data Sharing
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Share anonymized data with trusted partners for research
              </p>
            </div>
            <Switch
              id="thirdPartySharing"
              checked={dataSettings.thirdPartySharing}
              onCheckedChange={(checked) => setDataSettings({ ...dataSettings, thirdPartySharing: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketingData" className="text-sm font-medium">
                Marketing Data Usage
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Use your data for targeted marketing and advertising
              </p>
            </div>
            <Switch
              id="marketingData"
              checked={dataSettings.marketingData}
              onCheckedChange={(checked) => setDataSettings({ ...dataSettings, marketingData: checked })}
            />
          </div>
        </div>
      </div>

      {/* Activity Tracking */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity Tracking</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="readingHistory" className="text-sm font-medium">
                Reading History
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Track articles you've read for recommendations</p>
            </div>
            <Switch
              id="readingHistory"
              checked={activitySettings.readingHistory}
              onCheckedChange={(checked) => setActivitySettings({ ...activitySettings, readingHistory: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="searchHistory" className="text-sm font-medium">
                Search History
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Save your search queries to improve search results
              </p>
            </div>
            <Switch
              id="searchHistory"
              checked={activitySettings.searchHistory}
              onCheckedChange={(checked) => setActivitySettings({ ...activitySettings, searchHistory: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="commentHistory" className="text-sm font-medium">
                Comment History
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Keep track of your comments and interactions</p>
            </div>
            <Switch
              id="commentHistory"
              checked={activitySettings.commentHistory}
              onCheckedChange={(checked) => setActivitySettings({ ...activitySettings, commentHistory: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="shareActivity" className="text-sm font-medium">
                Share Activity
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">Let others see articles you've shared or liked</p>
            </div>
            <Switch
              id="shareActivity"
              checked={activitySettings.shareActivity}
              onCheckedChange={(checked) => setActivitySettings({ ...activitySettings, shareActivity: checked })}
            />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data Management</h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Download Your Data</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Get a copy of all your data including articles, comments, and activity
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Request Export
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Clear Activity History</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Remove your reading, search, and interaction history
              </p>
            </div>
            <Button variant="outline" size="sm">
              Clear History
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Delete Account</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 border-red-200 bg-transparent"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-primary text-primary-foreground">Save Privacy Settings</Button>
      </div>
    </div>
  )
}
