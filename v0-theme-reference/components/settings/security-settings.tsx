"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield, Key, Smartphone, AlertTriangle } from "lucide-react"

export default function SecuritySettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>Manage your account security and authentication preferences</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Change Password */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update your password to keep your account secure
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(!isChangingPassword)}>
              Change Password
            </Button>
          </div>

          {isChangingPassword && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <div className="flex gap-2">
                <Button size="sm">Update Password</Button>
                <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Two-Factor Authentication */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>

          {twoFactorEnabled && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Two-factor authentication is enabled. You'll need to enter a code from your authenticator app when
                signing in.
              </p>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                View Recovery Codes
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Login Alerts */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Login Alerts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get notified when someone signs into your account
            </p>
          </div>
          <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
        </div>

        <Separator />

        {/* Active Sessions */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Active Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Current Session</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Chrome on macOS • San Francisco, CA</p>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active now</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Mobile App</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">iPhone • 2 hours ago</p>
              </div>
              <Button variant="outline" size="sm">
                Revoke
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  )
}
