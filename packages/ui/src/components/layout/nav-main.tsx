'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '../collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '../sidebar';

export interface NavMainItem {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    isContextual?: boolean;
    items?: {
        title: string;
        url: string;
        isContextual?: boolean;
    }[];
}

export function NavMain({
    label,
    items,
    currentPath = '',
}: {
    label: string;
    items: NavMainItem[];
    currentPath?: string;
}) {

    const isItemActive = (item: NavMainItem) => {
        if (currentPath === item.url) return true;
        if (item.items && item.items.length > 0 && currentPath.startsWith(item.url + '/')) {
            return true;
        }
        if (item.items?.some(subItem => currentPath === subItem.url)) return true;
        return false;
    };

    const shouldShowChevron = (item: NavMainItem) => {
        if (!item.items || item.items.length === 0) return false;
        const hasContextualItems = item.items.some(sub => sub.isContextual);
        if (hasContextualItems) {
            return isItemActive(item) && currentPath !== item.url;
        }
        return true;
    };

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = isItemActive(item);
                    const showChevron = shouldShowChevron(item);
                    const isOpen = isActive && item.items && item.items.length > 0;

                    // Note: using key=title is risky if duplicate titles exist, but matches legacy
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={isOpen} // Controlled by URL state essentially
                            defaultOpen={isOpen}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                                        <Link href={item.url}>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                            {showChevron && (
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                {item.items && item.items.length > 0 && (
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items.map((subItem) => (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton asChild isActive={currentPath === subItem.url}>
                                                        <Link href={subItem.url}>
                                                            <span>{subItem.title}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                )}
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
