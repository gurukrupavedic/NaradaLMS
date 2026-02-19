import OpsLayout from "@/components/layout/OpsLayout";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    return <OpsLayout useActualRoles showContextualNav>{children}</OpsLayout>;
}
