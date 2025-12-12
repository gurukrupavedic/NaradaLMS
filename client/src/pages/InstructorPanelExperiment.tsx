import { InstructorPanel } from "@/components/InstructorPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function InstructorPanelExperiment() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/experiments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Experiments
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Experiment 3: Instructor Panel</h1>
              <p className="text-sm text-gray-600">Student progress tracking and management</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <InstructorPanel />
      </div>
    </div>
  );
}
