'use client';

import Link from 'next/link';
import Image, { type ImageProps } from 'next/image';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '../sidebar';

// Import assets directly
import wordmark from '../../assets/shared-branding/wordmark-dark.svg';
import symbol from '../../assets/shared-branding/symbol-dark.svg';

export interface BrandHeaderBranding {
    name: string;
    iconSrc?: ImageProps["src"];
    logoSrc?: ImageProps["src"];
    iconAlt?: string;
    logoAlt?: string;
}

export function BrandHeader({
    homeHref = "/app",
    branding,
}: {
    homeHref?: string;
    branding?: BrandHeaderBranding;
}) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const resolvedBranding = {
        name: branding?.name ?? "Narada LMS",
        iconSrc: branding?.iconSrc ?? symbol,
        logoSrc: branding?.logoSrc ?? wordmark,
        iconAlt: branding?.iconAlt ?? "Narada Symbol",
        logoAlt: branding?.logoAlt ?? (branding?.name ?? "Narada LMS"),
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="group-data-[collapsible=icon]:!p-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!size-10">
                    <Link href={homeHref} className="flex items-center gap-3 transition-colors duration-300 py-0">
                        <div className={`flex shrink-0 items-center justify-center transition-transform duration-300 ${isCollapsed ? 'size-9' : 'size-8'}`}>
                            <Image
                                src={resolvedBranding.iconSrc}
                                alt={resolvedBranding.iconAlt}
                                width={36}
                                height={36}
                                className={`object-contain transition-transform duration-300 ${isCollapsed ? 'h-full w-full' : 'h-full w-full p-0.5'}`}
                            />
                        </div>

                        {/* Wordmark (Reveal Animation) */}
                        <div className={`flex flex-col justify-center transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-90' : 'w-auto opacity-100 scale-100'}`}>
                            <Image
                                src={resolvedBranding.logoSrc}
                                alt={resolvedBranding.logoAlt}
                                width={160}
                                height={24}
                                className="h-4 object-contain object-left"
                            />
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
