'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import logoHorizontal from '@/assets/branding/logo-horizontal-dark.svg';
import symbol from '@/assets/branding/symbol-dark.svg';

export function BrandHeader() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:!p-0">
          <a href="/app" className="flex items-center gap-2 overflow-hidden transition-all duration-300">
            {/* Symbol (Always visible, but transitions position) */}
            <div className={`flex aspect-square size-8 items-center justify-center rounded-lg transition-transform duration-300 ${isCollapsed ? 'scale-110' : ''}`}>
              <img src={symbol} alt="Narada Symbol" className="size-6 object-contain" />
            </div>

            {/* Wordmark (Hidden when collapsed) */}
            <div className={`grid flex-1 text-left leading-tight transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <img src={logoHorizontal} alt="Narada LMS" className="h-8 object-contain object-left" />
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
