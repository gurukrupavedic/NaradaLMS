'use client';

import {
    BadgeCheck,
    ChevronsUpDown,
    LogOut,
    Settings,
} from 'lucide-react';
import Link from 'next/link';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '../avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '../sidebar';
import { cn } from '../../lib/utils';

export function NavUser({
    user,
    onLogout,
    profileHref = "/app/profile",
    settingsHref = "/app/settings",
}: {
    user: {
        name: string;
        email: string;
        avatar?: string;
    };
    onLogout?: () => void;
    profileHref?: string;
    settingsHref?: string;
}) {
    const { isMobile } = useSidebar();



    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.avatar || ''} alt={user.name || "User"} />
                                <AvatarFallback className="rounded-lg">
                                    {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name || "User"}</span>
                                <span className="truncate text-xs">{user.email || ""}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'top'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user.avatar || ''} alt={user.name} />
                                    <AvatarFallback className="rounded-lg">
                                        {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href={profileHref}>
                                    <BadgeCheck className="h-4 w-4" />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={settingsHref}>
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={onLogout}
                                className={cn(
                                    'cursor-pointer gap-2 text-destructive',
                                    'focus-visible:bg-destructive/10 focus-visible:text-destructive',
                                    'data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
                                )}
                            >
                                <LogOut className="h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
