'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '../sidebar';

// Import assets directly
import wordmark from '../../assets/shared-branding/wordmark-dark.svg';
import symbol from '../../assets/shared-branding/symbol-dark.svg';

export function BrandHeader({ homeHref = "/app" }: { homeHref?: string }) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="group-data-[collapsible=icon]:!p-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!size-10">
                    <Link href={homeHref} className="flex items-center gap-3 transition-colors duration-300 py-0">
                        <div className={`flex shrink-0 items-center justify-center transition-transform duration-300 ${isCollapsed ? 'size-9' : 'size-8'}`}>
                            <Image
                                src={symbol}
                                alt="Narada Symbol"
                                className={`object-contain transition-transform duration-300 ${isCollapsed ? 'h-full w-full' : 'h-full w-full p-0.5'}`}
                            />
                        </div>

                        {/* Wordmark (Reveal Animation) */}
                        <div className={`flex flex-col justify-center transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-90' : 'w-auto opacity-100 scale-100'}`}>
                            <Image src={wordmark} alt="Narada LMS" className="h-4 object-contain object-left" />
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
