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
import { HomeIcon } from "lucide-react";

export interface AppSidebarProps {
    navbarConfig: {
        title: string;
        logo: string;
        darkLogo: string;
    } | null;
    pathname: string;
    onNavigateHome: () => void;
    slotUser?: React.ReactNode;
    slotProgress?: React.ReactNode;
}

export function AppSidebar({ navbarConfig, pathname, onNavigateHome, slotUser, slotProgress }: AppSidebarProps) {
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
            </SidebarHeader>
            <SidebarContent className="p-3">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Application</SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={"Home"}
                                className={cn("cursor-pointer transition-all duration-200 ease-in-out hover:pl-3 h-10", pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm")}
                                onClick={onNavigateHome}>
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
                    {slotProgress}
                    {slotUser}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSidebar;
