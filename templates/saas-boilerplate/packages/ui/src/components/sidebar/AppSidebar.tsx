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
import { HomeIcon, Users, Database } from "lucide-react";
import { MdSaveAs } from "react-icons/md";
import { useTranslations } from "use-intl";

export interface AppSidebarProps {
    navbarConfig: {
        title: string;
        logo: string;
        darkLogo: string;
    } | null;
    pathname: string;
    onNavigateHome: () => void;
    onNavigate?: (path: string) => void;
    slotUser?: React.ReactNode;
    slotProgress?: React.ReactNode;
    slotWorkspace?: React.ReactNode;
    isAdmin?: boolean;
}

export function AppSidebar({ navbarConfig, pathname, onNavigateHome, onNavigate, slotUser, slotProgress, slotWorkspace, isAdmin }: AppSidebarProps) {
    const { theme, resolvedTheme } = useTheme();
    const t = useTranslations("nav");
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
                            onClick={onNavigateHome}
                            className="flex items-center gap-3 font-cyberdyne px-2 cursor-pointer"
                        >
                            <img
                                src={isDark ? navbarConfig?.darkLogo : navbarConfig?.logo}
                                alt={navbarConfig?.title}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain"
                            />
                            <div className="hidden lg:flex flex-col items-start text-lg tracking-tight font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {navbarConfig?.title}
                            </div>
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
                {slotWorkspace && <div className="pt-3">{slotWorkspace}</div>}
            </SidebarHeader>
            <SidebarContent className="p-3">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">{t("application")}</SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={t("scaffolds")}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={onNavigateHome}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-violet-500" />
                                    <div className="text-xs">{t("scaffolds")}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={t("portfolio")}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/portfolio" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={onNavigateHome}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-orange-500" />
                                    <div className="text-xs">{t("comingSoon", { label: t("portfolio") })}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={t("saasLanding")}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/saas-company-landing-page" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={onNavigateHome}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-green-500" />
                                    <div className="text-xs">{t("comingSoon", { label: t("saasLanding") })}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={t("hikingLanding")}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/hiking-company-landing-page" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={onNavigateHome}>
                                <div className="flex items-center gap-3">
                                    <MdSaveAs className="w-5 h-5 text-blue-500" />
                                    <div className="text-xs">{t("comingSoon", { label: t("hikingLanding") })}</div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">{t("admin")}</SidebarGroupLabel>
                        <SidebarMenu className="gap-1">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip={t("manageUsers")}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/admin/users" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => onNavigate?.("/admin/users")}
                                >
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        <div className="text-xs">{t("userManagement")}</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip={t("cms")}
                                    className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/admin/cms" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                    onClick={() => onNavigate?.("/admin/cms")}
                                >
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-red-500" />
                                        <div className="text-xs">{t("cms")}</div>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border/40 bg-sidebar-footer/5">
                <div className="space-y-4">
                    {slotProgress}
                    {slotUser}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSidebar;
