import React from "react";
import { Settings } from "lucide-react";
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';

export default function SystemSettings() {
  useRoleGuard(['admin']);
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted/50 p-6">
            <Settings className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">System Settings</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Advanced configuration options will be available here soon.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-4 py-2 rounded-full bg-muted/30 text-xs font-medium text-muted-foreground">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
