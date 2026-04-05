import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSession } from "@workspace/auth/better-auth/auth-client";
import SidebarUser from "./SidebarUser"
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import Support from "../support/Support";
import { useTRPC } from "../../lib/trpc";
import { useQuery } from "@tanstack/react-query";
import TemplateAppSidebar from "./TemplateAppSidebar";


export default function DashboardRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const trpc = useTRPC() as any;
    const { data: landingInfo } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    const { data: session, isPending, isRefetching } = useSession();
    const justLoggedIn = !!(location.state as any)?.justLoggedIn;

    React.useEffect(() => {
        if (!isPending && !isRefetching && !session && !justLoggedIn) {
            navigate('/sign-in');
        }
    }, [session, isPending, isRefetching, navigate, justLoggedIn]);

    if (isPending) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>
    }

    if (!session) {
        return null;
    }

    return (
        <SidebarProvider>
            <TemplateAppSidebar
                navbarConfig={landingInfo ? { title: (landingInfo as any).navbarSection.title, logo: (landingInfo as any).navbarSection.logo, darkLogo: (landingInfo as any).navbarSection.darkLogo } : null}
                pathname={location.pathname}
                onNavigate={(route) => navigate(route)}
                isAdmin={session?.user?.role === "admin"}
                slotUser={<SidebarUser />}
            />
            <div className="flex flex-col flex-1 max-h-screen">
                <div className="flex items-center gap-4 py-2 px-4">
                    <SidebarTrigger />
                    <div className="font-semibold tracking-tight">Dashboard</div>
                </div>
                <Separator />
                <main className="flex-1 overflow-auto p-6" />
            </div>
            <Support />
        </SidebarProvider>
    )
}
