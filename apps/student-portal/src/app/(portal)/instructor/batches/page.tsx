"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import InstructorBatchList from "@/components/instructor/InstructorBatchList";

export default function InstructorBatchesPage() {
    useRoleGuard(["instructor", "admin"]);
    return <InstructorBatchList />;
}
