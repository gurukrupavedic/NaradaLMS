'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@narada/ui";
import { Button } from "@narada/ui";
import { Users, FileText, Settings, BookOpen } from "lucide-react";
import Link from 'next/link';

export default function AdminDashboard() {
    const adminLinks = [
        {
            title: "User Management",
            icon: Users,
            href: "/admin/users",
            description: "Manage students, instructors, and admins."
        },
        {
            title: "Batch Management",
            icon: BookOpen,
            href: "/admin/batches",
            description: "Create and manage learning batches."
        },
        {
            title: "Audit Logs",
            icon: FileText,
            href: "/admin/logs",
            description: "View system activity and security logs."
        },
        {
            title: "System Settings",
            icon: Settings,
            href: "/admin/settings",
            description: "Configure global platform settings."
        },
    ];

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {adminLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {link.title}
                                </CardTitle>
                                <link.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    {link.description}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Admin stats will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
