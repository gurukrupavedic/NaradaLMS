'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useLocation } from 'wouter';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  isContextual?: boolean; // Sub-item that only appears when relevant (e.g., Batch Details)
  items?: {
    title: string;
    url: string;
    isContextual?: boolean;
  }[];
}

export function NavMain({
  label,
  items,
}: {
  label: string;
  items: NavMainItem[];
}) {
  const [location] = useLocation();

  const isItemActive = (item: NavMainItem) => {
    // Exact match
    if (location === item.url) return true;
    
    // For items with sub-items, check if we're on a descendant route
    if (item.items && item.items.length > 0 && location.startsWith(item.url + '/')) {
      return true;
    }
    
    // Check if any sub-items match exactly
    if (item.items?.some(subItem => location === subItem.url)) return true;
    
    return false;
  };

  const shouldShowChevron = (item: NavMainItem) => {
    // Only show chevron if item has sub-items AND we're on a descendant page
    if (!item.items || item.items.length === 0) return false;
    
    // For contextual sub-items, only show chevron when we're actually on a descendant route
    const hasContextualItems = item.items.some(sub => sub.isContextual);
    if (hasContextualItems) {
      return isItemActive(item) && location !== item.url;
    }
    
    // For static sub-items, always show chevron
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
          
          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {showChevron && (
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </a>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && item.items.length > 0 && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={location === subItem.url}>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
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
