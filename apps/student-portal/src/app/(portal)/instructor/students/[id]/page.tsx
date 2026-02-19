"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useStudentDetails } from "@/lib/hooks/useStudentDetails";
import { Button } from "@narada/ui";
import { StudentDetailsCard } from "@narada/ui";
import { Skeleton } from "@narada/ui";

export default function InstructorStudentProgressPage() {
    useRoleGuard(["instructor", "admin"]);
    const params = useParams();
    const studentId = params?.id as string;

    const { data: studentDetails, isLoading, error } = useStudentDetails(studentId);

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Failed to load student progress.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/instructor/students">Back to My Students</Link>
                </Button>
            </div>
        );
    }

    if (isLoading || !studentDetails) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <Button asChild variant="ghost" className="mb-2">
                <Link href="/instructor/students">Back to My Students</Link>
            </Button>
            <StudentDetailsCard student={studentDetails} />
        </div>
    );
}
