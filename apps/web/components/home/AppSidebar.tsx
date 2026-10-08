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
import { Bot, Users, Database, FileText, Search, Network, Boxes, Timer, Settings, ScrollText, Gauge, Flag } from "lucide-react";
import { MdSaveAs } from "react-icons/md";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import SidebarUser, { SidebarUserProvider } from "@/blocks/home/SidebarUser";
import WorkspaceSlot from "@/components/organizations/WorkspaceSlot";

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const trpc = useTRPC();
    const { data: landingInfo, isLoading } = useQuery(trpc.landing.getLandingInfo.queryOptions());
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin";

    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

    return (
        <SidebarUserProvider>
        <Sidebar>
            <SidebarHeader className="p-4 pb-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link
                            href="/"
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
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="pt-3">
                    <WorkspaceSlot />
                </div>
            </SidebarHeader>
            <SidebarContent className="p-3">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Application</SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Scaffolds"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                >
                                <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-violet-500" />
                                    <div className="text-sm">{"Scaffolds"}</div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Projects"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/projects" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                >
                                <Link href="/projects" aria-current={pathname === "/projects" ? "page" : undefined} className="flex items-center gap-3">
                                    <Boxes className="w-5 h-5 text-amber-500" />
                                    <div className="text-sm">{"Projects"}</div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Credits usage"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/usage" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                >
                                <Link href="/usage" aria-current={pathname === "/usage" ? "page" : undefined} className="flex items-center gap-3">
                                    <Gauge className="w-5 h-5 text-cyan-500" />
                                    <div className="text-sm">{"Credits usage"}</div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {/* <SidebarMenuItem>
                            <SidebarMenuButton tooltip={"AI Chat"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/ai" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={() => router.push("/ai")}>
                                <div className="flex items-center gap-3">
                                    <Bot className="w-5 h-5 text-emerald-500" />
                                    <div className="text-sm">AI Chat</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem> */}
                    </SidebarMenu>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Admin</SidebarGroupLabel>
                        <SidebarMenu className="gap-1">
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Manage Users"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/users" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/users")}>
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        <div className="text-sm">User Management</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"CMS"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/cms" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/cms")}>
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-red-500" />
                                        <div className="text-sm">CMS</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Documentation"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/doc" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/doc")}>
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-amber-500" />
                                        <div className="text-sm">Documentation</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"SEO Reports"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/seo" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/seo")}>
                                    <div className="flex items-center gap-3">
                                        <Search className="w-5 h-5 text-emerald-500" />
                                        <div className="text-sm">SEO Reports</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"AI Management"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/ai" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/ai")}>
                                    <div className="flex items-center gap-3">
                                        <Bot className="w-5 h-5 text-emerald-500" />
                                        <div className="text-sm">AI Management</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"API Management"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/api" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/api")}>
                                    <div className="flex items-center gap-3">
                                        <Network className="w-5 h-5 text-purple-500" />
                                        <div className="text-sm">API Management</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Background jobs"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/jobs" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/jobs")}>
                                    <div className="flex items-center gap-3">
                                        <Timer className="w-5 h-5 text-sky-500" />
                                        <div className="text-sm">Background jobs</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Audit log"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/audit" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/audit")}>
                                    <div className="flex items-center gap-3">
                                        <ScrollText className="w-5 h-5 text-teal-500" />
                                        <div className="text-sm">Audit log</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Feature flags"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/flags" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/flags")}>
                                    <div className="flex items-center gap-3">
                                        <Flag className="w-5 h-5 text-orange-500" />
                                        <div className="text-sm">Feature flags</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip={"Settings"}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out  h-10", pathname === "/admin/settings" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => router.push("/admin/settings")}>
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-5 h-5 text-slate-500" />
                                        <div className="text-sm">Settings</div>
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
        </SidebarUserProvider>
    );
}

export default AppSidebar;
