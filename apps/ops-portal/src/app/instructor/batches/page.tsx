import InstructorBatchList from "@/components/instructor/instructor-batch-list";

export default function InstructorBatchesPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6">My Batches</h1>
            <InstructorBatchList />
        </div>
    );
}
