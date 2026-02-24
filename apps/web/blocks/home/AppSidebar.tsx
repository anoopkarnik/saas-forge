"use client";
import React, { useEffect, useState } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@workspace/ui/components/shadcn/sidebar";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon } from "lucide-react";
import { CiMoneyBill } from "react-icons/ci";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import ProgressWithCredits from "@/components/home/ProgressWithCredits";
import SidebarUser from "./SidebarUser";


export function AppSidebar() {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    const router = useRouter()
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarHeader className="p-4 pb-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                            rel="noreferrer noopener"
                            href="/"
                            className="flex items-center gap-3 font-cyberdyne px-2"
                        >
                            {mounted && (theme === "dark" || resolvedTheme === "dark") ?
                                <Image src={data.navbarSection?.darkLogo} alt={data.navbarSection?.title} width={32} height={32} className="w-8 h-8" /> :
                                <Image src={data.navbarSection?.logo} alt={data.navbarSection?.title} width={32} height={32} className="w-8 h-8" />}
                            <div className="hidden lg:flex flex-col items-start text-lg tracking-tight font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {data.navbarSection?.title}
                            </div>
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="p-3">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Application</SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Home"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/")}>
                                <div className="flex items-center gap-3">
                                    <HomeIcon className="h-4 w-4" />
                                    <span>{"Home"}</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border/40 bg-sidebar-footer/5">
                <div className="space-y-4">
                    {process.env.NEXT_PUBLIC_PAYMENT_GATEWAY !== "none" && <ProgressWithCredits />}
                    <SidebarUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
