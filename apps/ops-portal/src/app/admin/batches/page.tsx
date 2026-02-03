import BatchList from "@/components/admin/batch-list";

export default function BatchesPage() {
    return (
        <div className="flex flex-col gap-4 p-8">
            <h1 className="text-3xl font-bold tracking-tight">Batch Management</h1>
            <p className="text-muted-foreground">Manage batches and instructor assignments.</p>

            <BatchList />
        </div>
    );
}
