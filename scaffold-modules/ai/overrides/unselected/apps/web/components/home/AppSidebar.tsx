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
import { Database, FileText, HomeIcon, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import SidebarUser from "@/blocks/home/SidebarUser";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const { data: landingInfo } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
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
              className="flex cursor-pointer items-center gap-3 px-2 font-cyberdyne"
            >
              <img
                src={isDark ? landingInfo?.navbarSection.darkLogo : landingInfo?.navbarSection.logo}
                alt={landingInfo?.navbarSection.title}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <div className="hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-lg font-bold tracking-tight text-transparent lg:flex lg:flex-col lg:items-start">
                {landingInfo?.navbarSection.title}
              </div>
            </a>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Application
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Home"
                className={cn(
                  "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                  pathname === "/" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                )}
                onClick={() => router.push("/")}
              >
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-5 w-5 text-emerald-500" />
                  <div className="text-xs">Home</div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Admin
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Manage Users"
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/users" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/users")}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div className="text-xs">User Management</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="CMS"
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/cms" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/cms")}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-red-500" />
                    <div className="text-xs">CMS</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Documentation"
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/doc" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/doc")}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-amber-500" />
                    <div className="text-xs">Documentation</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 bg-sidebar-footer/5 p-4">
        <div className="space-y-4">
          <SidebarUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
