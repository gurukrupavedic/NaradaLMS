import React from "react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mukta-canvas dark:bg-nila-infinite">
      <div className="text-center space-y-4">
        <div className="relative mx-auto size-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-hema-base animate-spin" />
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-nila-base dark:border-vidyut-base animate-spin-slow-reverse opacity-70" />
        </div>
        <p className="text-nila-text dark:text-nila-elevated text-sm font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}
