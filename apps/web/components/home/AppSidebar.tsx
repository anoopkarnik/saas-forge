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
import { Database, FileText, HomeIcon, Settings, Timer, Users } from "lucide-react";
import { ScrollText } from "lucide-react";
import { Gauge } from "lucide-react";
import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import SidebarUser, { SidebarUserProvider } from "@/blocks/home/SidebarUser";
import WorkspaceSlot from "@/components/organizations/WorkspaceSlot";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const { data: landingInfo } = useQuery(trpc.landing.getLandingInfo.queryOptions());
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const t = useTranslations("nav");
  const tBilling = useTranslations("billing");
  const tJobs = useTranslations("jobs");
  const tAudit = useTranslations("audit_log");
  const tFlags = useTranslations("feature_flags");

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
              role="button"
              href="/"
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
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="pt-3">
          <WorkspaceSlot />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {t("application")}
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("home")}
                className={cn(
                  "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                  pathname === "/" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                )}
                onClick={() => router.push("/")}
              >
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-5 w-5 text-emerald-500" />
                  <div className="text-xs">{t("home")}</div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={tBilling("nav.usage")}
                className={cn(
                  "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                  pathname === "/usage" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                )}
                onClick={() => router.push("/usage")}
              >
                <div className="flex items-center gap-3">
                  <Gauge className="h-5 w-5 text-cyan-500" />
                  <div className="text-xs">{tBilling("nav.usage")}</div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("admin")}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t("manageUsers")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/users" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/users")}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div className="text-xs">{t("userManagement")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t("cms")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/cms" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/cms")}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-red-500" />
                    <div className="text-xs">{t("cms")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t("documentation")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/doc" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/doc")}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-amber-500" />
                    <div className="text-xs">{t("documentation")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={tJobs("nav.title")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/jobs" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/jobs")}
                >
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-sky-500" />
                    <div className="text-xs">{tJobs("nav.title")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={tAudit("nav.title")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/audit" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/audit")}
                >
                  <div className="flex items-center gap-3">
                    <ScrollText className="h-5 w-5 text-teal-500" />
                    <div className="text-xs">{tAudit("nav.title")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={tFlags("nav.title")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/flags" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/flags")}
                >
                  <div className="flex items-center gap-3">
                    <Flag className="h-5 w-5 text-orange-500" />
                    <div className="text-xs">{tFlags("nav.title")}</div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t("settings")}
                  className={cn(
                    "h-10 cursor-pointer transition-all duration-200 ease-in-out hover:pl-3",
                    pathname === "/admin/settings" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                  )}
                  onClick={() => router.push("/admin/settings")}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-slate-500" />
                    <div className="text-xs">{t("settings")}</div>
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
    </SidebarUserProvider>
  );
}

export default AppSidebar;
