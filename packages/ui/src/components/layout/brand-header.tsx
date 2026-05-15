'use client';

import Link from 'next/link';
import Image, { type ImageProps } from 'next/image';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '../sidebar';
import { cn } from '../../lib/utils';

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

function normalizeImageSrc(src: ImageProps['src']): string | null {
    if (typeof src === 'string') {
        return src;
    }
    if (src && typeof src === 'object' && 'src' in src) {
        return (src as { src: string }).src;
    }
    return null;
}

function isSameImageSrc(a: ImageProps['src'], b: ImageProps['src']): boolean {
    const sa = normalizeImageSrc(a);
    const sb = normalizeImageSrc(b);
    if (sa && sb) {
        return sa === sb;
    }
    return Object.is(a, b);
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
    const useSingleLogo = isSameImageSrc(
        resolvedBranding.iconSrc,
        resolvedBranding.logoSrc
    );

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    className={cn(
                        'group-data-[collapsible=icon]:!p-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!size-10',
                        useSingleLogo &&
                            !isCollapsed &&
                            '!h-auto min-h-44 !overflow-visible !items-center !px-2 !py-4'
                    )}
                >
                    <Link
                        href={homeHref}
                        className={cn(
                            'flex items-center transition-colors duration-300 py-0',
                            useSingleLogo ? 'w-full justify-center gap-0' : 'gap-3'
                        )}
                    >
                        {useSingleLogo ? (
                            isCollapsed ? (
                                <div className="flex size-9 shrink-0 items-center justify-center transition-transform duration-300">
                                    <Image
                                        src={resolvedBranding.iconSrc}
                                        alt={resolvedBranding.logoAlt}
                                        width={36}
                                        height={36}
                                        className="h-full w-full object-contain p-0.5"
                                    />
                                </div>
                            ) : (
                                <div className="flex w-full items-center justify-center px-2">
                                    <Image
                                        src={resolvedBranding.logoSrc}
                                        alt={resolvedBranding.logoAlt}
                                        width={520}
                                        height={208}
                                        className="h-32 w-auto max-w-[min(300px,calc(var(--sidebar-width)-1rem))] object-contain"
                                    />
                                </div>
                            )
                        ) : (
                            <>
                                <div className={`flex shrink-0 items-center justify-center transition-transform duration-300 ${isCollapsed ? 'size-9' : 'size-8'}`}>
                                    <Image
                                        src={resolvedBranding.iconSrc}
                                        alt={resolvedBranding.iconAlt}
                                        width={36}
                                        height={36}
                                        className={`object-contain transition-transform duration-300 ${isCollapsed ? 'h-full w-full' : 'h-full w-full p-0.5'}`}
                                    />
                                </div>

                                <div className={`flex flex-col justify-center transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-90' : 'w-auto opacity-100 scale-100'}`}>
                                    <Image
                                        src={resolvedBranding.logoSrc}
                                        alt={resolvedBranding.logoAlt}
                                        width={160}
                                        height={24}
                                        className="h-4 object-contain object-left"
                                    />
                                </div>
                            </>
                        )}
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
