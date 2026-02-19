"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import InstructorStudentList from "@/components/instructor/InstructorStudentList";

export default function InstructorStudentsPage() {
    useRoleGuard(["instructor", "admin"]);
    return <InstructorStudentList />;
}
