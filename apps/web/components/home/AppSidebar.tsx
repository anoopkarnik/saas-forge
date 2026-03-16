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
import { useTheme } from "next-themes";
import { cn } from "@workspace/ui/lib/utils";
import { HomeIcon, Users, Shield, Settings, Database } from "lucide-react";
import { MdSaveAs } from "react-icons/md";
import { usePathname, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import SidebarUser from "@/blocks/home/SidebarUser";

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const trpc = useTRPC();
    const { data: landingInfo, isLoading } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin";

    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

    return (
        <Sidebar>
            <SidebarHeader className="p-4 pb-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <a
                            role="button"
                            onClick={() => router.push("/")}
                            className="flex items-center gap-3 font-cyberdyne px-2 cursor-pointer"
                        >
                            <img
                                src={isDark ? landingInfo?.navbarSection.darkLogo : landingInfo?.navbarSection.logo}
                                alt={landingInfo?.navbarSection.title}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain"
                            />
                            <div className="hidden lg:flex flex-col items-start text-lg tracking-tight font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {landingInfo?.navbarSection.title}
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
                            <SidebarMenuButton asChild tooltip={"Download SaaS Boilerplate"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/")}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-violet-500" />
                                    <div className="text-xs">{"Download SaaS Boilerplate"}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Download Portfolio Boilerplate"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/portfolio" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/")}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-orange-500" />
                                    <div className="text-xs">{"Download Portfolio Boilerplate (Coming Soon)"}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Download SaaS Company Landing Page"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/saas-company-landing-page" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/")}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-green-500" />
                                    <div className="text-xs">{"Download SaaS Company Landing Page (Coming Soon)"}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Download Hiking Company Landing Page"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/hiking-company-landing-page" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/")}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-blue-500" />
                                    <div className="text-xs">{"Download Hiking Company Landing Page (Coming Soon)"}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Admin</SidebarGroupLabel>
                        <SidebarMenu className="gap-1">
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Manage Users"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/admin/users" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/users")}>
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        <div className="text-xs">User Management</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"CMS"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/admin/cms" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/cms")}>
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-red-500" />
                                        <div className="text-xs">CMS</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border/40 bg-sidebar-footer/5">
                <div className="space-y-4">
                    <SidebarUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSidebar;
