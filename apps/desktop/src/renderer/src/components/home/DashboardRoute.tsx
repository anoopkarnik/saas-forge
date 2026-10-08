import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSession } from "@workspace/auth/better-auth/auth-client";
import AppSidebar from "@workspace/ui/components/sidebar/AppSidebar"
import SidebarUser from "./SidebarUser"
import WorkspaceSlot from "../organizations/WorkspaceSlot"
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
// scaffold:begin notifications
import NotificationsBell from "../notifications/NotificationsBell";
// scaffold:end notifications
import DashboardPage from "@workspace/ui/blocks/dashboard/DashboardPage";
import Support from "../support/Support";
import { useTRPC } from "../../lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { secretEnvFiles, splitSecretEnv } from "@workspace/ui/lib/scaffold-secrets";
import { appendFilesToZip } from "@workspace/ui/lib/zip-append";


export default function DashboardRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const trpc = useTRPC() as any;
    const { data: landingInfo } = useQuery(trpc.landing.getLandingInfo.queryOptions());
    const catalogQuery = useQuery(trpc.scaffold.catalog.queryOptions());
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

    const handleSubmitConfiguration = async (safeName: string, envVars: Record<string, string>, modules: string[], expectedTotalCredits: number) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            // Secrets stay on this machine: build from public values, then add them to the ZIP here.
            const { publicEnv, secrets } = splitSecretEnv(envVars);
            const response = await fetch(`${apiUrl}/api/scaffold`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: safeName, envVars: publicEnv, modules, expectedTotalCredits }),
            });

            if (response.status === 409) {
                await catalogQuery.refetch();
                throw new Error("Prices changed. Check the new total and download again.");
            }
            if (!response.ok) {
                throw new Error("Failed to download");
            }

            const zip = appendFilesToZip(new Uint8Array(await response.arrayBuffer()), secretEnvFiles(safeName, secrets));
            const saved = await window.api.saveFile(`${safeName}.zip`, zip.buffer);
            if (!saved) {
                throw new Error("Download cancelled");
            }
        } catch (error) {
            console.error("Download failed:", error);
            throw error;
        }
    };

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
                slotWorkspace={<WorkspaceSlot />}
                slotProgress={null}
            />
            <div className="flex flex-col flex-1 max-h-screen">
                <div className="flex items-center gap-4 py-2 px-4">
                    <SidebarTrigger />
                    <div className="font-semibold tracking-tight">Dashboard</div>
                    {/* scaffold:begin notifications */}
                    <div className="ml-auto">
                        <NotificationsBell />
                    </div>
                    {/* scaffold:end notifications */}
                </div>
                <Separator />
                {catalogQuery.data ? (
                    <DashboardPage catalog={catalogQuery.data as any} onSubmitConfiguration={handleSubmitConfiguration} onNavigateDoc={(slug) => navigate(`/doc/${slug}`)} />
                ) : (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        {catalogQuery.isError ? "Could not load scaffold prices." : "Loading..."}
                    </div>
                )}
            </div>
            <Support />
        </SidebarProvider>
    )
}
