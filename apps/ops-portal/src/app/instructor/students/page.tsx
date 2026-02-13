import InstructorStudentList from "@/components/instructor/instructor-student-list";

export default function InstructorStudentsPage() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6">My Students</h1>
            <InstructorStudentList />
        </div>
    );
}
