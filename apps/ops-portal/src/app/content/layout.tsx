import { AppShell } from '@narada/ui';

export default function ContentLayout({
    children
}: {
    children: React.ReactNode
}) {
    // Role guard will be in individual pages
    return (
        <AppShell>
            {children}
        </AppShell>
    );
}
