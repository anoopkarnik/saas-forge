"use client"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@workspace/ui/components/shadcn/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Separator } from '@workspace/ui/components/shadcn/separator';
import { DocumentationProps } from '@/lib/ts-types/doc';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'

const DocSidebar = () => {
    const router = useRouter()
    const pathname = usePathname();
    const { theme } = useTheme();
    const trpc = useTRPC();
    const [docCategories, setDocCategories] = useState<string[]>([]);
    const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfoFromNotion.queryOptions())

    useEffect(() => {
        // Extract unique categories from docs  
        const categories = Array.from(new Set(documentation.docs.map(doc => doc.Type)));
        setDocCategories(categories);
    }, [])

    return (
        <Sidebar>
            <SidebarHeader className='p-6'>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                            rel="noreferrer noopener"
                            href="/"
                            className="flex items-center gap-2 font-cyberdyne"
                        >
                            {theme === "dark" ?
                                <Image src={documentation?.darkLogo} alt={documentation?.title} width={30} height={30} /> :
                                <Image src={documentation?.logo} alt={documentation?.title} width={30} height={30} />}
                            <div className="hidden lg:flex flex-col items-start text-md leading-none bg-linear-to-r from-white to-white bg-clip-text text-transparent ">
                                <div>{documentation?.title?.split(' ').slice(0, Math.ceil(documentation?.title?.split(' ').length / 2)).join(" ")}</div>
                                <div>{documentation?.title?.split(' ').slice(Math.ceil(documentation?.title?.split(' ').length / 2)).join(" ")}</div>
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
                                            className={cn("cursor-pointer text-xs", pathname === doc.id && "bg-sidebar-accent")}
                                            onClick={() => router.push("/landing/doc/" + doc.id as string)}>

                                            <span>{doc.Name}</span>

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
