import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSession } from "@workspace/auth/better-auth/auth-client";
import AppSidebar from "@workspace/ui/components/sidebar/AppSidebar"
import SidebarUser from "./SidebarUser"
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import Support from "../support/Support";
import { useTRPC } from "../../lib/trpc";
import { useQuery } from "@tanstack/react-query";


export default function DashboardRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const trpc = useTRPC() as any;
    const { data: landingInfo } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    // Do NOT pass fetchOptions here — that creates a separate atom/cache entry
    // from the one updated by authClient.signIn.email, causing an immediate false redirect.
    // The authClient is already configured with baseURL + credentials globally.
    const { data: session, isPending, isRefetching } = useSession();
    // Suppress the redirect for one render cycle when navigating from sign-in,
    // giving the session atom time to propagate before we decide to redirect.
    const justLoggedIn = !!(location.state as any)?.justLoggedIn;

    React.useEffect(() => {
        // Guard on isRefetching too: prevents a redirect firing mid-background-refetch.
        // Guard on justLoggedIn: prevents a redirect when navigating from the sign-in page
        // before the session atom has propagated.
        if (!isPending && !isRefetching && !session && !justLoggedIn) {
            navigate('/sign-in');
        }
    }, [session, isPending, isRefetching, navigate, justLoggedIn]);


    if (isPending) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>
    }

    if (!session) {
        return null; // will redirect in useEffect
    }

    return (
        <SidebarProvider>
            <AppSidebar
                navbarConfig={landingInfo ? { title: (landingInfo as any).navbarSection.title, logo: (landingInfo as any).navbarSection.logo, darkLogo: (landingInfo as any).navbarSection.darkLogo } : null}
                pathname={location.pathname}
                onNavigateHome={() => navigate('/')}
                onNavigate={(path) => navigate(path)}
                isAdmin={session?.user?.role === "admin"}
                slotUser={<SidebarUser />}
                slotProgress={null}
            />
            <div className="flex flex-col flex-1 max-h-screen">
            </div>
            <Support />
        </SidebarProvider>
    )
}