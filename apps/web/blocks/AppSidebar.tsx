"use client";
import {
    Sidebar,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@workspace/ui/components/shadcn/sidebar";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function AppSidebar() {
    const {theme} = useTheme();
    const trpc = useTRPC();
    const { data} = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                        rel="noreferrer noopener"
                        href="/"
                        className="flex items-center gap-2 font-cyberdyne justify-center"
                        >
                            {theme === "dark" ?
                            <Image src={data.navbarSection?.darkLogo} alt={data.navbarSection?.title} width={30} height={30} /> : 
                            <Image src={data.navbarSection?.logo} alt={data.navbarSection?.title} width={30} height={30} />}
                            <div className="hidden lg:flex flex-col items-start text-md leading-none bg-linear-to-r from-white to-white bg-clip-text text-transparent ">
                                {data.navbarSection?.title}
                            </div>
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
           
            <SidebarFooter>
               
            </SidebarFooter>
        </Sidebar>
    );
}
  