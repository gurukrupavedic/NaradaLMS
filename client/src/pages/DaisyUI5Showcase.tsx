/**
 * Legacy DaisyUI Showcase - Redirect Notice
 * This experiment has been consolidated into the main design system.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { Link } from "wouter";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Badge
} from "@/components/design-system";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function DaisyUI5Showcase() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-orange-100 text-orange-800">CONSOLIDATED</Badge>
            </div>
            <CardTitle>Legacy Theme Experiments</CardTitle>
            <CardDescription>
              This experiment has been consolidated into our production-ready design system.
              All theme work is now part of the main component library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              The design exploration from this experiment contributed to our final colorful design system
              with 15 components and 12 vibrant color variants.
            </p>
            <div className="flex gap-3">
              <Link href="/experiments">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Experiments
                </Button>
              </Link>
              <Link href="/experiments/design-system">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Final Design System
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}