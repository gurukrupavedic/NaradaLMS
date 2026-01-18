import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
export function PendingApproval() {
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      navigate("/login");
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">ॐ</span>
              </div>
              <h1 className="text-3xl font-bold text-blue-800">Vedic LMS</h1>
            </div>

            {/* Hourglass animation */}
            <div className="flex justify-center py-4">
              <div className="text-6xl animate-bounce">⏳</div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                Account Pending Approval
              </h2>
              <p className="text-gray-600 text-base">
                Thank you for signing up! Your account is being reviewed by an administrator. You'll receive access once approved.
              </p>
              <p className="text-sm text-gray-500">
                This typically takes 1-2 business days.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
            <p className="text-center text-xs text-gray-500">
              You can check back later to see if your account has been approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
