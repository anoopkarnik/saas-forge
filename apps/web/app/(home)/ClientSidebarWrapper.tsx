"use client";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import React from "react";
import { AppSidebar } from "@workspace/ui/components/sidebar/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import SidebarUser from "@/blocks/home/SidebarUser";
import ProgressWithCredits from "@workspace/ui/components/home/ProgressWithCredits";

export function ClientSidebarWrapper() {
    const router = useRouter();
    const pathname = usePathname();
    const trpc = useTRPC();
    const { data: landingInfo, isLoading } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());

    return (
        <>
            <AppSidebar
                navbarConfig={landingInfo ? { title: landingInfo.navbarSection.title, logo: landingInfo.navbarSection.logo, darkLogo: landingInfo.navbarSection.darkLogo } : null}
                pathname={pathname}
                onNavigateHome={() => router.push("/")}
                slotUser={<SidebarUser />}
                slotProgress={process.env.NEXT_PUBLIC_PAYMENT_GATEWAY !== "none" ? <ProgressWithCredits /> : null}
            />
        </>
    );
}
