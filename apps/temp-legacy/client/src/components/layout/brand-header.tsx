'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import wordmark from '@/assets/branding/wordmark-dark.svg';
import symbol from '@/assets/branding/symbol-dark.svg';

export function BrandHeader() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:!p-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!size-12">
          <a href="/app" className="flex items-center gap-3 transition-all duration-300 py-1">
            <div className={`flex shrink-0 items-center justify-center transition-all duration-300 ${isCollapsed ? 'size-10' : 'size-9'}`}>
              <img
                src={symbol}
                alt="Narada Symbol"
                className={`object-contain transition-all duration-300 ${isCollapsed ? 'h-full w-full' : 'h-full w-full p-0.5'}`}
              />
            </div>

            {/* Wordmark (Reveal Animation) */}
            <div className={`flex flex-col justify-center transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-90' : 'w-auto opacity-100 scale-100'}`}>
              <img src={wordmark} alt="Narada LMS" className="h-5 object-contain object-left" />
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
