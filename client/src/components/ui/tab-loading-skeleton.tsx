import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TabLoadingSkeletonProps {
  type?: "content" | "audio" | "segmentation";
}

export function TabLoadingSkeleton({ type = "content" }: TabLoadingSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === "content" && (
            <>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </>
          )}
          {type === "audio" && (
            <>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </>
          )}
          {type === "segmentation" && (
            <>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
