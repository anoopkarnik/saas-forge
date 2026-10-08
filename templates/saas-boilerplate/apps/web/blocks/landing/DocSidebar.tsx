"use client"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@workspace/ui/components/shadcn/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Separator } from '@workspace/ui/components/shadcn/separator';
import { useTheme } from 'next-themes';
import { ReactElement } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'

const DocSidebar = (): ReactElement => {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    const { theme } = useTheme();
    const trpc = useTRPC();
    const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfo.queryOptions())

    const docCategories = Array.from(new Set(documentation.docs.map(doc => doc.Type)));

    return (
        <Sidebar>
            <SidebarHeader className='p-4 border-b border-border/50'>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                            rel="noreferrer noopener"
                            href="/"
                            className="flex items-center gap-3 font-cyberdyne px-2 py-2 hover:bg-sidebar-accent rounded-lg transition-colors group"
                        >
                            <div className="relative w-8 h-8 flex-shrink-0 transition-transform group-hover:scale-110 duration-300">
                                {theme === "dark" ?
                                    <Image src={documentation?.darkLogo} alt={documentation?.title} fill className="object-contain" /> :
                                    <Image src={documentation?.logo} alt={documentation?.title} fill className="object-contain" />}
                            </div>
                            <div className="flex flex-col items-start leading-none gap-0.5">
                                <span className="font-bold text-foreground text-sm tracking-wide">{documentation?.title}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-sans">Documentation</span>
                            </div>
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <Separator />
            <SidebarContent className='px-2 scrollbar scrollbar-track-secondary scrollbar-thumb-sidebar '>
                {docCategories
                    .map((category) => {
                        // Filter docs belonging to this category
                        const categoryDocs = documentation.docs.filter(doc => doc.Type === category);
                        return categoryDocs.length > 0 ? (
                            <SidebarGroup key={category}>
                                <SidebarGroupLabel>{category}</SidebarGroupLabel>
                                <SidebarMenu>

                                    {categoryDocs.map((doc) => (
                                        <SidebarMenuButton asChild tooltip={doc.Name} key={doc.id}
                                            className={cn("cursor-pointer text-sm", pathname === "/landing/doc/" + doc.slug && "bg-sidebar-accent")}>

                                            <Link href={"/landing/doc/" + doc.slug} aria-current={pathname === "/landing/doc/" + doc.slug ? "page" : undefined} onClick={() => setOpenMobile(false)}>{doc.Name}</Link>

                                        </SidebarMenuButton>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        ) : null; // Don't render category if it has no docs
                    })
                }
            </SidebarContent>
        </Sidebar>
    );
};

export default DocSidebar;
