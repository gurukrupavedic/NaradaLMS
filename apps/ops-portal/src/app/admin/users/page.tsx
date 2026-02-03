import UserList from "@/components/admin/user-list";

export default function UsersPage() {
    return (
        <div className="flex flex-col gap-4 p-8">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage user roles and statuses.</p>

            <UserList />
        </div>
    );
}
