import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@workspace/ui/components/shadcn/sidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { Separator } from '@workspace/ui/components/shadcn/separator';
import { useTheme } from 'next-themes';
import { ReactElement, useEffect, useState } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '../../lib/trpc'

const DocSidebar = (): ReactElement => {
    const navigate = useNavigate();
    const { slug } = useParams();
    const { theme } = useTheme();
    const trpc = useTRPC() as any;
    const [docCategories, setDocCategories] = useState<string[]>([]);
    const { data: documentation } = useSuspenseQuery(trpc.documentation.getDocumentationInfoFromNotion.queryOptions())

    useEffect(() => {
        const categories = Array.from(new Set((documentation as any).docs.map((doc: any) => doc.Type)));
        setDocCategories(categories as string[]);
    }, [documentation])

    return (
        <Sidebar>
            <SidebarHeader className='p-4 border-b border-border/50'>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div
                            onClick={() => navigate('/')}
                            className="flex items-center gap-3 font-cyberdyne px-2 py-2 hover:bg-sidebar-accent rounded-lg transition-colors group cursor-pointer"
                        >
                            <div className="relative w-8 h-8 flex-shrink-0 transition-transform group-hover:scale-110 duration-300">
                                {theme === "dark" ?
                                    <img src={(documentation as any)?.darkLogo} alt={(documentation as any)?.title} className="object-contain w-full h-full" /> :
                                    <img src={(documentation as any)?.logo} alt={(documentation as any)?.title} className="object-contain w-full h-full" />}
                            </div>
                            <div className="hidden lg:flex flex-col items-start leading-none gap-0.5">
                                <span className="font-bold text-foreground text-sm tracking-wide">{(documentation as any)?.title}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-sans">Documentation</span>
                            </div>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <Separator />
            <SidebarContent className='px-2 scrollbar scrollbar-track-secondary scrollbar-thumb-sidebar '>
                {docCategories
                    .map((category) => {
                        const categoryDocs = (documentation as any).docs.filter((doc: any) => doc.Type === category);
                        return categoryDocs.length > 0 ? (
                            <SidebarGroup key={category}>
                                <SidebarGroupLabel>{category}</SidebarGroupLabel>
                                <SidebarMenu>
                                    {categoryDocs.map((doc: any) => (
                                        <SidebarMenuButton asChild tooltip={doc.Name} key={doc.id}
                                            className={cn("cursor-pointer text-xs", slug === doc.slug && "bg-sidebar-accent")}
                                            onClick={() => navigate("/doc/" + doc.slug)}>
                                            <span>{doc.Name}</span>
                                        </SidebarMenuButton>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        ) : null;
                    })
                }
            </SidebarContent>
        </Sidebar>
    );
};

export default DocSidebar;
