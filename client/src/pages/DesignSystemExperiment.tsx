/**
 * Design System Experiment - Vedic LMS
 * 
 * Complete showcase of production-ready 15-component design system.
 * This is the consolidated, final version of all design system work.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DesignSystemShowcase } from "@/components/design-system/DesignSystemShowcase";

export function DesignSystemExperiment() {
  return (
    <div className="min-h-screen bg-white">
      {/* Experiment Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/experiments">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Experiments
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Experiment 1: Design System
                </h1>
                <p className="text-sm text-gray-600">
                  Production-ready component library - Final consolidated version
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">PRODUCTION READY</div>
              <div className="text-xs text-gray-500">15 Components • 12 Colors • Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Design System Showcase */}
      <DesignSystemShowcase />
    </div>
  );
}