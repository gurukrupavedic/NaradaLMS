import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";

export function ManageBatches() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-600 mt-1">Organize learners into cohorts and manage enrollments.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="indigo">
          <CardHeader>
            <CardTitle>Module Scaffolded</CardTitle>
            <CardDescription>
              The batches management UI is scaffolded. Future updates will add listing, creation, and enrollment flows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" color="indigo" disabled>
                View Batches (coming soon)
              </Button>
              <Button variant="solid" color="indigo" disabled>
                Create Batch (coming soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ManageBatches;
